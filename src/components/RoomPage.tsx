import React, { useState, useEffect, useRef, useId } from 'react';
import {
  ChevronLeft, Pin, Clock, MapPin, Users, Bell, BellOff,
  Send, Volume2, VolumeX, ShieldOff, Crown, AlertTriangle, Copy, Check, QrCode, Share2, Download, History, ChevronDown
} from 'lucide-react';
import QRCode from 'qrcode';
import { Room, Participant, Message, SocketEvent, SocketMessage, RoomState } from '../types.js';
import { formatTimeRemaining, playNotificationSound, getPlatformOS, getPlatformMetaKeyLabel, getPlatformMetaKeyName, isAppleDevice, getRecentRooms, RecentRoom } from '../utils.js';
import { AnimatedHeading } from './AnimatedHeading.js';
import { motion, AnimatePresence } from 'motion/react';

const getAvatarStyle = (name: string, id: string) => {
  const hash = Array.from(id || name || '').reduce((acc, char) => acc + char.charCodeAt(0), 0);
  
  // Custom refined color palettes (bg, border, text, and primary/secondary shape colors for the SVG)
  const palettes = [
    { bg: '#F5F3FF', border: '#DDD6FE', text: '#5B21B6', colors: ['#C4B5FD', '#8B5CF6'] }, // Violet
    { bg: '#FFF7ED', border: '#FFEDD5', text: '#C2410C', colors: ['#FED7AA', '#F97316'] }, // Orange/Amber
    { bg: '#ECFDF5', border: '#D1FAE5', text: '#047857', colors: ['#A7F3D0', '#10B981'] }, // Emerald/Green
    { bg: '#FFF1F2', border: '#FFE4E6', text: '#BE123C', colors: ['#FECDD3', '#F43F5E'] }, // Rose/Red
    { bg: '#F0FDFA', border: '#CCFBF1', text: '#0F766E', colors: ['#99F6E4', '#14B8A6'] }, // Teal
    { bg: '#EFF6FF', border: '#DBEAFE', text: '#1D4ED8', colors: ['#BFDBFE', '#3B82F6'] }, // Blue
    { bg: '#FAF5FF', border: '#F3E8FF', text: '#7E22CE', colors: ['#E9D5FF', '#A855F7'] }, // Purple
    { bg: '#F0F9FF', border: '#E0F2FE', text: '#0369A1', colors: ['#BAE6FD', '#0EA5E9'] }, // Sky Cyan
  ];
  const palette = palettes[hash % palettes.length];
  
  // Decide a shape variation
  const patternType = hash % 4; 
  
  const initials = name ? name.trim().substring(0, 2).toUpperCase() : '??';
  
  return { palette, patternType, initials };
};

const renderGeometricAvatar = (nickname: string, guestId: string, isCreator?: boolean) => {
  const { palette, patternType, initials } = getAvatarStyle(nickname, guestId);
  
  return (
    <div 
      className="h-8 w-8 rounded-full border flex items-center justify-center shrink-0 relative overflow-hidden font-sans font-bold text-xs select-none shadow-xs"
      style={{ 
        backgroundColor: palette.bg, 
        borderColor: palette.border,
        color: palette.text
      }}
    >
      {/* Unique Geometric Pattern SVG Background */}
      <svg className="absolute inset-0 h-full w-full opacity-35" viewBox="0 0 100 100" fill="none" xmlns="http://www.w3.org/2000/svg">
        {patternType === 0 && (
          <>
            <polygon points="0,0 100,0 50,50" fill={palette.colors[0]} />
            <polygon points="100,100 0,100 50,50" fill={palette.colors[1]} />
          </>
        )}
        {patternType === 1 && (
          <>
            <circle cx="50" cy="50" r="45" fill="none" stroke={palette.colors[0]} strokeWidth="15" />
            <circle cx="50" cy="50" r="20" fill={palette.colors[1]} />
          </>
        )}
        {patternType === 2 && (
          <>
            <rect x="0" y="0" width="100" height="10" transform="rotate(-45 50 50)" fill={palette.colors[0]} />
            <rect x="0" y="30" width="100" height="10" transform="rotate(-45 50 50)" fill={palette.colors[1]} />
            <rect x="0" y="60" width="100" height="10" transform="rotate(-45 50 50)" fill={palette.colors[0]} />
          </>
        )}
        {patternType === 3 && (
          <>
            <rect x="0" y="0" width="40" height="40" fill={palette.colors[0]} />
            <rect x="60" y="60" width="40" height="40" fill={palette.colors[0]} />
            <circle cx="50" cy="50" r="25" fill={palette.colors[1]} />
          </>
        )}
      </svg>
      
      {/* Initials fallback or Crown overlay */}
      <span className="relative z-10 font-bold tracking-tight text-[11px] flex items-center justify-center">
        {isCreator ? (
          <Crown className="h-3.5 w-3.5 fill-current" />
        ) : (
          initials
        )}
      </span>
    </div>
  );
};

interface RoomPageProps {
  roomId: string;
  myGuestId: string;
  myNickname: string;
  onExit: () => void;
}

export default function RoomPage({ roomId, myGuestId, myNickname, onExit }: RoomPageProps) {
  const [roomState, setRoomState] = useState<RoomState | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [errorMessage, setErrorMessage] = useState('');
  
  // Controls & States
  const [inputText, setInputText] = useState('');
  const [notificationLevel, setNotificationLevel] = useState<'all' | 'important'>('all');
  const [isMuted, setIsMuted] = useState(false);
  const [activeTyping, setActiveTyping] = useState<{ [id: string]: string }>({});
  
  // Timer States
  const [timeRemaining, setTimeRemaining] = useState({ text: '...', isExpiringSoon: false, isExpired: false });

  // Adaptive platform indicators
  const [platformOS, setPlatformOS] = useState<'macOS' | 'iOS' | 'Windows' | 'Android' | 'Linux' | 'Web'>('Web');
  const [metaKey, setMetaKey] = useState('Ctrl');
  const [appleSystem, setAppleSystem] = useState(false);

  // Recent rooms switcher states
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [showMyRoomsDropdown, setShowMyRoomsDropdown] = useState(false);
  const [isSignedUp, setIsSignedUp] = useState(false);

  useEffect(() => {
    setPlatformOS(getPlatformOS());
    setMetaKey(getPlatformMetaKeyLabel());
    setAppleSystem(isAppleDevice());
    setIsSignedUp(localStorage.getItem('dropin_is_logged_in') === 'true');
    setRecentRooms(getRecentRooms());
  }, []);

  // Mobile Drawer toggles
  const [showMobileParticipants, setShowMobileParticipants] = useState(false);

  const [copied, setCopied] = useState(false);
  const [showQrModal, setShowQrModal] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');

  useEffect(() => {
    if (roomId) {
      const shareUrl = window.location.origin + window.location.pathname + '#/room/' + roomId.toUpperCase();
      QRCode.toDataURL(shareUrl, {
        width: 256,
        margin: 1.5,
        color: {
          dark: '#0f172a', // slate-900
          light: '#ffffff', // white background
        }
      })
      .then(url => {
        setQrCodeUrl(url);
      })
      .catch(err => {
        console.error('Error generating QR Code', err);
      });
    }
  }, [roomId]);

  const handleCopyCode = () => {
    const shareUrl = window.location.origin + window.location.pathname + '#/room/' + (roomId || '').toUpperCase();
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const [shareSuccess, setShareSuccess] = useState<string | null>(null);

  const handleDownloadQr = () => {
    if (!qrCodeUrl) return;
    const link = document.createElement('a');
    link.href = qrCodeUrl;
    link.download = `dropin-room-qr-${roomId.toLowerCase()}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    
    setShareSuccess('QR Code downloaded!');
    setTimeout(() => setShareSuccess(null), 2500);
  };

  const shareText = `Join my live DropIn workspace to coordinate instantly!\nRoom Code: ${(roomId || '').toUpperCase()}\n`;
  const shareUrl = window.location.origin + window.location.pathname + '#/room/' + (roomId || '').toUpperCase();

  const handleShareNative = async () => {
    if (!qrCodeUrl) return;
    try {
      const res = await fetch(qrCodeUrl);
      const blob = await res.blob();
      const file = new File([blob], `dropin-room-qr-${roomId.toLowerCase()}.png`, { type: 'image/png' });

      if (navigator.share) {
        const shareData: ShareData = {
          title: `Join DropIn Room ${(roomId || '').toUpperCase()}`,
          text: `${shareText}Join us via:`,
          url: shareUrl,
        };

        if (navigator.canShare && navigator.canShare({ files: [file] })) {
          shareData.files = [file];
        }

        await navigator.share(shareData);
        setShareSuccess('Successfully shared invite packet!');
      } else {
        handleCopyCode();
        setShareSuccess('Copied workspace Invite Link!');
      }
    } catch (err) {
      console.error('Error sharing native package', err);
      handleCopyCode();
      setShareSuccess('Copied Room Invite Link!');
    }
    setTimeout(() => setShareSuccess(null), 2500);
  };

  const handleSocialShare = (platform: 'twitter' | 'whatsapp' | 'telegram' | 'email') => {
    const textAndUrl = `Join us in DropIn! Live coordination room: ${(roomId || '').toUpperCase()}\n\nScan QR Code on screens or tap link directly to join our stream:\nLink: ${shareUrl}`;
    const encodedText = encodeURIComponent(textAndUrl);
    
    let targetUrl = '';
    if (platform === 'twitter') {
      targetUrl = `https://twitter.com/intent/tweet?text=${encodedText}`;
    } else if (platform === 'whatsapp') {
      targetUrl = `https://api.whatsapp.com/send?text=${encodedText}`;
    } else if (platform === 'telegram') {
      targetUrl = `https://t.me/share/url?url=${encodeURIComponent(shareUrl)}&text=${encodeURIComponent(`Join our active DropIn conversation! Code: ${(roomId || '').toUpperCase()}`)}`;
    } else if (platform === 'email') {
      targetUrl = `mailto:?subject=${encodeURIComponent(`DropIn Live Invite: ${(roomId || '').toUpperCase()}`)}&body=${encodedText}`;
    }

    if (targetUrl) {
      window.open(targetUrl, '_blank', 'noreferrer,noopener');
      setShareSuccess(`Inviting via ${platform}!`);
      setTimeout(() => setShareSuccess(null), 2500);
    }
  };

  const typingId = useId();
  const inputMessageId = useId();

  // Sockets & Refs
  const socketRef = useRef<WebSocket | null>(null);
  const messageEndRef = useRef<HTMLDivElement | null>(null);
  const typingTimerRef = useRef<NodeJS.Timeout | null>(null);
  const isTypingRef = useRef(false);

  // Auto Scroll
  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    messageEndRef.current?.scrollIntoView({ behavior });
  };

  // Connect Web Socket
  const connectWebSocket = () => {
    setConnectionStatus('connecting');
    setErrorMessage('');

    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws`;
    const socket = new WebSocket(wsUrl);
    socketRef.current = socket;

    socket.onopen = () => {
      setConnectionStatus('connected');
      // Send join event
      const joinMsg: SocketMessage = {
        type: 'join',
        roomId,
        guestId: myGuestId,
        nickname: myNickname,
      };
      socket.send(JSON.stringify(joinMsg));
    };

    socket.onmessage = (event) => {
      try {
        const payload: SocketEvent = JSON.parse(event.data);

        if (payload.type === 'room_state') {
          setRoomState(payload.state);
          setTimeout(() => scrollToBottom('instant'), 50);
        }

        else if (payload.type === 'user_joined') {
          setRoomState((prev) => {
            if (!prev) return null;
            // Prevent duplicates
            const cleanParticipants = prev.participants.filter(p => p.guestId !== payload.participant.guestId);
            return {
              ...prev,
              participants: [...cleanParticipants, payload.participant],
            };
          });
        }

        else if (payload.type === 'user_left') {
          setRoomState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              participants: prev.participants.filter((p) => p.guestId !== payload.guestId),
            };
          });
        }

        else if (payload.type === 'new_message') {
          setRoomState((prev) => {
            if (!prev) return null;
            // Ignore duplicate system joins or messageids
            if (prev.messages.some(m => m.id === payload.message.id)) return prev;
            return {
              ...prev,
              messages: [...prev.messages, payload.message],
            };
          });

          // Handle sound notifications
          if (payload.message.senderId !== myGuestId && payload.message.senderId !== 'system') {
            const isAnnounce = payload.message.isPinned || payload.message.text.includes(`@${myNickname}`);
            const shouldPlay = notificationLevel === 'all' || (notificationLevel === 'important' && isAnnounce);
            if (shouldPlay && !isMuted) {
              playNotificationSound();
            }
          }

          // Trigger continuous scroll
          setTimeout(() => scrollToBottom('smooth'), 50);
        }

        else if (payload.type === 'message_pinned') {
          setRoomState((prev) => {
            if (!prev) return null;
            return {
              ...prev,
              messages: prev.messages.map((m) =>
                m.id === payload.messageId ? { ...m, isPinned: payload.isPinned } : m
              ),
            };
          });
        }

        else if (payload.type === 'participant_banned') {
          if (payload.guestId === myGuestId) {
            setErrorMessage('You have been removed and banned from this room by the creator.');
            setConnectionStatus('disconnected');
            socketRef.current?.close();
          } else {
            setRoomState((prev) => {
              if (!prev) return null;
              return {
                ...prev,
                participants: prev.participants.filter((p) => p.guestId !== payload.guestId),
              };
            });
          }
        }

        else if (payload.type === 'typing_users') {
          // Remove ourselves from typing indicator
          const { [myGuestId]: _, ...othersTyping } = payload.typing;
          setActiveTyping(othersTyping);
        }

        else if (payload.type === 'error') {
          setErrorMessage(payload.message);
        }

      } catch (err) {
        console.error('Error parsing WS message:', err);
      }
    };

    socket.onerror = (e) => {
      console.error('WS Connection error:', e);
      setConnectionStatus('disconnected');
    };

    socket.onclose = () => {
      setConnectionStatus('disconnected');
    };
  };

  // Re-run connection on change
  useEffect(() => {
    connectWebSocket();
    return () => {
      if (socketRef.current) {
        socketRef.current.close();
      }
    };
  }, [roomId, myGuestId]);

  // Handle active expiration countdown timer ticking
  useEffect(() => {
    if (!roomState?.room) return;
    
    const checkTime = () => {
      const remaining = formatTimeRemaining(roomState.room.expiresAt);
      setTimeRemaining(remaining);
      if (remaining.isExpired && connectionStatus === 'connected') {
        socketRef.current?.close();
        setConnectionStatus('disconnected');
      }
    };

    checkTime();
    const timerId = setInterval(checkTime, 1000);
    return () => clearInterval(timerId);
  }, [roomState?.room?.expiresAt, connectionStatus]);

  // Typing change trigger
  const handleInputChange = (text: string) => {
    setInputText(text);

    if (connectionStatus !== 'connected') return;

    if (!isTypingRef.current) {
      isTypingRef.current = true;
      socketRef.current?.send(JSON.stringify({ type: 'typing', roomId, guestId: myGuestId, isTyping: true } as SocketMessage));
    }

    if (typingTimerRef.current) clearTimeout(typingTimerRef.current);
    
    typingTimerRef.current = setTimeout(() => {
      isTypingRef.current = false;
      socketRef.current?.send(JSON.stringify({ type: 'typing', roomId, guestId: myGuestId, isTyping: false } as SocketMessage));
    }, 2500);
  };

  // Send message
  const handleSendMessage = (e?: React.FormEvent, isAction = false, textToSend?: string) => {
    if (e) e.preventDefault();
    
    const messageText = textToSend !== undefined ? textToSend : inputText;
    if (!messageText.trim() || connectionStatus !== 'connected' || timeRemaining.isExpired) return;

    const payload: SocketMessage = {
      type: 'send_message',
      roomId,
      text: messageText,
      isAction,
    };
    socketRef.current?.send(JSON.stringify(payload));
    
    if (textToSend === undefined) {
      setInputText('');
    }
  };

  // Trigger quick click coordinates
  const triggerQuickAction = (actionText: string) => {
    handleSendMessage(undefined, true, actionText);
  };

  // Pin action handler
  const handleTogglePin = (messageId: string, currentPinStatus: boolean) => {
    if (connectionStatus !== 'connected') return;
    socketRef.current?.send(JSON.stringify({
      type: 'pin_message',
      roomId,
      messageId,
      pin: !currentPinStatus,
    } as SocketMessage));
  };

  // Ban action handler
  const handleBanParticipant = (guestId: string) => {
    if (connectionStatus !== 'connected') return;
    if (confirm('Ban this user? They will be instantly disconnected and blocked from rejoining.')) {
      socketRef.current?.send(JSON.stringify({
        type: 'ban_participant',
        roomId,
        guestId,
      } as SocketMessage));
    }
  };

  const room = roomState?.room;
  const participants = roomState?.participants || [];
  const messages = roomState?.messages || [];
  const pinnedMessages = messages.filter((m) => m.isPinned);
  const isCreatorOfRoom = room?.createdBy === myGuestId;

  // Auto Scroll message stream when message list changes or someone starts/stops typing
  useEffect(() => {
    if (messages.length > 0 || Object.keys(activeTyping).length > 0) {
      scrollToBottom('smooth');
    }
  }, [messages.length, Object.keys(activeTyping).length]);

  // Render Loader if state not ready yet
  if (!room && !errorMessage) {
    return (
      <div className="min-h-dvh bg-[#FBFBFB] flex flex-col items-center justify-center p-4">
        <div className="text-center space-y-4 max-w-sm">
          <div className="animate-spin rounded-full h-12 w-12 border-4 border-orange-500 border-t-transparent mx-auto"></div>
          <h3 className="font-sans font-bold text-slate-800 text-lg">Synchronizing DropIn</h3>
          <p className="text-slate-500 text-xs leading-normal">
            Fetching secure room metadata and allocating WebSocket channels for room code <span className="font-mono bg-slate-100 font-semibold px-1.5 py-0.5 rounded-sm">{roomId}</span>...
          </p>
        </div>
      </div>
    );
  }

  // Render error screen (banned or room expired)
  if (errorMessage) {
    return (
      <div className="min-h-dvh bg-[#FBFBFB] flex flex-col items-center justify-center p-4">
        <div className="bg-white border border-slate-100 shadow-sm rounded-3xl p-6 md:p-8 max-w-md w-full text-center space-y-6">
          <div className="h-14 w-14 bg-rose-50 rounded-full flex items-center justify-center mx-auto text-rose-500">
            <AlertTriangle className="h-7 w-7" />
          </div>
          <div className="space-y-2">
            <h3 className="font-sans font-bold text-slate-900 text-xl">Room Unavailable</h3>
            <p className="text-slate-500 text-sm leading-relaxed">{errorMessage}</p>
          </div>
          <button
            type="button"
            id="btn-error-exit"
            onClick={onExit}
            className="w-full bg-orange-500 hover:bg-orange-600 text-white font-semibold py-3 px-4 rounded-xl transition duration-150 cursor-pointer"
          >
            Return to Homepage
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-dvh bg-[#FBFBFB] flex flex-col h-dvh overflow-hidden">
      
      {/* HEADER BAR */}
      <header className="bg-white border-b border-slate-100 px-6 py-4 shrink-0 flex items-center justify-between" id="room-header">
        <div className="flex items-center space-x-3 max-w-lg min-w-0">
          <button
            type="button"
            id="btn-leave-room"
            onClick={onExit}
            className="p-1.5 hover:bg-slate-50 rounded-lg text-slate-500 hover:text-slate-800 transition-colors shrink-0 cursor-pointer"
            title="Leave room and return to menu"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          
          <div className="min-w-0">
            <div className="flex items-center space-x-2">
              <h2 className="font-sans font-bold text-slate-900 text-base md:text-lg truncate tracking-tight">{room?.title}</h2>
              <div className="flex items-center space-x-1.5 shrink-0 bg-orange-50 px-2.5 py-0.5 rounded-full border border-orange-100/30">
                <span className="font-mono text-[10px] font-bold text-orange-600">
                  {room?.id}
                </span>
                <button
                  type="button"
                  onClick={handleCopyCode}
                  className="p-1 rounded-sm text-orange-400 hover:text-orange-600 hover:bg-orange-100/40 active:scale-90 transition-all cursor-pointer"
                  title={copied ? "Copied Link!" : "Copy full invite link to clipboard"}
                  aria-label="Copy full invite link"
                >
                  {copied ? (
                    <Check className="h-3 w-3 text-emerald-600 font-bold" />
                  ) : (
                    <Copy className="h-3 w-3" />
                  )}
                </button>
                <span className="w-[1px] h-2.5 bg-orange-200/50"></span>
                <button
                  type="button"
                  onClick={() => setShowQrModal(true)}
                  className="p-1 rounded-sm text-orange-400 hover:text-orange-600 hover:bg-orange-100/40 active:scale-90 transition-all cursor-pointer"
                  title="Show QR Code for quick mobile join"
                  aria-label="Show QR code"
                >
                  <QrCode className="h-3 w-3" />
                </button>
              </div>
            </div>
            {room?.location && (
              <p className="text-[11px] text-slate-500 font-medium flex items-center mt-0.5 truncate">
                <MapPin className="h-3 w-3 mr-0.5 text-slate-400 shrink-0" />
                <span>{room.location}</span>
                {room.participantLimit && (
                  <span className="mx-1.5 bg-slate-200 h-2.5 w-[1px] inline-block"></span>
                )}
                {room.participantLimit && (
                  <span className="flex items-center text-[10px] text-slate-500 bg-slate-50 px-1.5 py-0.2 rounded-sm font-semibold border border-slate-100">
                    Limit {participants.length}/{room.participantLimit}
                  </span>
                )}
              </p>
            )}
          </div>
        </div>

        {/* Real-time statuses */}
        <div className="flex items-center space-x-2 sm:space-x-3.5">
          {/* My Rooms Dropdown for quick switcher access with Notion/Apple style popover */}
          {isSignedUp && (
            <div className="relative inline-block" id="room-header-rooms-dropdown-container">
              <button
                type="button"
                id="btn-room-my-rooms"
                onMouseEnter={() => {
                  setRecentRooms(getRecentRooms());
                  setShowMyRoomsDropdown(true);
                }}
                onClick={() => {
                  setRecentRooms(getRecentRooms());
                  setShowMyRoomsDropdown(!showMyRoomsDropdown);
                }}
                className="px-2.5 py-1.5 bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-900 rounded-lg flex items-center space-x-1.5 font-sans font-bold text-[11px] cursor-pointer transition-all active:scale-95 border border-slate-200/50 select-none shadow-3xs"
                title="Quick workspace switcher"
              >
                <History className="h-3 w-3 text-orange-500 animate-[spin_3s_linear_infinite]" />
                <span className="hidden md:inline">My Rooms</span>
                <ChevronDown className={`h-2.5 w-2.5 text-slate-400 transition-transform duration-200 ${showMyRoomsDropdown ? 'rotate-180' : ''}`} />
              </button>

              <AnimatePresence>
                {showMyRoomsDropdown && (
                  <>
                    <div 
                      className="fixed inset-0 z-40" 
                      onClick={() => setShowMyRoomsDropdown(false)}
                    />
                    
                    <motion.div
                      initial={{ opacity: 0, y: -12, scale: 0.96, filter: 'blur(12px)' }}
                      animate={{ opacity: 1, y: 0, scale: 1, filter: 'blur(0px)' }}
                      exit={{ opacity: 0, y: -8, scale: 0.96, filter: 'blur(8px)' }}
                      transition={{ type: 'spring', stiffness: 380, damping: 26 }}
                      className="absolute right-0 mt-2.5 w-76 bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/40 shadow-2xl p-3 z-50 text-left"
                    >
                      <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 mb-2 select-none">
                        <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest font-sans">Quick Switcher</span>
                        <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-100/50 px-1.5 py-0.5 rounded-md font-bold font-mono">
                          {recentRooms.length} Total
                        </span>
                      </div>

                      {recentRooms.length > 0 ? (
                        <div className="max-h-60 overflow-y-auto space-y-1 pr-1 bg-transparent" id="recent-rooms-room-list">
                          {recentRooms.map((r, index) => {
                            const isCurrent = r.id.toUpperCase() === roomId.toUpperCase();
                            return (
                              <motion.button
                                key={r.id}
                                type="button"
                                disabled={isCurrent}
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03, duration: 0.2 }}
                                onClick={() => {
                                  window.location.hash = `#/room/${r.id}`;
                                  setShowMyRoomsDropdown(false);
                                }}
                                className={`w-full text-left p-2 border border-transparent rounded-xl transition-all flex items-start space-x-2 ${
                                  isCurrent 
                                    ? 'bg-slate-50 opacity-60 cursor-not-allowed border-slate-100' 
                                    : 'hover:bg-slate-50 hover:border-slate-100/50 cursor-pointer group'
                                }`}
                              >
                                <div className={`h-7 w-7 rounded-lg flex items-center justify-center shrink-0 uppercase font-bold text-[10px] font-mono border ${
                                  isCurrent
                                    ? 'bg-slate-100 text-slate-400 border-slate-200/50'
                                    : 'bg-orange-50 text-orange-600 border-orange-100/30'
                                }`}>
                                  {r.id.slice(0, 2)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className={`text-xs font-bold truncate block ${isCurrent ? 'text-slate-400' : 'text-slate-800 group-hover:text-orange-600 transition-colors'}`}>
                                      {r.title}
                                    </span>
                                    <span className={`text-[10px] font-mono font-bold shrink-0 uppercase ${isCurrent ? 'text-slate-400' : 'text-orange-500'}`}>
                                      #{r.id}
                                    </span>
                                  </div>
                                  {r.location && (
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5">
                                      📍 {r.location}
                                    </p>
                                  )}
                                </div>
                              </motion.button>
                            );
                          })}
                        </div>
                      ) : (
                        <div className="py-6 px-4 text-center select-none text-xs text-slate-400 font-sans leading-relaxed">
                          No other rooms found.
                        </div>
                      )}
                    </motion.div>
                  </>
                )}
              </AnimatePresence>
            </div>
          )}

          {/* Mobile Participants Drawer trigger */}
          <button
            type="button"
            onClick={() => {
              setShowMobileParticipants(!showMobileParticipants);
            }}
            aria-label="Toggle active participant list"
            title="Toggle active participant list"
            className="md:hidden p-2 rounded-xl border border-slate-100 bg-white text-slate-500 hover:text-orange-500 active:bg-slate-50 transition-colors cursor-pointer flex items-center justify-center relative shadow-xs"
          >
            <Users className="h-4 w-4" />
            <span className="absolute -top-1 -right-1 min-w-4 h-4 px-1 rounded-full bg-orange-500 text-[8px] font-bold text-white flex items-center justify-center">
              {participants.length}
            </span>
          </button>

          {/* Active Status Badge */}
          {connectionStatus === 'connected' ? (
            <div className={`hidden sm:flex items-center space-x-1 border rounded-full px-2.5 py-1 text-[11px] font-medium transition-colors ${
              timeRemaining.isExpiringSoon 
                ? 'bg-amber-50 border-amber-200 text-amber-700' 
                : 'bg-emerald-50 border-emerald-100 text-emerald-700'
            }`}>
              <span className={`h-1.5 w-1.5 rounded-full ${timeRemaining.isExpiringSoon ? 'bg-amber-500' : 'bg-emerald-500'} animate-pulse`}></span>
              <span>{timeRemaining.isExpiringSoon ? 'Expiring soon' : 'Active Room'}</span>
            </div>
          ) : (
            <div className="hidden sm:flex items-center space-x-1 bg-rose-50 border border-rose-200 rounded-full px-2.5 py-1 text-[11px] font-medium text-rose-700">
              <span className="h-1.5 w-1.5 rounded-full bg-rose-500 animate-pulse"></span>
              <span>Connection Cut</span>
            </div>
          )}

          {/* TIMER INDICATOR */}
          <div className={`flex items-center space-x-1.5 px-3 py-1.5 rounded-xl border ${
            timeRemaining.isExpired 
              ? 'bg-slate-100 border-slate-150 text-slate-400' 
              : timeRemaining.isExpiringSoon 
                ? 'bg-amber-50 border-amber-200 text-amber-700 animate-pulse' 
                : 'bg-orange-50 border-orange-100 text-orange-600'
          }`}>
            <Clock className="h-4 w-4 shrink-0 text-orange-500" />
            <span className="timer-mono text-sm font-bold tracking-tight text-orange-600">{timeRemaining.text}</span>
          </div>
        </div>
      </header>

      {/* THREE PANELS LAYOUT */}
      <div className="flex-1 flex overflow-hidden relative">
        
        {/* LEFT / SIDEBAR PANEL: ACTIVE COORDINATORS & CO-OPTIONS */}
        <aside 
          className={`w-72 border-r border-slate-100 bg-white flex flex-col h-full shrink-0 md:relative absolute md:left-0 z-30 transition-all duration-300 ${showMobileParticipants ? 'left-0 shadow-lg' : '-left-72'} md:left-auto md:flex md:shadow-none`}
          aria-label="Participant list and settings"
        >
          <div className="p-4 border-b border-slate-100 space-y-4">
            {/* Mobile-only header with close button */}
            <div className="flex md:hidden items-center justify-between pb-1">
              <span className="text-xs font-bold text-slate-800 font-sans uppercase tracking-wide">Settings & Members</span>
              <button
                type="button"
                onClick={() => setShowMobileParticipants(false)}
                className="p-1.5 rounded-lg hover:bg-slate-100 text-slate-500 cursor-pointer font-bold text-xs"
                aria-label="Close settings and participant list panel"
              >
                ✕ Close
              </button>
            </div>
            
            {/* Smart Notification Selector */}
            <div className="space-y-2">
              <label className="text-[10px] uppercase tracking-widest text-[#9ca3af] text-xs font-bold font-sans block">Pulse Alerts</label>
              <div className="flex items-center justify-between p-2.5 bg-slate-50/70 border border-slate-100 rounded-xl">
                <span className="text-xs text-slate-600 font-medium flex items-center">
                  {!isMuted ? <Volume2 className="h-3.5 w-3.5 mr-1.5 text-orange-500" /> : <VolumeX className="h-3.5 w-3.5 mr-1.5 text-slate-400" />}
                  Sound effects
                </span>
                <button
                  type="button"
                  id="btn-toggle-mute"
                  onClick={() => setIsMuted(!isMuted)}
                  className={`relative inline-flex h-5 w-9 shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none ${!isMuted ? 'bg-[#111827]' : 'bg-slate-200'}`}
                >
                  <span className={`pointer-events-none inline-block h-4 w-4 transform rounded-full bg-white shadow-sm ring-0 transition duration-200 ease-in-out ${!isMuted ? 'translate-x-4' : 'translate-x-0'}`}></span>
                </button>
              </div>
              <div className="grid grid-cols-2 gap-1.5 p-1 bg-slate-55/60 rounded-lg border border-slate-100">
                <button
                  type="button"
                  id="btn-alert-all"
                  onClick={() => setNotificationLevel('all')}
                  className={`py-1 text-[10.5px] font-bold rounded-md transition-all ${notificationLevel === 'all' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  All Logs
                </button>
                <button
                  type="button"
                  id="btn-alert-important"
                  onClick={() => setNotificationLevel('important')}
                  className={`py-1 text-[10.5px] font-bold rounded-md transition-all ${notificationLevel === 'important' ? 'bg-white text-orange-600 shadow-xs' : 'text-slate-500 hover:text-slate-800'}`}
                >
                  Pins & @Me
                </button>
              </div>
            </div>
          </div>

          {/* ACTIVE ROSTER */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            <div>
              <div className="flex items-center justify-between mb-2">
                <span className="text-[10px] uppercase tracking-widest text-[#9ca3af] text-xs font-bold font-sans">Participants ({participants.length})</span>
                <span className="text-[10px] font-mono font-bold text-slate-500 bg-slate-55/60 border border-slate-100 px-2 py-0.5 rounded-full">
                  Online
                </span>
              </div>
              
              <ul className="space-y-1.5" id="participant-list">
                {participants.map((p) => (
                  <li
                    key={p.guestId}
                    className="group py-2 px-2.5 rounded-xl bg-white border border-slate-100 hover:bg-slate-50 transition-colors flex items-center justify-between"
                  >
                    <div className="flex items-center space-x-2 min-w-0">
                      {renderGeometricAvatar(p.nickname, p.guestId, p.isCreator)}
                      <span className={`text-sm font-medium text-slate-700 truncate ${p.guestId === myGuestId ? 'font-bold text-orange-600' : ''}`}>
                        {p.nickname} {p.guestId === myGuestId ? '(You)' : ''}
                      </span>
                    </div>

                    {/* Ban button for Creator */}
                    {isCreatorOfRoom && p.guestId !== myGuestId && (
                      <button
                        type="button"
                        onClick={() => handleBanParticipant(p.guestId)}
                        title="Ban/Remove participant"
                        className="opacity-0 group-hover:opacity-100 p-1 rounded-sm text-slate-450 hover:text-rose-600 hover:bg-rose-50 transition duration-150 shrink-0 cursor-pointer"
                      >
                        <ShieldOff className="h-3.5 w-3.5" />
                      </button>
                    )}
                  </li>
                ))}
              </ul>
            </div>
          </div>

          <div className="p-4 border-t border-slate-100 text-center bg-white">
            <span className="text-[10px] font-medium tracking-wide text-slate-400">Temporary Space No Log</span>
          </div>
        </aside>

        {/* MIDDLE CHAT STREAM PANEL */}
        <div className="flex-1 flex flex-col h-full bg-white relative">
          
          {/* PINNED ANNOUNCEMENT BOX AT TOP */}
          {pinnedMessages.length > 0 && (
            <div className="m-6 bg-orange-50 border border-orange-100 rounded-xl p-4 flex items-start gap-3 shadow-xs animate-in slide-in-from-top duration-200" id="pinned-announcement-box">
              <div className="flex items-start space-x-2.5 min-w-0">
                <Pin className="h-5 w-5 text-orange-500 mt-1 shrink-0" />
                <div className="space-y-0.5">
                  <AnimatedHeading 
                    text="Pinned Update" 
                    className="text-xs font-bold text-orange-800 uppercase tracking-wide"
                  />
                  <p className="text-sm text-orange-900 font-medium">{pinnedMessages[pinnedMessages.length - 1].text}</p>
                </div>
              </div>

              {/* Creator Unpin button */}
              {isCreatorOfRoom && (
                <button
                  type="button"
                  id="btn-unpin-banner"
                  onClick={() => handleTogglePin(pinnedMessages[pinnedMessages.length - 1].id, true)}
                  className="p-1.5 rounded-lg text-orange-600 hover:bg-orange-100 text-xs shrink-0 cursor-pointer font-bold"
                  title="Unpin upgrade banner"
                  aria-label="Unpin pinned announcement update"
                >
                  Unpin
                </button>
              )}
            </div>
          )}

          {/* CHAT LOG STREAM */}
          <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4" id="chat-messages-scrollable">
            
            {/* Safe Welcome Card if chat empty */}
            {messages.length <= 1 && (
              <div className="p-6 border border-slate-100 border-dashed rounded-3xl text-center space-y-4 max-w-sm mx-auto my-6 bg-white shadow-xs">
                <div className="h-10 w-10 bg-orange-50 text-orange-500 rounded-xl flex items-center justify-center mx-auto shadow-xs">
                  <Pin className="h-5 w-5" />
                </div>
                <div className="space-y-1">
                  <h4 className="font-sans font-bold text-slate-900 text-sm">Drop the Coordinate Invite Link</h4>
                  <p className="text-xs text-slate-500 leading-relaxed">
                    Instantly share this URL or room code <span className="font-mono bg-slate-100 border border-slate-200/50 font-semibold px-1.5 py-0.5 rounded-sm">{room?.id}</span>. Coordination will appear here as soon as they drop nicknames.
                  </p>
                </div>
                
                 {/* Dual Sharing Buttons */}
                <div className="flex flex-col sm:flex-row items-center justify-center gap-2">
                  <button
                    type="button"
                    id="btn-copy-link-inside"
                    onClick={() => {
                      const shareUrl = window.location.origin + window.location.pathname + '#/room/' + (roomId || '').toUpperCase();
                      navigator.clipboard.writeText(shareUrl);
                      alert('Share invite link copied to clipboard!');
                    }}
                    className="w-full sm:w-auto px-4 py-2 bg-slate-900 hover:bg-slate-800 font-semibold text-xs text-white rounded-xl transition duration-150 cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
                  >
                    <Copy className="h-3.5 w-3.5" />
                    <span>Copy Invite Link</span>
                  </button>
                  
                  <button
                    type="button"
                    id="btn-show-qr-inside"
                    onClick={() => setShowQrModal(true)}
                    className="w-full sm:w-auto px-4 py-2 bg-white hover:bg-slate-50 border border-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition duration-150 cursor-pointer shadow-xs flex items-center justify-center space-x-1.5"
                  >
                    <QrCode className="h-3.5 w-3.5 text-orange-500" />
                    <span>Show QR Code</span>
                  </button>
                </div>
              </div>
            )}

            {/* MESSAGE ROWS */}
            {messages.map((m) => {
              // System type
              if (m.senderId === 'system') {
                return (
                  <div key={m.id} className="flex justify-center my-1">
                    <span className="text-[10px] font-mono text-slate-400 bg-slate-50 px-3 py-1 rounded-full border border-slate-200/50 italic select-none">
                      {m.text}
                    </span>
                  </div>
                );
              }

              const isMe = m.senderId === myGuestId;
              const isPinned = m.isPinned;

              return (
                <div
                  key={m.id}
                  className={`group flex flex-col max-w-lg ${isMe ? 'ml-auto items-end animate-in slide-in-from-right-3 duration-200' : 'mr-auto items-start animate-in slide-in-from-left-3 duration-200'}`}
                >
                  {/* Sender nickname label */}
                  <div className="flex items-center space-x-1.5 mb-1 text-[11px] font-semibold text-slate-500">
                    <span className={isMe ? 'text-orange-600 font-bold' : 'text-slate-700'}>
                      {m.senderName} {isMe ? '(Me)' : ''}
                    </span>
                    {isPinned && (
                      <Pin className="h-3 w-3 text-orange-500 fill-orange-500 shrink-0" />
                    )}
                  </div>

                  {/* Message Bubble box */}
                  <div className="relative flex items-center space-x-2">
                    {/* Hover controls for pinning (only creator, can toggle pin) */}
                    {isCreatorOfRoom && !isMe && (
                      <button
                        type="button"
                        onClick={() => handleTogglePin(m.id, isPinned)}
                        className={`opacity-0 group-hover:opacity-100 p-1.5 rounded-lg border bg-white shadow-xs transition duration-150 cursor-pointer select-none ${
                          isPinned 
                            ? 'text-orange-600 border-orange-200 hover:bg-orange-50' 
                            : 'text-slate-400 border-slate-200 hover:bg-slate-50'
                        }`}
                        title={isPinned ? 'Unpin update' : 'Pin as important coordinate update'}
                        aria-label={isPinned ? "Unpin message from the top of the room" : "Pin message as an important update"}
                      >
                        <Pin className="h-3.5 w-3.5" />
                      </button>
                    )}

                    <div className={`p-3 md:p-3.5 rounded-2xl relative ${
                      m.isAction
                        ? 'bg-orange-50 border-2 border-orange-200/75 text-slate-bold shadow-xs border-l-4 border-l-orange-500'
                        : isMe
                          ? 'bg-slate-900 text-white rounded-2xl rounded-tr-none shadow-sm'
                          : 'bg-white border border-slate-100 text-slate-800 rounded-2xl rounded-tl-none shadow-sm'
                    }`}>
                      <p className="text-xs md:text-sm whitespace-pre-wrap leading-relaxed select-text">{m.text}</p>
                    </div>
                  </div>

                  {/* Timestamp label below message bubble */}
                  <span className="text-[10px] font-mono text-slate-400 mt-1 px-1 select-none">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' })}
                  </span>
                </div>
              );
            })}

            {/* Inline stream typing indicator bubble */}
            {Object.keys(activeTyping).length > 0 && (
              <div className="flex items-start space-x-3 text-sm animate-fade-in self-start max-w-[85%] py-2" id="chat-stream-typing-indicator-bubble">
                {/* Visual Placeholder avatar */}
                <div className="h-8 w-8 rounded-full border border-slate-200 bg-slate-50 flex items-center justify-center text-slate-400 shrink-0 select-none shadow-3xs">
                  <span className="font-sans text-[10px] uppercase font-bold tracking-tight text-slate-400 leading-none">...</span>
                </div>
                
                <div className="flex flex-col">
                  {/* Name label */}
                  <span className="text-[11px] font-sans font-medium text-slate-400 mb-1 leading-none">
                    {Object.values(activeTyping).join(' & ')} {Object.keys(activeTyping).length > 1 ? 'are typing' : 'is typing'}
                  </span>
                  
                  {/* Message bubble shape containing the bouncing dots */}
                  <div className="p-3 bg-slate-100/70 border border-slate-100 rounded-2xl rounded-tl-none shadow-3xs flex items-center space-x-1 w-16 justify-center">
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0ms', animationDuration: '0.6s' }}></span>
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '150ms', animationDuration: '0.6s' }}></span>
                    <span className="h-1.5 w-1.5 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '300ms', animationDuration: '0.6s' }}></span>
                  </div>
                </div>
              </div>
            )}

            <div ref={messageEndRef} />
          </div>

          {/* ACTIVE TYPING INDICATOR STATUS ROW */}
          <div className="h-6 px-4 flex items-center select-none" id="typing-indicator-bar">
            {Object.keys(activeTyping).length > 0 && (
              <p className="font-sans text-[10px] text-slate-400 font-medium animate-pulse flex items-center">
                <span className="flex space-x-0.5 mr-2">
                  <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce duration-300"></span>
                  <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce duration-300 delay-100"></span>
                  <span className="h-1 w-1 bg-slate-400 rounded-full animate-bounce duration-300 delay-200"></span>
                </span>
                <span>
                  {Object.values(activeTyping).join(', ')} {' '}
                  {Object.keys(activeTyping).length > 1 ? 'are typing...' : 'is typing...'}
                </span>
              </p>
            )}
          </div>

          {/* QUICK CHIP COORDINATION ACTION BAR */}
          <div className="px-4 py-2 bg-slate-50 border-t border-slate-200/70 shrink-0 shadow-inner flex space-x-2 overflow-x-auto select-none overflow-y-hidden" id="quick-action-bar-chips">
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider shrink-0 my-auto">Quick Status:</span>
            <button
              type="button"
              id="chip-coming"
              onClick={() => triggerQuickAction("🙋 Yes! Count me in. I'm coming.")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
              aria-label="Set status: Coming"
            >
              🙋 Coming
            </button>
            <button
              type="button"
              id="chip-late"
              onClick={() => triggerQuickAction("⏳ Running late, but on my way!")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
              aria-label="Set status: Late"
            >
              ⏳ Late
            </button>
            <button
              type="button"
              id="chip-here"
              onClick={() => triggerQuickAction("📍 I have arrived. Here now!")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
              aria-label="Set status: Arrived"
            >
              📍 Arrived
            </button>
            <button
              type="button"
              id="chip-missing"
              onClick={() => triggerQuickAction("❌ Sorry guys, can't make it to this run.")}
              className="px-3 py-1 bg-white hover:bg-slate-100 border border-slate-200 hover:border-slate-300 text-slate-700 rounded-full text-xs font-semibold whitespace-nowrap shrink-0 transition-all shadow-xs cursor-pointer active:scale-95"
              aria-label="Set status: Cancel"
            >
              ❌ Cancel
            </button>
          </div>

          {/* INPUT FORM BAR */}
          <footer className="p-4 bg-white border-t border-slate-100 shrink-0 select-none">
            <form onSubmit={handleSendMessage} className="flex space-x-3 items-center" id="form-msg-submit">
              <div className="flex-1 bg-slate-50 rounded-2xl border border-slate-100 px-4 py-2.5 flex items-center transition-all duration-250 focus-within:bg-white focus-within:border-orange-500/30 focus-within:ring-4 focus-within:ring-orange-500/5">
                <input
                  id={inputMessageId}
                  type="text"
                  disabled={timeRemaining.isExpired || connectionStatus !== 'connected'}
                  placeholder={timeRemaining.isExpired ? 'This Room has expired.' : 'Send a quick update...'}
                  maxLength={300}
                  value={inputText}
                  onChange={(e) => handleInputChange(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      if (inputText.trim() && connectionStatus === 'connected' && !timeRemaining.isExpired) {
                        const mockSubmitEvent = { preventDefault: () => {} } as React.FormEvent;
                        handleSendMessage(mockSubmitEvent);
                      }
                    }
                  }}
                  className="bg-transparent border-none focus:outline-none w-full text-sm text-slate-700"
                  aria-label="Message update text input"
                />
                
                {/* Elegant OS-specific shortkey prompt resembling Linear/Notion */}
                {!timeRemaining.isExpired && (
                  <div className="hidden md:flex items-center space-x-0.5 shrink-0 ml-2 text-[10px] uppercase font-mono text-slate-400 font-bold bg-white border border-slate-250/20 px-1.5 py-0.5 rounded-md select-none shadow-3xs">
                    <span>{metaKey}</span>
                    <span>+</span>
                    <span>⏎</span>
                  </div>
                )}
              </div>
              <button
                type="submit"
                id="btn-chat-send-submit"
                disabled={!inputText.trim() || connectionStatus !== 'connected' || timeRemaining.isExpired}
                className="h-11 w-11 bg-orange-500 hover:bg-orange-600 disabled:bg-slate-200 disabled:text-slate-400 text-white rounded-2xl flex items-center justify-center transition-all cursor-pointer shrink-0 active:scale-95"
                aria-label="Send message update"
              >
                <Send className="h-4.5 w-4.5" />
              </button>
            </form>
          </footer>
        </div>

      </div>

      {showQrModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 font-sans" id="qr-code-join-modal">
          {/* Backdrop with smooth blur */}
          <div 
            className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs transition-opacity cursor-pointer"
            onClick={() => setShowQrModal(false)}
            aria-hidden="true"
          ></div>
          
          {/* Modal Card */}
          <div className="relative bg-white rounded-3xl border border-slate-100 shadow-2xl p-6 max-w-md w-full space-y-5 text-center animate-in zoom-in-95 duration-150 z-10">
            {/* Header */}
            <div>
              <div className="h-10 w-10 bg-orange-50 rounded-full flex items-center justify-center mx-auto text-orange-500 mb-2">
                <QrCode className="h-5 w-5" />
              </div>
              <AnimatedHeading 
                text="Scan & Share Room" 
                className="font-sans font-bold text-slate-900 text-lg tracking-tight hover:text-orange-500 transition-colors"
              />
              <p className="text-slate-500 text-xs mt-1 leading-normal">
                Perfect for instant coordination. Scan on-screen or share direct invites with link + QR code pre-packaged.
              </p>
            </div>

            {/* QR Code Frame */}
            <div className="flex flex-col items-center justify-center bg-slate-50 border border-slate-100 p-4 rounded-2xl relative group">
              {qrCodeUrl ? (
                <div className="relative p-2.5 bg-white rounded-xl shadow-xs border border-slate-200">
                  <img 
                    src={qrCodeUrl} 
                    alt={`QR Code to join room ${roomId}`} 
                    className="h-36 w-36 object-contain"
                  />
                  {/* Subtle hover overlay */}
                  <div className="absolute inset-2.5 bg-orange-500/5 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none"></div>
                </div>
              ) : (
                <div className="h-36 w-36 rounded-xl bg-slate-200 animate-pulse flex items-center justify-center text-xs text-slate-400">
                  Generating QR...
                </div>
              )}
              
              <div className="mt-3 flex items-center space-x-1.5 bg-white px-3 py-1 rounded-full border border-slate-200 shadow-2xs">
                <span className="font-mono text-xs font-bold text-slate-500">Access ID:</span>
                <span className="font-mono text-xs font-extrabold text-orange-600 bg-orange-50 px-1.5 py-0.5 rounded-md">
                  {roomId?.toUpperCase()}
                </span>
              </div>
            </div>

            {/* Direct Package Share Zone */}
            <div className="space-y-2 text-left bg-slate-50/80 border border-slate-100 p-3 rounded-2xl">
              <div className="flex items-center justify-between">
                <span className="text-[9px] font-bold text-slate-450 uppercase tracking-wider block">
                  Interactive Package Share
                </span>
                {shareSuccess && (
                  <span className="text-[9px] font-bold text-emerald-600 animate-pulse">
                    ✓ {shareSuccess}
                  </span>
                )}
              </div>
              
              <div className="grid grid-cols-2 gap-2">
                <button
                  type="button"
                  onClick={handleShareNative}
                  className="bg-white hover:bg-slate-100 hover:border-slate-350 text-slate-700 hover:text-slate-900 border border-slate-200 py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-95"
                  title="Share complete link and QR package directly via system channels"
                >
                  <Share2 className="h-3.5 w-3.5 text-orange-500" />
                  <span>Device Share</span>
                </button>
                <button
                  type="button"
                  onClick={handleDownloadQr}
                  className="bg-white hover:bg-slate-100 hover:border-slate-350 text-slate-700 hover:text-slate-900 border border-slate-200 py-2.5 px-3 rounded-xl flex items-center justify-center space-x-1.5 text-[10px] font-bold uppercase tracking-wider transition-all shadow-3xs cursor-pointer active:scale-95"
                  title="Download the QR Code image to your storage"
                >
                  <Download className="h-3.5 w-3.5 text-slate-500" />
                  <span>Save QR image</span>
                </button>
              </div>
            </div>

            {/* Social Channels Row */}
            <div className="space-y-2 text-left">
              <span className="text-[9px] font-bold text-slate-400 uppercase tracking-wilder block px-1">
                Direct Invite to Socials
              </span>
              <div className="grid grid-cols-4 gap-2">
                <button
                  type="button"
                  onClick={() => handleSocialShare('whatsapp')}
                  className="bg-emerald-50 hover:bg-emerald-100/90 border border-emerald-100/50 text-emerald-800 py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 active:scale-95"
                  title="Share invitation package to WhatsApp"
                >
                  <span className="text-[10px] font-bold">WhatsApp</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialShare('twitter')}
                  className="bg-slate-950 hover:bg-slate-900 border border-slate-900 text-white py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 active:scale-95"
                  title="Share invitation package on X / Twitter"
                >
                  <span className="text-[10px] font-bold text-slate-100">Twitter (X)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialShare('telegram')}
                  className="bg-sky-50 hover:bg-sky-100/90 border border-sky-100/50 text-sky-800 py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 active:scale-95"
                  title="Share invitation package on Telegram"
                >
                  <span className="text-[10px] font-bold">Telegram</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSocialShare('email')}
                  className="bg-orange-50 hover:bg-orange-100/90 border border-orange-150 text-orange-950 py-2 px-1.5 rounded-xl text-center transition-all cursor-pointer flex flex-col items-center justify-center space-y-1 active:scale-95"
                  title="Email invitation package to team"
                >
                  <span className="text-[10px] font-bold">Email</span>
                </button>
              </div>
            </div>

            {/* Direct Copy & Close button group */}
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                id="modal-btn-copy-link"
                onClick={handleCopyCode}
                className="w-full bg-slate-50 hover:bg-slate-100 text-slate-700 hover:text-slate-950 font-bold text-[10px] uppercase tracking-wide py-3 px-3 rounded-xl transition duration-150 cursor-pointer flex items-center justify-center space-x-1.5 border border-slate-200"
              >
                {copied ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 font-bold" />
                    <span>Copied Code!</span>
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5 text-slate-400" />
                    <span>Copy Link</span>
                  </>
                )}
              </button>
              
              <button
                type="button"
                id="modal-btn-close"
                onClick={() => setShowQrModal(false)}
                className="w-full bg-orange-600 hover:bg-orange-700 active:bg-orange-850 text-white font-bold text-[10px] uppercase tracking-wide py-3 px-3 rounded-xl transition duration-150 cursor-pointer text-center"
              >
                Close View
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
