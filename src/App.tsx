import { useState, useEffect, useRef } from 'react';
import Homepage from './components/Homepage.js';
import RoomPage from './components/RoomPage.js';
import NicknameModal from './components/NicknameModal.js';
import { NotificationModal } from './components/NotificationModal.js';
import { getOrCreateGuestId, addRecentRoom } from './utils.js';

function getRoomIdFromUrl(): string | null {
  // 1. Check window.location.hash formats (e.g. #/room/ABCD12)
  const hash = window.location.hash;
  const hashMatch = hash.match(/^#\/room\/([A-Z0-9]{6})$/i);
  if (hashMatch) {
    return hashMatch[1].toUpperCase();
  }

  // 2. Check window.location.pathname formats (e.g. /r/ABCD12)
  const path = window.location.pathname;
  const pathMatch = path.match(/^\/r\/([A-Z0-9]{6})$/i);
  if (pathMatch) {
    return pathMatch[1].toUpperCase();
  }

  return null;
}

export default function App() {
  const [currentRoomId, setCurrentRoomId] = useState<string | null>(null);
  const [myGuestId] = useState(() => getOrCreateGuestId());
  const [myNickname, setMyNickname] = useState<string>(() => {
    return localStorage.getItem('pulseroom_nickname') || '';
  });
  
  const [showNicknameModal, setShowNicknameModal] = useState(false);
  const [roomTitlePreview, setRoomTitlePreview] = useState('New Session');
  const [roomLocationPreview, setRoomLocationPreview] = useState<string | undefined>(undefined);
  const [isLoading, setIsLoading] = useState(false);
  const [feedbackError, setFeedbackError] = useState('');
  const isFirstSyncRef = useRef(true);

  // Handle Synchronized Routing on load and on URL actions
  const syncRoute = () => {
    const rId = getRoomIdFromUrl();
    if (rId) {
      setCurrentRoomId(rId);
      // Fetch some preview data about room first safely
      fetch(`/api/rooms/${rId}`)
        .then((res) => {
          if (res.ok) {
            return res.json();
          }
          throw new Error('NotFound');
        })
        .then((roomData) => {
          setRoomTitlePreview(roomData.title);
          setRoomLocationPreview(roomData.location);
          
          // Save to user's recent rooms history
          addRecentRoom(roomData.id, roomData.title, roomData.location);
          
          const savedNick = localStorage.getItem('pulseroom_nickname');
          if (!savedNick) {
            setShowNicknameModal(true);
          }
        })
        .catch(() => {
          // If room doesn't exist, remove route cleanly
          if (!isFirstSyncRef.current) {
            setFeedbackError('Invalid or expired Room ID requested.');
          }
          handleExit();
        })
        .finally(() => {
          isFirstSyncRef.current = false;
        });
    } else {
      setCurrentRoomId(null);
      isFirstSyncRef.current = false;
    }
  };

  useEffect(() => {
    syncRoute();

    window.addEventListener('hashchange', syncRoute);
    window.addEventListener('popstate', syncRoute);
    
    return () => {
      window.removeEventListener('hashchange', syncRoute);
      window.removeEventListener('popstate', syncRoute);
    };
  }, []);

  const handleCreateRoom = async (roomData: {
    title: string;
    description: string;
    durationMinutes: number;
    location: string;
    participantLimit?: number;
  }) => {
    setIsLoading(true);
    setFeedbackError('');
    try {
      const response = await fetch('/api/rooms', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          ...roomData,
          createdBy: myGuestId,
        }),
      });

      const data = await response.json();
      if (response.ok) {
        setIsLoading(false);
        // Pre-fill nickname if they haven't chosen one
        const nickToUse = myNickname || 'Host';
        if (!myNickname) {
          setMyNickname(nickToUse);
          localStorage.setItem('pulseroom_nickname', nickToUse);
        }
        
        // Update URL hash to trigger syncRoute
        window.location.hash = `#/room/${data.id}`;
      } else {
        setFeedbackError(data.error || 'Failed to create room.');
        setIsLoading(false);
      }
    } catch (err) {
      console.error('Error creating room:', err);
      setFeedbackError('Failed to establish contact with backend server.');
      setIsLoading(false);
    }
  };

  const handleJoinRequested = (rId: string) => {
    // Navigate using hash to trigger rendering
    window.location.hash = `#/room/${rId}`;
  };

  const handleConfirmNickname = (newNick: string) => {
    setMyNickname(newNick);
    localStorage.setItem('pulseroom_nickname', newNick);
    setShowNicknameModal(false);
  };

  const handleExit = () => {
    // Reset to base and clear hash path cleanly
    window.location.hash = '#/';
    window.history.pushState({}, '', '/');
    setCurrentRoomId(null);
    setShowNicknameModal(false);
  };

  return (
    <div className="min-h-dvh text-slate-900 bg-slate-50 select-none">
      <NotificationModal
        isOpen={!!feedbackError}
        message={feedbackError}
        title={feedbackError.toLowerCase().includes('expired') || feedbackError.toLowerCase().includes('invalid') ? "Access Rejected" : "System Notification"}
        onClose={() => setFeedbackError('')}
      />

      {currentRoomId && myNickname && !showNicknameModal ? (
        <RoomPage
          roomId={currentRoomId}
          myGuestId={myGuestId}
          myNickname={myNickname}
          onExit={handleExit}
        />
      ) : (
        <Homepage
          onCreateRoom={handleCreateRoom}
          onJoinRoom={handleJoinRequested}
          isLoading={isLoading}
        />
      )}

      {/* Trigger Modal requesting Guest Handle if join doesn't have nickname yet */}
      {showNicknameModal && (
        <NicknameModal
          title={roomTitlePreview}
          location={roomLocationPreview}
          onConfirm={handleConfirmNickname}
          onCancel={handleExit}
        />
      )}
    </div>
  );
}
