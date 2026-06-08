// Client side helper functions

// Generate a random 6-character nickname for instantaneous low-friction onboarding
const ADJECTIVES = [
  'Swift', 'Nimble', 'Bold', 'Bright', 'Golden', 'Silver', 'Cosmic', 'Wild', 'Chill', 'Silent',
  'Candid', 'Sleek', 'Daring', 'Zen', 'Steady', 'Active', 'Epic', 'Turbo', 'Frosty', 'Flash'
];
const NOUNS = [
  'Rider', 'Runner', 'Panda', 'Tiger', 'Eagle', 'Falcon', 'Player', 'Striker', 'Shadow', 'Beacon',
  'Comet', 'Vortex', 'Skaters', 'Keeper', 'Rover', 'Hunter', 'Pacer', 'Spike', 'Whiz', 'Guru'
];

export function generateRandomNickname(): string {
  const adj = ADJECTIVES[Math.floor(Math.random() * ADJECTIVES.length)];
  const noun = NOUNS[Math.floor(Math.random() * NOUNS.length)];
  const num = Math.floor(Math.random() * 90) + 10;
  return `${adj}${noun}${num}`;
}

// Generate or retrieve guestId for anonymous tracking
export function getOrCreateGuestId(): string {
  let guestId = localStorage.getItem('pulseroom_guest_id');
  if (!guestId) {
    guestId = 'guest-' + Math.random().toString(36).substr(2, 9);
    localStorage.setItem('pulseroom_guest_id', guestId);
  }
  return guestId;
}

// Format duration into readable timer
export function formatTimeRemaining(expiresAt: number): {
  text: string;
  isExpiringSoon: boolean;
  isExpired: boolean;
} {
  const diff = expiresAt - Date.now();
  if (diff <= 0) {
    return { text: 'Expired', isExpiringSoon: false, isExpired: true };
  }

  const secs = Math.floor(diff / 1000);
  const mins = Math.floor(secs / 60);
  const hours = Math.floor(mins / 60);

  const displaySecs = secs % 60;
  const displayMins = mins % 60;

  if (hours > 0) {
    return {
      text: `${hours}h ${displayMins}m`,
      isExpiringSoon: hours === 0 && displayMins <= 15,
      isExpired: false,
    };
  }

  if (mins > 0) {
    return {
      text: `${mins}m ${displaySecs}s`,
      isExpiringSoon: mins <= 10,
      isExpired: false,
    };
  }

  return {
    text: `${secs}s`,
    isExpiringSoon: true,
    isExpired: false,
  };
}

// Request and toggle Browser Notifications
export async function requestNotificationPermission(): Promise<boolean> {
  if (!('Notification' in window)) {
    return false;
  }
  if (Notification.permission === 'granted') {
    return true;
  }
  if (Notification.permission !== 'denied') {
    const perm = await Notification.requestPermission();
    return perm === 'granted';
  }
  return false;
}

// Play subtle message notification sound using Web Audio API to avoid secondary dependencies
export function playNotificationSound() {
  try {
    const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
    
    // Create oscillator nodes
    const osc = audioCtx.createOscillator();
    const gainNode = audioCtx.createGain();
    
    osc.type = 'sine';
    // Friendly, crisp notification dual frequency
    osc.frequency.setValueAtTime(523.25, audioCtx.currentTime); // C5
    osc.frequency.setValueAtTime(659.25, audioCtx.currentTime + 0.08); // E5
    
    gainNode.gain.setValueAtTime(0, audioCtx.currentTime);
    gainNode.gain.linearRampToValueAtTime(0.12, audioCtx.currentTime + 0.02);
    gainNode.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + 0.25);
    
    osc.connect(gainNode);
    gainNode.connect(audioCtx.destination);
    
    osc.start();
    osc.stop(audioCtx.currentTime + 0.3);
  } catch (err) {
    // Audio context may be blocked by user interaction requirements
  }
}

export type PlatformOS = 'macOS' | 'iOS' | 'Windows' | 'Android' | 'Linux' | 'Web';

export function getPlatformOS(): PlatformOS {
  if (typeof window === 'undefined' || !window.navigator) return 'Web';
  const ua = window.navigator.userAgent.toLowerCase();
  
  // iOS detection
  if (/ipad|iphone|ipod/.test(ua)) {
    return 'iOS';
  }
  // Android detection
  if (/android/.test(ua)) {
    return 'Android';
  }
  // macOS detection (taking into account iPads masking as Macintosh)
  if (/macintosh|mac os x/.test(ua)) {
    if (window.navigator.maxTouchPoints && window.navigator.maxTouchPoints > 1) {
      return 'iOS';
    }
    return 'macOS';
  }
  // Windows detection
  if (/windows/.test(ua)) {
    return 'Windows';
  }
  // Linux detection
  if (/linux/.test(ua)) {
    return 'Linux';
  }
  return 'Web';
}

export function isAppleDevice(): boolean {
  const os = getPlatformOS();
  return os === 'macOS' || os === 'iOS';
}

export function getPlatformMetaKeyLabel(): string {
  return isAppleDevice() ? '⌘' : 'Ctrl';
}

export function getPlatformMetaKeyName(): string {
  return isAppleDevice() ? 'Command' : 'Control';
}

export interface RecentRoom {
  id: string;
  title: string;
  location?: string;
  timestamp: number;
}

export function getRecentRooms(): RecentRoom[] {
  if (typeof window === 'undefined') return [];
  try {
    const raw = localStorage.getItem('dropin_recent_rooms');
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (Array.isArray(parsed)) {
      return parsed.sort((a, b) => b.timestamp - a.timestamp);
    }
  } catch (err) {
    console.error('Error parsing recent rooms', err);
  }
  return [];
}

export function addRecentRoom(id: string, title: string, location?: string) {
  if (typeof window === 'undefined') return;
  try {
    const list = getRecentRooms();
    const cleanId = id.toUpperCase();
    const updated = list.filter((r) => r.id.toUpperCase() !== cleanId);
    updated.unshift({
      id: cleanId,
      title: title || 'DropIn Session',
      location: location,
      timestamp: Date.now(),
    });
    // Limit to latest 12 entries
    const limited = updated.slice(0, 12);
    localStorage.setItem('dropin_recent_rooms', JSON.stringify(limited));
  } catch (err) {
    console.error('Error saving recent room', err);
  }
}


