import express from 'express';
import http from 'http';
import path from 'path';
import { WebSocketServer, WebSocket } from 'ws';
import { GoogleGenAI } from '@google/genai';
import dotenv from 'dotenv';
import helmet from 'helmet';
import cors from 'cors';
import rateLimit from 'express-rate-limit';
import { Room, Participant, Message, SocketMessage, SocketEvent, RoomState } from './src/types.js';

dotenv.config();

const app = express();
const server = http.createServer(app);
const PORT = process.env.PORT || 3000;

// Initialize Google Gen AI
const aiApiKey = process.env.GEMINI_API_KEY;
let aiClient: GoogleGenAI | null = null;
if (aiApiKey && aiApiKey !== 'MY_GEMINI_API_KEY') {
  aiClient = new GoogleGenAI({
    apiKey: aiApiKey,
    httpOptions: {
      headers: {
        'User-Agent': 'aistudio-build',
      },
    },
  });
}

// In-memory Database
const rooms: { [id: string]: Room } = {};
const roomMessages: { [roomId: string]: Message[] } = {};
const roomParticipants: { [roomId: string]: { [guestId: string]: Participant } } = {};
const roomBannedUsers: { [roomId: string]: Set<string> } = {};
const activeConnections: { [roomId: string]: { [guestId: string]: WebSocket } } = {};
const typingUsers: { [roomId: string]: { [guestId: string]: { nickname: string; ts: number } } } = {};

// Parse JSON inputs
app.use(express.json());

// Trust proxy for rate limiting behind Render/Heroku load balancers
app.set('trust proxy', 1);

// Security Middlewares
app.use(helmet({ contentSecurityPolicy: false }));
app.use(cors());

// Rate Limiter for API endpoints
const apiLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // limit each IP to 100 requests per windowMs
  message: { error: 'Too many requests from this IP, please try again after 15 minutes.' }
});
app.use('/api/', apiLimiter);

// Specific Rate Limiter for Room Creation (3 per day per user/IP)
const roomCreationLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000, // 24 hours
  max: 3,
  keyGenerator: (req) => req.body.createdBy || req.ip,
  message: { error: 'You have reached the limit of creating 3 rooms per day. Please try again tomorrow.' },
  standardHeaders: true,
  legacyHeaders: false,
});

// Profanity list for basic moderation
const PROFANITY_WORDS = [
  'shit', 'piss', 'fuck', 'bitch', 'cunt', 'asshole', 'bastard', 'dick', 'cock', 'pussy'
];

function filterProfanity(text: string): string {
  let cleaned = text;
  for (const word of PROFANITY_WORDS) {
    const regex = new RegExp(`\\b${word}\\b`, 'gi');
    cleaned = cleaned.replace(regex, '*'.repeat(word.length));
  }
  return cleaned;
}

// Pruning helper for expired rooms
function pruneExpiredRooms() {
  const now = Date.now();
  Object.keys(rooms).forEach((id) => {
    if (rooms[id].expiresAt <= now) {
      // Room has expired
      // Close all connected WS for this room
      if (activeConnections[id]) {
        Object.entries(activeConnections[id]).forEach(([guestId, ws]) => {
          ws.send(JSON.stringify({ type: 'error', message: 'This room has expired and is now closed.' } as SocketEvent));
          ws.close();
        });
      }
      // Delete room resources
      delete rooms[id];
      delete roomMessages[id];
      delete roomParticipants[id];
      delete roomBannedUsers[id];
      delete activeConnections[id];
      delete typingUsers[id];
      console.log(`Pruned expired room: ${id}`);
    }
  });
}

// Prune rooms every 15 seconds
setInterval(pruneExpiredRooms, 15000);

// API Endpoints
// Create Room
app.post('/api/rooms', roomCreationLimiter, (req, res) => {
  const { title, durationMinutes, location, participantLimit, createdBy, description } = req.body;
  
  if (!title || typeof title !== 'string' || title.trim() === '') {
    res.status(400).json({ error: 'Room topic or title is required.' });
    return;
  }

  // Generate unique 6-character uppercase alphanumeric ID
  let roomId = '';
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Avoid easily confused letters like I, O, 0, 1
  do {
    roomId = '';
    for (let i = 0; i < 6; i++) {
      roomId += chars.charAt(Math.floor(Math.random() * chars.length));
    }
  } while (rooms[roomId]);

  const duration = parseInt(durationMinutes, 10) || 180; // default 3 hours
  const createdAt = Date.now();
  const expiresAt = createdAt + duration * 60 * 1000;

  const newRoom: Room = {
    id: roomId,
    title: filterProfanity(title.trim()),
    description: description ? filterProfanity(description.trim()) : undefined,
    createdAt,
    expiresAt,
    location: location ? filterProfanity(location.trim()) : undefined,
    participantLimit: parseInt(participantLimit, 10) || undefined,
    createdBy,
  };

  rooms[roomId] = newRoom;
  roomMessages[roomId] = [];
  roomParticipants[roomId] = {};
  roomBannedUsers[roomId] = new Set();
  activeConnections[roomId] = {};
  typingUsers[roomId] = {};

  // System Welcome Message
  const systemMessage: Message = {
    id: `sys-${Date.now()}`,
    roomId,
    senderId: 'system',
    senderName: 'DropIn',
    text: `Room "${newRoom.title}" created! This room expires in ${duration} minutes. Share the URL to coordinate instantly.`,
    timestamp: createdAt,
    isPinned: false,
    isAction: true,
  };
  roomMessages[roomId].push(systemMessage);

  res.status(201).json(newRoom);
});

// Get Room Information (Pruning is called on read to enforce instant expiration responsiveness)
app.get('/api/rooms/:id', (req, res) => {
  const id = req.params.id.toUpperCase();
  pruneExpiredRooms();

  const room = rooms[id];
  if (!room) {
    res.status(404).json({ error: 'Room not found or has expired.' });
    return;
  }

  res.json({
    id: room.id,
    title: room.title,
    description: room.description,
    createdAt: room.createdAt,
    expiresAt: room.expiresAt,
    location: room.location,
    participantLimit: room.participantLimit,
    createdBy: room.createdBy,
  });
});

// AI Summarization API (Using Gemini)
app.post('/api/rooms/:id/summary', async (req, res) => {
  const id = req.params.id.toUpperCase();
  const room = rooms[id];
  if (!room) {
    res.status(404).json({ error: 'Room not found or has expired.' });
    return;
  }

  const messages = roomMessages[id] || [];
  if (messages.length === 0) {
    res.json({ summary: 'No messages in this room to summarize yet.' });
    return;
  }

  // Format messages context for model
  const messageLogs = messages
    .filter((m) => m.senderId !== 'system')
    .map((m) => `[${new Date(m.timestamp).toLocaleTimeString()}] ${m.senderName}: ${m.text}`)
    .join('\n');

  if (!messageLogs) {
    res.json({ summary: 'Not enough conversation details to generate a summary.' });
    return;
  }

  if (!aiClient) {
    res.json({
      summary: '⚠️ AI Summarization is currently offline (Gemini API Key is not configured in Secrets panel). To enable this feature, configure GEMINI_API_KEY in Settings.',
    });
    return;
  }

  try {
    const prompt = `You are the DropIn AI Summarizer. You are helping co-ordinate temporary activities (e.g., sports, ride-sharing, study-session).
Analyze the conversation logs below for the room: "${room.title}" (Location: ${room.location || 'N/A'}).
Generate a concise, direct, visually outstanding summary containing:
1. **📌 Key Decisions**: Clear finalized plan (e.g. "Meeting at 5:15 PM near Hostel Block A")
2. **👥 Current Count & Standings**: How many people are coming/committed (e.g. "4 players confirmed, need 2 more")
3. **📅 Pending Coordination Details**: Any items still unresolved or questions asked.

Keep the tone professional, objective, and action-oriented. Do NOT use fancy narrative intro or conclusion paragraphs. Ensure the output is very scannable and fits under 125 words.

Conversation Logs:
${messageLogs}`;

    const response = await aiClient.models.generateContent({
      model: 'gemini-3.5-flash',
      contents: prompt,
    });

    res.json({ summary: response.text || 'Failed to parse AI summary.' });
  } catch (error: any) {
    console.error('Error generating AI Summary:', error);
    res.status(500).json({ error: 'Engine failed to yield a summary. Please try again.' });
  }
});

// Route /r/:id directly to index.html in production and dev
app.get('/r/:id', (req, res, next) => {
  const roomId = req.params.id.toUpperCase();
  if (process.env.NODE_ENV === 'production') {
    res.sendFile(path.join(process.cwd(), 'dist', 'index.html'));
  } else {
    next();
  }
});

// Setup WebSocket Server
const wss = new WebSocketServer({ noServer: true });

// Track client rate limit per connection
const clientMessageHistory: Map<WebSocket, number[]> = new Map();

function isRateLimited(ws: WebSocket): boolean {
  const now = Date.now();
  let history = clientMessageHistory.get(ws) || [];
  // Keep only messages from the last 5 seconds
  history = history.filter((timestamp) => now - timestamp < 5000);
  history.push(now);
  clientMessageHistory.set(ws, history);
  return history.length > 5; // limit to 5 messages per 5 seconds
}

wss.on('connection', (ws: WebSocket) => {
  let subscribedRoomId: string | null = null;
  let clientGuestId: string | null = null;

  ws.on('message', (rawData: string) => {
    try {
      const data: SocketMessage = JSON.parse(rawData);

      if (data.type === 'join') {
        const { roomId, guestId, nickname } = data;
        const normRoomId = roomId.toUpperCase();

        pruneExpiredRooms();
        const room = rooms[normRoomId];
        if (!room) {
          ws.send(JSON.stringify({ type: 'error', message: 'Room has expired or does not exist.' } as SocketEvent));
          ws.close();
          return;
        }

        // Check if user is banned
        if (roomBannedUsers[normRoomId]?.has(guestId)) {
          ws.send(JSON.stringify({ type: 'error', message: 'You have been removed and banned from this room.' } as SocketEvent));
          ws.close();
          return;
        }

        // Check participant limit
        const participants = roomParticipants[normRoomId] || {};
        const count = Object.keys(participants).length;
        if (room.participantLimit && count >= room.participantLimit && !participants[guestId]) {
          ws.send(JSON.stringify({ type: 'error', message: `Participant limit (${room.participantLimit}) reached for this room.` } as SocketEvent));
          ws.close();
          return;
        }

        subscribedRoomId = normRoomId;
        clientGuestId = guestId;

        // Save active connection
        if (!activeConnections[normRoomId]) {
          activeConnections[normRoomId] = {};
        }
        activeConnections[normRoomId][guestId] = ws;

        // Log participant
        const isCreator = room.createdBy === guestId;
        const participant: Participant = {
          guestId,
          nickname: filterProfanity(nickname.trim()),
          joinedAt: Date.now(),
          lastActiveAt: Date.now(),
          isCreator,
        };
        participants[guestId] = participant;
        roomParticipants[normRoomId] = participants;

        // Send full initial state to the client
        const state: RoomState = {
          room,
          participants: Object.values(participants),
          messages: roomMessages[normRoomId] || [],
        };
        ws.send(JSON.stringify({ type: 'room_state', state } as SocketEvent));

        // Broadcast join event to everyone else
        broadcast(normRoomId, { type: 'user_joined', participant } as SocketEvent, guestId);
        
        // Add join system banner
        const sysMsg: Message = {
          id: `sys-join-${Date.now()}`,
          roomId: normRoomId,
          senderId: 'system',
          senderName: 'DropIn',
          text: `👋 ${participant.nickname} joined the coordination`,
          timestamp: Date.now(),
          isPinned: false,
          isAction: false,
        };
        roomMessages[normRoomId].push(sysMsg);
        broadcast(normRoomId, { type: 'new_message', message: sysMsg } as SocketEvent, null);

        // Update active typing users state
        sendTypingList(normRoomId);
      }

      else if (data.type === 'send_message') {
        if (!subscribedRoomId || !clientGuestId) return;

        // Anti-spam warning
        if (isRateLimited(ws)) {
          ws.send(JSON.stringify({ type: 'error', message: '⚠️ Anti-Spam: You are sending messages too quickly. Please pause.' } as SocketEvent));
          return;
        }

        const room = rooms[subscribedRoomId];
        if (!room) return;

        // Expired room guard
        if (room.expiresAt <= Date.now()) {
          ws.send(JSON.stringify({ type: 'error', message: 'This room has expired. Messages cannot be sent.' } as SocketEvent));
          return;
        }

        const participants = roomParticipants[subscribedRoomId] || {};
        const sender = participants[clientGuestId];
        if (!sender) return;

        sender.lastActiveAt = Date.now();

        const cleanText = filterProfanity(data.text.trim());
        if (cleanText === '') return;

        const message: Message = {
          id: `msg-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          roomId: subscribedRoomId,
          senderId: clientGuestId,
          senderName: sender.nickname,
          text: cleanText,
          timestamp: Date.now(),
          isPinned: false,
          isAction: !data.isAction ? false : true,
        };

        if (!roomMessages[subscribedRoomId]) {
          roomMessages[subscribedRoomId] = [];
        }
        roomMessages[subscribedRoomId].push(message);

        // Broadcast new message
        broadcast(subscribedRoomId, { type: 'new_message', message } as SocketEvent, null);

        // Reset typing indicator when sending message
        if (typingUsers[subscribedRoomId]?.[clientGuestId]) {
          delete typingUsers[subscribedRoomId][clientGuestId];
          sendTypingList(subscribedRoomId);
        }
      }

      else if (data.type === 'typing') {
        if (!subscribedRoomId || !clientGuestId) return;
        
        const participants = roomParticipants[subscribedRoomId] || {};
        const sender = participants[clientGuestId];
        if (!sender) return;

        if (!typingUsers[subscribedRoomId]) {
          typingUsers[subscribedRoomId] = {};
        }

        if (data.isTyping) {
          typingUsers[subscribedRoomId][clientGuestId] = {
            nickname: sender.nickname,
            ts: Date.now(),
          };
        } else {
          delete typingUsers[subscribedRoomId][clientGuestId];
        }

        sendTypingList(subscribedRoomId);
      }

      else if (data.type === 'pin_message') {
        const { roomId, messageId, pin } = data;
        const normRoomId = roomId.toUpperCase();
        if (!subscribedRoomId || !clientGuestId) return;

        // Only room creator can pin updates
        const room = rooms[normRoomId];
        if (!room || room.createdBy !== clientGuestId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Only the room creator is allowed to pin updates.' } as SocketEvent));
          return;
        }

        const messages = roomMessages[normRoomId] || [];
        const msg = messages.find((m) => m.id === messageId);
        if (msg) {
          msg.isPinned = pin;
          broadcast(normRoomId, { type: 'message_pinned', messageId, isPinned: pin } as SocketEvent, null);
          
          // System update message
          const text = pin ? `📌 message "${msg.text.substring(0, 30)}${msg.text.length > 30 ? '...' : ''}" was pinned` : `📍 message was unpinned`;
          const sysMsg: Message = {
            id: `sys-pin-${Date.now()}`,
            roomId: normRoomId,
            senderId: 'system',
            senderName: 'DropIn',
            text,
            timestamp: Date.now(),
            isPinned: false,
            isAction: false,
          };
          messages.push(sysMsg);
          broadcast(normRoomId, { type: 'new_message', message: sysMsg } as SocketEvent, null);
        }
      }

      else if (data.type === 'ban_participant') {
        const { roomId, guestId } = data;
        const normRoomId = roomId.toUpperCase();
        if (!subscribedRoomId || !clientGuestId) return;

        // Only room creator can ban/kick other participants and they can't ban themselves
        const room = rooms[normRoomId];
        if (!room || room.createdBy !== clientGuestId || guestId === clientGuestId) {
          ws.send(JSON.stringify({ type: 'error', message: 'Action not allowed.' } as SocketEvent));
          return;
        }

        if (!roomBannedUsers[normRoomId]) {
          roomBannedUsers[normRoomId] = new Set();
        }
        roomBannedUsers[normRoomId].add(guestId);

        // Find banned user nickname
        const participants = roomParticipants[normRoomId] || {};
        const bNickname = participants[guestId]?.nickname || 'Someone';

        // Disconnect the WebSocket
        const targetWs = activeConnections[normRoomId]?.[guestId];
        if (targetWs) {
          targetWs.send(JSON.stringify({ type: 'participant_banned', guestId } as SocketEvent));
          targetWs.close();
        }

        // Remove participant
        delete participants[guestId];
        if (activeConnections[normRoomId]) {
          delete activeConnections[normRoomId][guestId];
        }

        broadcast(normRoomId, { type: 'user_left', guestId, nickname: bNickname } as SocketEvent, null);

        // System message of removal
        const messages = roomMessages[normRoomId] || [];
        const sysMsg: Message = {
          id: `sys-ban-${Date.now()}`,
          roomId: normRoomId,
          senderId: 'system',
          senderName: 'DropIn',
          text: `🚫 ${bNickname} has been removed by the room owner`,
          timestamp: Date.now(),
          isPinned: false,
          isAction: false,
        };
        messages.push(sysMsg);
        broadcast(normRoomId, { type: 'new_message', message: sysMsg } as SocketEvent, null);
      }

    } catch (err) {
      console.error('Error handling websocket message:', err);
    }
  });

  ws.on('close', () => {
    clientMessageHistory.delete(ws);
    
    if (subscribedRoomId && clientGuestId) {
      const participants = roomParticipants[subscribedRoomId] || {};
      const participant = participants[clientGuestId];
      
      if (participant) {
        const nick = participant.nickname;
        delete participants[clientGuestId];
        
        if (activeConnections[subscribedRoomId]) {
          delete activeConnections[subscribedRoomId][clientGuestId];
        }
        if (typingUsers[subscribedRoomId]) {
          delete typingUsers[subscribedRoomId][clientGuestId];
        }

        // Broadcast leave
        broadcast(subscribedRoomId, { type: 'user_left', guestId: clientGuestId, nickname: nick } as SocketEvent, null);
        
        // System message
        const messages = roomMessages[subscribedRoomId] || [];
        const sysMsg: Message = {
          id: `sys-leave-${Date.now()}`,
          roomId: subscribedRoomId,
          senderId: 'system',
          senderName: 'DropIn',
          text: `💨 ${nick} left the coordination`,
          timestamp: Date.now(),
          isPinned: false,
          isAction: false,
        };
        messages.push(sysMsg);
        broadcast(subscribedRoomId, { type: 'new_message', message: sysMsg } as SocketEvent, null);

        sendTypingList(subscribedRoomId);
      }
    }
  });
});

// Helper: Broadcast to all connected clients in a room
function broadcast(roomId: string, messageObj: SocketEvent, excludeGuestId: string | null = null) {
  const connections = activeConnections[roomId];
  if (!connections) return;

  const payload = JSON.stringify(messageObj);
  Object.entries(connections).forEach(([guestId, ws]) => {
    if (guestId !== excludeGuestId && ws.readyState === WebSocket.OPEN) {
      ws.send(payload);
    }
  });
}

// Helper: Send list of active typing users
function sendTypingList(roomId: string) {
  const now = Date.now();
  const typing = typingUsers[roomId] || {};
  
  // Prune keystrokes older than 4 seconds
  Object.keys(typing).forEach((guestId) => {
    if (now - typing[guestId].ts > 4000) {
      delete typing[guestId];
    }
  });

  const activeTyping: { [id: string]: string } = {};
  Object.entries(typing).forEach(([guestId, info]) => {
    activeTyping[guestId] = info.nickname;
  });

  broadcast(roomId, { type: 'typing_users', typing: activeTyping } as SocketEvent, null);
}

// Attach upgrades of WebSockets on port 3000
server.on('upgrade', (request, socket, head) => {
  const pathname = request.url ? new URL(request.url, `http://${request.headers.host}`).pathname : '';
  if (pathname === '/ws') {
    wss.handleUpgrade(request, socket, head, (ws) => {
      wss.emit('connection', ws, request);
    });
  } else {
    socket.destroy();
  }
});

// Integrate Vite middleware
async function setupVite() {
  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
    console.log('Vite middleware mounted');
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
    console.log('Production static files route mounted');
  }

  server.listen(PORT, '0.0.0.0', () => {
    console.log(`DropIn server running on port ${PORT}`);
  });
}

setupVite();
