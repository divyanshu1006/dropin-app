export interface Room {
  id: string;
  title: string;
  description?: string;
  createdAt: number;
  expiresAt: number;
  location?: string;
  participantLimit?: number;
  createdBy: string; // guestId of creator
}

export interface Participant {
  guestId: string;
  nickname: string;
  joinedAt: number;
  lastActiveAt: number;
  isCreator: boolean;
}

export interface Message {
  id: string;
  roomId: string;
  senderId: string;
  senderName: string;
  text: string;
  timestamp: number;
  isPinned: boolean;
  isAction: boolean;
}

export interface RoomState {
  room: Room;
  participants: Participant[];
  messages: Message[];
}

export type SocketMessage =
  | { type: 'join'; roomId: string; guestId: string; nickname: string }
  | { type: 'leave'; roomId: string; guestId: string }
  | { type: 'send_message'; roomId: string; text: string; isAction?: boolean }
  | { type: 'pin_message'; roomId: string; messageId: string; pin: boolean }
  | { type: 'ban_participant'; roomId: string; guestId: string }
  | { type: 'update_room'; roomId: string; updates: Partial<Room> }
  | { type: 'typing'; roomId: string; guestId: string; nickname: string; isTyping: boolean };

export type SocketEvent =
  | { type: 'room_state'; state: RoomState }
  | { type: 'user_joined'; participant: Participant }
  | { type: 'user_left'; guestId: string; nickname: string }
  | { type: 'new_message'; message: Message }
  | { type: 'message_pinned'; messageId: string; isPinned: boolean }
  | { type: 'participant_banned'; guestId: string }
  | { type: 'room_updated'; room: Room }
  | { type: 'typing_users'; typing: { [guestId: string]: string } }
  | { type: 'error'; message: string };
