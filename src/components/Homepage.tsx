import React, { useState, useId, useRef, useEffect } from 'react';
import { Sparkles, Navigation, Clock, Users, ArrowRight, Shield, Zap, Flame, MapPin, Calendar, HelpCircle, Heart, Star, Check, HelpCircle as HelpIcon, Lock, Mail, User, LogOut, History, ChevronDown } from 'lucide-react';
import { generateRandomNickname, getPlatformOS, getPlatformMetaKeyLabel, getPlatformMetaKeyName, getRecentRooms, RecentRoom } from '../utils.js';
import { AnimatedHeading } from './AnimatedHeading.js';
import { motion, AnimatePresence } from 'motion/react';

interface HomepageProps {
  onCreateRoom: (roomData: {
    title: string;
    description: string;
    durationMinutes: number;
    location: string;
    participantLimit?: number;
  }) => void;
  onJoinRoom: (roomId: string) => void;
  isLoading: boolean;
}

export default function Homepage({ onCreateRoom, onJoinRoom, isLoading }: HomepageProps) {
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [duration, setDuration] = useState('180'); // default 3 hours
  const [location, setLocation] = useState('');
  const [participantLimit, setParticipantLimit] = useState('');
  const [inputRoomId, setInputRoomId] = useState('');
  const [errorRoomId, setErrorRoomId] = useState('');

  // Signup statuses and simulated authentication persistence
  const [isSignedUp, setIsSignedUp] = useState(() => {
    return localStorage.getItem('dropin_is_logged_in') === 'true';
  });
  const [profileName, setProfileName] = useState(() => {
    return localStorage.getItem('dropin_username') || '';
  });
  const [profileEmail, setProfileEmail] = useState(() => {
    return localStorage.getItem('dropin_email') || '';
  });

  const [showSignupModal, setShowSignupModal] = useState(false);
  const [signupName, setSignupName] = useState('');
  const [signupEmail, setSignupEmail] = useState('');
  const [signupPassword, setSignupPassword] = useState('');
  const [signupError, setSignupError] = useState('');

  // Auto-adapt according to the platform the site is opened on
  const [platformOS, setPlatformOS] = useState<'macOS' | 'iOS' | 'Windows' | 'Android' | 'Linux' | 'Web'>('Web');
  const [metaKey, setMetaKey] = useState('Ctrl');

  // Recently Visited Rooms States
  const [recentRooms, setRecentRooms] = useState<RecentRoom[]>([]);
  const [showMyRoomsDropdown, setShowMyRoomsDropdown] = useState(false);

  // Re-read storage on initial mount and when changes occur
  useEffect(() => {
    setPlatformOS(getPlatformOS());
    setMetaKey(getPlatformMetaKeyLabel());
    setRecentRooms(getRecentRooms());
  }, []);

  // 3D Tilt Interaction State for the interactive workspace card
  const [creatorTilt, setCreatorTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const handleCreatorMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -12; // Max 12 deg vertical tilt
    const rotateY = ((x - centerX) / centerX) * 12;  // Max 12 deg horizontal tilt
    setCreatorTilt({ rotateX, rotateY, scale: 1.025 });
  };
  const handleCreatorMouseLeave = () => {
    setCreatorTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  };

  // 3D Tilt Interaction State for the dark live preview console card
  const [simTilt, setSimTilt] = useState({ rotateX: 0, rotateY: 0, scale: 1 });
  const handleSimMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    const card = e.currentTarget;
    const rect = card.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    const centerX = rect.width / 2;
    const centerY = rect.height / 2;
    const rotateX = ((y - centerY) / centerY) * -10; // Max 10 deg vertical tilt
    const rotateY = ((x - centerX) / centerX) * 10;  // Max 10 deg horizontal tilt
    setSimTilt({ rotateX, rotateY, scale: 1.025 });
  };
  const handleSimMouseLeave = () => {
    setSimTilt({ rotateX: 0, rotateY: 0, scale: 1 });
  };

  // Temporary action queue for execution immediately post-registration
  const [pendingAction, setPendingAction] = useState<{
    type: 'create_room' | 'test_chip';
    data?: any;
  } | null>(null);

  const [activeTab, setActiveTab] = useState<'create' | 'join'>('create');
  const [hoveredNav, setHoveredNav] = useState<string | null>(null);

  // Hero refs for smooth scroll
  const workspaceRef = useRef<HTMLDivElement | null>(null);

  const topicId = useId();
  const descId = useId();
  const timeId = useId();
  const locId = useId();
  const limitId = useId();

  // Category showcase definitions spanning from professional to fun
  const showcaseCategories = {
    standup: {
      title: '💼 Staff Sync & Retrospective',
      activeCount: 6,
      timeLeft: '1h 12m',
      pinText: 'Review client website assets and finish staging PR approvals.',
      pinLoc: 'Meeting Room 4B / Zoom Video',
      pinTime: 'Starts at 10:30 AM',
      messages: [
        { sender: 'Sarah', text: 'Finished compiling the Figma project mocks & style charts!', initial: 'S', color: 'bg-indigo-500/20 text-indigo-300' },
        { sender: 'Ken_33', text: 'Running 5 mins late, wrapping up staging validation.', initial: 'K', color: 'bg-emerald-500/20 text-emerald-300' },
        { sender: 'Aman', text: 'Staging build looks perfect. Ready for your review.', initial: 'A', color: 'bg-sky-500/20 text-sky-300' }
      ],
      chips: [
        "✅ Reviewed, looks clean!",
        "⏳ Let me finish compiling",
        "🚨 Need team assistance"
      ]
    },
    lunch: {
      title: '🍔 Office Friday Lunch',
      activeCount: 8,
      timeLeft: '2h 10m',
      pinText: 'Securing the back table with large lounge seating.',
      pinLoc: 'Downtown Food Court Arena',
      pinTime: 'Seating at 1:15 PM',
      messages: [
        { sender: 'Rohit', text: 'Can anyone arrive 10 mins early to grab the back couches?', initial: 'R', color: 'bg-emerald-500/20 text-emerald-300' },
        { sender: 'Lisa', text: 'Walking over now. I am ordering vegan salad options.', initial: 'L', color: 'bg-pink-500/20 text-pink-300' },
        { sender: 'Ken_33', text: 'Stuck in customer emergency call, count me out for today!', initial: 'K', color: 'bg-rose-500/20 text-rose-300' }
      ],
      chips: [
        "🙋 I'm coming! Save me seat",
        "📝 Order a pepperoni pizza",
        "❌ Cant make it, too busy"
      ]
    },
    gaming: {
      title: '🎮 Tournament Lobby: Valorant/Apex',
      activeCount: 16,
      timeLeft: '4h 15m',
      pinText: 'Meet at gaming lane 4 with all mechanical accessories.',
      pinLoc: 'Ares Cyber Arcade Stall 3',
      pinTime: 'Lobby launches at 8:00 PM',
      messages: [
        { sender: 'Zack', text: 'I brought two extra mechanical keyboards and a switch hub', initial: 'Z', color: 'bg-purple-500/20 text-purple-300' },
        { sender: 'DIV_27', text: 'Installing the latest 3.1 patch on my machine right now', initial: 'D', color: 'bg-orange-500/20 text-orange-300' },
        { sender: 'Aman', text: 'We still need one solid support or duelist to fill', initial: 'A', color: 'bg-sky-500/20 text-sky-300' }
      ],
      chips: [
        "⚡ Ready to roll, count me on!",
        "🚗 Driving key accessories over",
        "🛑 Lobby is full!"
      ]
    },
    sports: {
      title: '🏏 Cricket near Sector 15',
      activeCount: 14,
      timeLeft: '2h 14m',
      pinText: 'Need 2 more players for full side match',
      pinLoc: 'DAV School Ground',
      pinTime: 'Match begins at 5:00 PM',
      messages: [
        { sender: 'Rohit', text: 'I can bring professional stumps and extra tennis balls', initial: 'R', color: 'bg-emerald-500/20 text-emerald-300' },
        { sender: 'DIV_27', text: 'Driving there, traffic is heavy today near Sector 15', initial: 'D', color: 'bg-orange-500/20 text-orange-300' },
        { sender: 'Aman', text: 'We need one player to bowl opening spin', initial: 'A', color: 'bg-sky-500/20 text-sky-300' }
      ],
      chips: [
        "🙋 Yes! Count me in. coming.",
        "🚗 Need campus ride",
        "🛑 Slot Full!"
      ]
    }
  };

  const [selectedCategory, setSelectedCategory] = useState<'standup' | 'lunch' | 'gaming' | 'sports'>('standup');
  const [appendedMessages, setAppendedMessages] = useState<Record<'standup' | 'lunch' | 'gaming' | 'sports', any[]>>({
    standup: [],
    lunch: [],
    gaming: [],
    sports: []
  });

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    setSignupError('');

    if (!signupName.trim()) {
      setSignupError('Please enter a valid display name.');
      return;
    }
    if (!signupEmail.trim() || !signupEmail.includes('@')) {
      setSignupError('Please provide a valid email address.');
      return;
    }
    if (signupPassword.length < 4) {
      setSignupError('Password must be at least 4 characters.');
      return;
    }

    const finalName = signupName.trim();
    localStorage.setItem('dropin_username', finalName);
    localStorage.setItem('dropin_email', signupEmail.trim());
    localStorage.setItem('dropin_is_logged_in', 'true');
    localStorage.setItem('pulseroom_nickname', finalName);

    setIsSignedUp(true);
    setProfileName(finalName);
    setProfileEmail(signupEmail.trim());
    setShowSignupModal(false);

    setSignupName('');
    setSignupEmail('');
    setSignupPassword('');

    // Flush queued actions
    if (pendingAction) {
      if (pendingAction.type === 'create_room') {
        onCreateRoom(pendingAction.data);
      } else if (pendingAction.type === 'test_chip') {
        const text = pendingAction.data;
        const initialChar = finalName.charAt(0).toUpperCase();
        setAppendedMessages((prev) => ({
          ...prev,
          [selectedCategory]: [
            ...prev[selectedCategory],
            { 
              sender: `${finalName} (You)`, 
              text, 
              initial: initialChar, 
              color: 'bg-orange-500/20 text-orange-200 border border-orange-500/20 font-bold' 
            }
          ]
        }));
      }
      setPendingAction(null);
    }
  };

  const handleSignOut = () => {
    localStorage.removeItem('dropin_is_logged_in');
    localStorage.removeItem('dropin_username');
    localStorage.removeItem('dropin_email');
    localStorage.removeItem('pulseroom_nickname');
    setIsSignedUp(false);
    setProfileName('');
    setProfileEmail('');
    setPendingAction(null);
  };

  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;
    
    const roomPayload = {
      title: title.trim(),
      description: description.trim(),
      durationMinutes: parseInt(duration, 10),
      location: location.trim(),
      participantLimit: participantLimit ? parseInt(participantLimit, 10) : undefined,
    };

    onCreateRoom(roomPayload);
  };

  const handleJoinSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const cleanId = inputRoomId.trim().toUpperCase();
    if (!cleanId) return;

    if (cleanId.length !== 6) {
      setErrorRoomId('Room code must be exactly 6 characters.');
      return;
    }
    
    setErrorRoomId('');
    onJoinRoom(cleanId);
  };

  const scrollToWorkspace = (tab: 'create' | 'join') => {
    setActiveTab(tab);
    workspaceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  };

  const triggerMockAction = (text: string) => {
    if (!isSignedUp) {
      setPendingAction({
        type: 'test_chip',
        data: text,
      });
      setShowSignupModal(true);
      return;
    }

    if (appendedMessages[selectedCategory].length > 0) return; // limit to 1 test reply
    const initialChar = profileName ? profileName.trim().charAt(0).toUpperCase() : 'U';
    setAppendedMessages(prev => ({
      ...prev,
      [selectedCategory]: [
        ...prev[selectedCategory],
        { 
          sender: `${profileName} (You)`, 
          text, 
          initial: initialChar, 
          color: 'bg-orange-500/20 text-orange-200 border border-orange-500/20 font-bold' 
        }
      ]
    }));
  };

  const sampleRooms = [
    { title: '💼 Urgent Deployment Standup', duration: '15 mins left', code: 'SINK33', host: 'Marcus', active: 4, loc: 'Office Meeting Room B' },
    { title: '🍔 Friday Team Lunch Delivery', duration: '120 mins left', code: 'LUNCH2', host: 'Elena', active: 8, loc: 'Downtown Food Plaza' },
    { title: '🎮 LAN Tournament: Apex Legends', duration: '180 mins left', code: 'LANP66', host: 'Sera', active: 14, loc: 'Ares Cyber Arcade' },
    { title: '🏏 Cricket near Sector 15', duration: '240 mins left', code: 'MATCH9', host: 'Aman', active: 5, loc: 'DAV School Ground' }
  ];

  return (
    <div className="min-h-dvh bg-slate-50 flex flex-col items-center">
      
      {/* HEADER NAVBAR (Translucent Apple-inspired Sticky Top bar with modern interactive indicator and motion enhancements) */}
      <motion.header 
        initial={{ opacity: 0, y: -16 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ type: 'spring', stiffness: 260, damping: 20 }}
        className="sticky top-0 w-full bg-white/75 backdrop-blur-xl border-b border-slate-200/40 px-6 md:px-8 py-3.5 flex items-center justify-between z-40 transition-all duration-350" 
        id="app-header"
      >
        <div className="w-full max-w-7xl mx-auto flex items-center justify-between">
          
          {/* Logo element with interactive spring bounce and active indicator bubble */}
          <motion.div 
            className="flex items-center space-x-3 cursor-pointer select-none group"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            whileHover={{ scale: 1.015 }}
            whileTap={{ scale: 0.985 }}
          >
            <motion.div 
              className="h-8 w-8 rounded-xl bg-gradient-to-tr from-orange-500 to-amber-500 flex items-center justify-center shadow-sm relative overflow-hidden"
              whileHover={{ rotate: [0, -8, 8, 0] }}
              transition={{ duration: 0.45 }}
            >
              <div className="absolute inset-0 bg-white/10 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
              <span className="text-white font-black text-sm font-sans leading-none">d</span>
            </motion.div>
            <div className="flex flex-col text-left">
              <span className="font-sans font-extrabold text-base tracking-tight text-slate-900 group-hover:text-orange-550 transition-colors duration-250 leading-none">DropIn</span>
              <span className="text-[9px] font-mono font-bold text-orange-500 flex items-center space-x-1 mt-0.5 select-none tracking-wide">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse inline-block shrink-0"></span>
                <span>Active Coordinator</span>
              </span>
            </div>
          </motion.div>
          
          {/* Responsive navigation bar with sliding absolute element hover tracer */}
          <nav 
            className="hidden md:flex items-center space-x-1 p-0.5 bg-slate-100/50 rounded-xl border border-slate-200/30 relative"
            onMouseLeave={() => setHoveredNav(null)}
          >
            {[
              { id: 'features', label: 'Features', action: () => scrollToWorkspace('create') },
              { id: 'usecases', label: 'Use Cases', action: () => scrollToWorkspace('join') },
              { id: 'pricing', label: 'Pricing', action: () => scrollToWorkspace('create') },
              { id: 'about', label: 'About', action: () => scrollToWorkspace('create') },
            ].map((tab) => (
              <button
                key={tab.id}
                type="button"
                onMouseEnter={() => setHoveredNav(tab.id)}
                onClick={tab.action}
                className="relative px-4 py-1.5 text-xs font-bold transition-colors duration-200 text-slate-500 hover:text-slate-900 cursor-pointer select-none rounded-lg"
              >
                {hoveredNav === tab.id && (
                  <motion.span
                    layoutId="nav-pill-bg"
                    className="absolute inset-0 bg-white shadow-3xs border border-slate-200/30 rounded-lg -z-1"
                    transition={{ type: 'spring', stiffness: 350, damping: 28 }}
                  />
                )}
                <span className="relative z-10">{tab.label}</span>
              </button>
            ))}
          </nav>

          {/* Identity & Actions Container */}
          <div className="flex items-center space-x-3">
            {isSignedUp && (
              <div className="relative" id="my-rooms-dropdown-container">
                <button
                  type="button"
                  id="btn-my-rooms-header"
                  onMouseEnter={() => {
                    setRecentRooms(getRecentRooms());
                    setShowMyRoomsDropdown(true);
                  }}
                  onClick={() => {
                    setRecentRooms(getRecentRooms());
                    setShowMyRoomsDropdown(!showMyRoomsDropdown);
                  }}
                  className="px-3 py-1.5 bg-slate-100/70 hover:bg-slate-200/90 text-slate-800 rounded-lg flex items-center space-x-1.5 font-sans font-bold text-xs cursor-pointer transition-all active:scale-95 shadow-3xs border border-slate-200/30"
                  aria-label="Display my recent coordination spaces"
                >
                  <History className="h-3.5 w-3.5 text-orange-500 animate-[spin_4s_linear_infinite]" />
                  <span className="hidden sm:inline">My Rooms</span>
                  <ChevronDown className={`h-3 w-3 text-slate-400 transition-transform duration-250 ${showMyRoomsDropdown ? 'rotate-180' : ''}`} />
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
                        className="absolute right-0 mt-2.5 w-76 bg-white/75 backdrop-blur-xl rounded-2xl border border-slate-200/40 shadow-2xl p-3 z-50 text-left overflow-hidden"
                      >
                        <div className="flex items-center justify-between px-2 pb-2 border-b border-slate-100 mb-2 select-none">
                          <span className="text-[10px] font-extrabold text-slate-450 uppercase tracking-widest font-sans">Recently Visited</span>
                          <span className="text-[9px] bg-orange-50 text-orange-600 border border-orange-100/50 px-1.5 py-0.5 rounded-md font-bold font-mono">
                            {recentRooms.length} Total
                          </span>
                        </div>

                        {recentRooms.length > 0 ? (
                          <div className="max-h-60 overflow-y-auto space-y-1 pr-1 bg-transparent" id="recent-rooms-header-list">
                            {recentRooms.map((r, index) => (
                              <motion.button
                                key={r.id}
                                type="button"
                                initial={{ opacity: 0, x: -6 }}
                                animate={{ opacity: 1, x: 0 }}
                                transition={{ delay: index * 0.03, duration: 0.2 }}
                                onClick={() => {
                                  onJoinRoom(r.id);
                                  setShowMyRoomsDropdown(false);
                                }}
                                className="w-full text-left p-2.5 hover:bg-slate-50 border border-transparent hover:border-slate-150/40 rounded-xl transition-all flex items-start space-x-2.5 cursor-pointer group"
                              >
                                <div className="h-8 w-8 rounded-lg bg-orange-50 text-orange-600 flex items-center justify-center shrink-0 uppercase font-bold text-[10px] font-mono border border-orange-100/30 group-hover:scale-105 transition-transform">
                                  {r.id.slice(0, 2)}
                                </div>
                                <div className="min-w-0 flex-1">
                                  <div className="flex items-center justify-between">
                                    <span className="text-xs font-extrabold text-slate-800 truncate block group-hover:text-orange-600 transition-colors">
                                      {r.title}
                                    </span>
                                    <span className="text-[10px] font-mono font-black text-orange-500 shrink-0 uppercase">
                                      #{r.id}
                                    </span>
                                  </div>
                                  {r.location && (
                                    <p className="text-[10px] text-slate-400 truncate mt-0.5 flex items-center">
                                      <span className="mr-1">📍</span> {r.location}
                                    </p>
                                  )}
                                </div>
                              </motion.button>
                            ))}
                          </div>
                        ) : (
                          <div className="py-8 px-4 text-center select-none text-xs text-slate-400 font-sans leading-relaxed">
                            No recent rooms found.<br />Create a live room to start!
                          </div>
                        )}
                      </motion.div>
                    </>
                  )}
                </AnimatePresence>
              </div>
            )}

            {isSignedUp ? (
              <div className="flex items-center space-x-2 bg-slate-100/60 border border-slate-200/40 rounded-full px-3 py-1 pr-1.5 select-none" id="user-profile-badge">
                <div className="h-5.5 w-5.5 rounded-full bg-slate-900 border border-slate-850 text-white flex items-center justify-center font-bold text-[10px] font-sans">
                  {profileName.trim().charAt(0).toUpperCase()}
                </div>
                <span className="text-[11px] font-bold text-slate-700 truncate max-w-[90px] leading-none" title={profileEmail}>
                  {profileName}
                </span>
                <button
                  type="button"
                  onClick={handleSignOut}
                  className="p-1 text-slate-400 hover:text-slate-600 rounded-full transition-colors cursor-pointer active:scale-90"
                  title="Sign Out of Profile"
                  aria-label="Sign out of DropIn handle"
                >
                  <LogOut className="h-3 w-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => {
                  setPendingAction(null);
                  setShowSignupModal(true);
                }}
                className="px-3.5 py-1.5 border border-slate-250/30 hover:border-slate-350/40 hover:bg-slate-50 transition-all font-sans font-bold text-xs text-slate-600 rounded-lg cursor-pointer active:scale-95 shadow-3xs"
              >
                Sign Up
              </button>
            )}

            <button
              type="button"
              onClick={() => scrollToWorkspace('create')}
              className="relative overflow-hidden px-4 py-1.5 bg-gradient-to-r from-orange-500 to-amber-500 hover:from-orange-600 hover:to-amber-600 font-sans font-semibold text-xs text-white rounded-lg shadow-sm hover:shadow-orange-100 transition-all cursor-pointer active:scale-95 flex items-center space-x-1"
            >
              <Sparkles className="h-3.5 w-3.5 text-orange-250 animate-pulse" />
              <span>Start Room</span>
            </button>
          </div>
        </div>
      </motion.header>

      {/* HERO SECTION CONTAINER */}
      <main className="w-full max-w-4xl px-6 md:px-8 flex flex-col items-center text-center pt-10 pb-8 space-y-6 md:space-y-8">
        
        {/* Dynamic Platform Optimized Badge */}
        <div className="animate-spring-fade flex justify-center">
          <div className="inline-flex items-center space-x-1.5 bg-white border border-slate-200/40 px-3 py-1 rounded-full text-[10px] font-extrabold uppercase text-slate-500 font-sans tracking-wider shadow-3xs hover:border-slate-300 transition-spring select-none">
            <span className="flex h-1.5 w-1.5 relative">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-1.5 w-1.5 bg-emerald-500"></span>
            </span>
            <span>
              {platformOS === 'macOS' && 'Detected macOS • Optimized with SF Pro Core System Fonts'}
              {platformOS === 'iOS' && 'Detected Apple iOS • Highly Responsive Touch Control Engine'}
              {platformOS === 'Windows' && 'Detected Windows • Fluent layout & precision inputs'}
              {platformOS === 'Android' && 'Detected Android • Dynamic viewport scale & touch targets'}
              {platformOS === 'Linux' && 'Detected Linux • JetBrains high-precision typography'}
              {platformOS === 'Web' && 'Universal Web Host • Responsive Viewport Active'}
            </span>
          </div>
        </div>

        <div className="space-y-4 max-w-2xl">
          {/* Main heading from Image */}
          <h1 id="hero-title" className="font-sans font-extrabold text-4xl sm:text-5xl md:text-6xl text-slate-900 leading-[1.1] tracking-tight">
            Instant rooms for real-world coordination.
          </h1>
          
          {/* Subtitle paragraph from Image */}
          <p className="text-slate-500 text-sm sm:text-base md:text-lg max-w-xl leading-relaxed mx-auto font-medium">
            No login. No app install. No endless group chat noise. Simply share a link and coordinate locally, instantly.
          </p>
        </div>

        {/* Buttons from Image */}
        <div className="flex flex-row items-center justify-center space-x-3 sm:space-x-4">
          <button
            type="button"
            onClick={() => scrollToWorkspace('create')}
            className="px-6 py-2.5 bg-orange-500 hover:bg-orange-600 font-sans font-bold text-xs sm:text-sm text-white rounded-xl shadow-sm transition-all cursor-pointer active:scale-95 hover:shadow-orange-100"
          >
            Start a Room
          </button>
          <button
            type="button"
            onClick={() => scrollToWorkspace('join')}
            className="px-6 py-2.5 bg-white border border-slate-200 hover:border-slate-300 text-slate-700 font-sans font-bold text-xs sm:text-sm rounded-xl shadow-xs transition-all cursor-pointer active:scale-95 hover:bg-slate-50"
          >
            Explore Live Rooms
          </button>
        </div>

        {/* HIGH IMPACT VISUAL MOCKUP CARD (Replicating Screenshot exactly but retaining styling bounds) */}
        <section className="w-full max-w-lg mx-auto pt-6 flex flex-col items-center" aria-label="Interactive Showcase Room Mockup">
          
          {/* Use-Case Selector Switcher */}
          <div className="w-full mb-4">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-2.5 text-center">Interactive Previews: Professional to Fun</p>
            <div className="flex items-center justify-center flex-wrap gap-2 select-none">
              <button
                type="button"
                onClick={() => setSelectedCategory('standup')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                  selectedCategory === 'standup'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                }`}
              >
                <span>💼 Staff Sync</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('lunch')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                  selectedCategory === 'lunch'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                }`}
              >
                <span>🍔 Team Lunch</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('gaming')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                  selectedCategory === 'gaming'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                }`}
              >
                <span>🎮 Tournament</span>
              </button>
              <button
                type="button"
                onClick={() => setSelectedCategory('sports')}
                className={`px-3 py-1.5 rounded-full border text-[11px] font-bold transition-all flex items-center space-x-1 cursor-pointer active:scale-95 ${
                  selectedCategory === 'sports'
                    ? 'bg-slate-900 border-slate-900 text-white shadow-xs'
                    : 'bg-white border-slate-200 text-slate-650 hover:bg-slate-50'
                }`}
              >
                <span>🏏 Cricket</span>
              </button>
            </div>
          </div>

          <div 
            onMouseMove={handleSimMouseMove}
            onMouseLeave={handleSimMouseLeave}
            style={{
              transform: `perspective(1000px) rotateX(${simTilt.rotateX}deg) rotateY(${simTilt.rotateY}deg) scale3d(${simTilt.scale}, ${simTilt.scale}, ${simTilt.scale})`,
              transition: 'transform 0.12s cubic-bezier(0.16, 1, 0.3, 1)',
              transformStyle: 'preserve-3d',
            }}
            className="w-full bg-[#0D1117] rounded-3xl border border-slate-800 text-left overflow-hidden shadow-2xl relative"
          >
            <div className="absolute top-0 inset-x-0 h-[100px] bg-gradient-to-b from-orange-500/5 to-transparent pointer-events-none"></div>
            
            {/* Header section of Mock Card */}
            <div className="p-5 border-b border-slate-900 flex items-center justify-between">
              <div>
                <div className="flex items-center space-x-2">
                  <AnimatedHeading 
                    key={selectedCategory}
                    text={showcaseCategories[selectedCategory].title}
                    className="font-sans font-bold text-white text-base md:text-lg tracking-tight transition-colors duration-300 hover:text-orange-400 cursor-default"
                  />
                  <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                </div>
                <div className="flex items-center space-x-2 text-[11px] font-mono text-slate-400 font-medium mt-1">
                  <span className="text-emerald-400 font-bold">• {showcaseCategories[selectedCategory].activeCount} active now</span>
                  <span>•</span>
                  <span>Ends in {showcaseCategories[selectedCategory].timeLeft}</span>
                </div>
              </div>
              
              <button type="button" className="p-1.5 hover:bg-slate-800 rounded-lg text-slate-400" aria-label="Menu options">
                <span className="font-bold text-lg leading-none -mt-1 block">•••</span>
              </button>
            </div>

            {/* Inner pinned card in dark style */}
            <div className="px-5 pt-4">
              <div className="p-4 bg-slate-900/60 border-l-[3px] border-orange-500 rounded-r-xl space-y-2">
                <div className="flex items-center space-x-2">
                  <span className="text-orange-400 text-sm">📌</span>
                  <p className="text-xs font-bold text-slate-100 uppercase tracking-wide font-sans">
                    {showcaseCategories[selectedCategory].pinText}
                  </p>
                </div>
                <div className="space-y-1 pl-5 text-[11px] text-slate-400 font-medium">
                  <div className="flex items-center">
                    <MapPin className="h-3 w-3 mr-1.5 text-slate-500" />
                    <span>{showcaseCategories[selectedCategory].pinLoc}</span>
                  </div>
                  <div className="flex items-center">
                    <Clock className="h-3 w-3 mr-1.5 text-slate-500" />
                    <span>{showcaseCategories[selectedCategory].pinTime}</span>
                  </div>
                </div>
              </div>
            </div>

            {/* Messages Stream of mock */}
            <div className="p-5 space-y-3.5">
              {[...showcaseCategories[selectedCategory].messages, ...(appendedMessages[selectedCategory] || [])].map((msg, index) => (
                <div key={index} className="flex items-start space-x-3 text-sm animate-fade-in">
                  <div className={`h-7 w-7 rounded-lg ${msg.color || 'bg-slate-800 text-slate-300'} flex items-center justify-center font-bold text-xs shrink-0 select-none`}>
                    {msg.initial}
                  </div>
                  <div className="min-w-0">
                    <div className="flex items-baseline space-x-1.5">
                      <span className="font-bold text-xs text-slate-200">{msg.sender}</span>
                    </div>
                    <p className="text-slate-300 mt-0.5 text-xs">{msg.text}</p>
                  </div>
                </div>
              ))}
            </div>

            {/* Quick response Chips */}
            <div className="p-5 pt-0 border-t border-slate-900 bg-slate-950/40">
              <p className="text-[10px] font-bold text-slate-500 tracking-wider uppercase mb-2.5 pt-4">Draft a custom response</p>
              <div className="flex items-center space-x-2 overflow-x-auto pb-1 select-none">
                {showcaseCategories[selectedCategory].chips.map((chipText, index) => {
                  const isSent = (appendedMessages[selectedCategory] || []).length > 0;
                  return (
                    <button
                      key={index}
                      type="button"
                      onClick={() => triggerMockAction(chipText)}
                      disabled={isSent}
                      className="px-3 py-1.5 bg-[#1F2937]/80 hover:bg-[#374151] hover:text-white border border-slate-800 rounded-full text-xs font-semibold text-slate-300 transition-all cursor-pointer whitespace-nowrap active:scale-95 disabled:opacity-40"
                    >
                      {chipText}
                    </button>
                  );
                })}
              </div>
            </div>
          </div>
        </section>

        {/* ACTIVE WORKSPACE CARD: CREATE & JOIN REAL CHANNELS */}
        <section 
          ref={workspaceRef} 
          className="w-full max-w-lg mx-auto pt-8 md:pt-12 scroll-mt-6" 
          aria-labelledby="workspace-title"
        >
          <h2 id="workspace-title" className="sr-only">Create or Join a Live Coordination Room</h2>
          <div 
            className="w-full bg-white border border-slate-100 shadow-xl rounded-3xl overflow-hidden"
          >
            {/* Tab selector */}
            <div className="grid grid-cols-2 bg-slate-50 p-1.5 border-b border-slate-100">
              <button
                type="button"
                id="tab-create"
                onClick={() => setActiveTab('create')}
                className={`py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                  activeTab === 'create'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <Flame className="h-3.5 w-3.5 text-orange-500 fill-orange-500" />
                <span>Create Room</span>
              </button>
              <button
                type="button"
                id="tab-join"
                onClick={() => setActiveTab('join')}
                className={`py-3 px-4 rounded-2xl font-bold text-xs uppercase tracking-wider transition-all duration-200 flex items-center justify-center space-x-1.5 ${
                  activeTab === 'join'
                    ? 'bg-slate-900 text-white shadow-xs'
                    : 'text-slate-500 hover:text-slate-800 hover:bg-slate-100/60'
                }`}
              >
                <Users className="h-3.5 w-3.5 text-orange-500" />
                <span>Join Room</span>
              </button>
            </div>

            <div className="p-6 sm:p-8 text-left">
              {activeTab === 'create' ? (
                <form onSubmit={handleCreateSubmit} className="space-y-4" id="form-create-room">
                  {/* Title / Topic */}
                  <div>
                    <label htmlFor={topicId} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Room Topic *
                    </label>
                    <input
                      id={topicId}
                      type="text"
                      placeholder="e.g. Daily Standup, Cafe Sync, or Cricket Practice"
                      required
                      value={title}
                      onChange={(e) => setTitle(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 font-medium px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 text-sm placeholder-slate-400 text-slate-800"
                    />
                  </div>

                  {/* Expiry Duration */}
                  <div>
                    <label htmlFor={timeId} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5 flex items-center justify-between">
                      <span>Room Shelf-life *</span>
                      <span className="font-bold text-orange-600 text-[10px] normal-case bg-orange-50 px-2 py-0.5 rounded-full">
                        Auto-expires
                      </span>
                    </label>
                    <select
                      id={timeId}
                      value={duration}
                      onChange={(e) => setDuration(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 font-medium px-4 py-3 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 text-sm text-slate-800"
                    >
                      <option value="15">15 Minutes (Emergency runs / quick checks)</option>
                      <option value="60">1 Hour (Typical local assembly)</option>
                      <option value="180">3 Hours (Activity play duration)</option>
                      <option value="720">12 Hours (Half-day planner)</option>
                      <option value="1440">24 Hours (Full day campaign)</option>
                    </select>
                  </div>

                  {/* Location & Limit Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {/* Location */}
                    <div>
                      <label htmlFor={locId} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Location <span className="text-[10px] font-normal text-slate-400 font-sans">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Navigation className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          id={locId}
                          type="text"
                          placeholder="e.g. Ground A"
                          value={location}
                          onChange={(e) => setLocation(e.target.value)}
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 text-sm placeholder-slate-400 text-slate-800"
                        />
                      </div>
                    </div>

                    {/* Max capacity limit */}
                    <div>
                      <label htmlFor={limitId} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                        Max Capacity <span className="text-[10px] font-normal text-slate-400 font-sans">(Optional)</span>
                      </label>
                      <div className="relative">
                        <Users className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                        <input
                          id={limitId}
                          type="number"
                          placeholder="No limit"
                          value={participantLimit}
                          onChange={(e) => setParticipantLimit(e.target.value)}
                          min="1"
                          max="1000"
                          className="w-full bg-slate-50 border border-slate-200 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 text-sm placeholder-slate-400 text-slate-800"
                        />
                      </div>
                    </div>
                  </div>

                  {/* Goal Rules */}
                  <div>
                    <label htmlFor={descId} className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Short Goal / Instructions <span className="text-[10px] font-normal text-slate-400 font-sans">(Optional)</span>
                    </label>
                    <textarea
                      id={descId}
                      rows={2}
                      placeholder="e.g. Bring agendas, laptop chargers, or sport accessories. Tap status below to RSVP."
                      value={description}
                      onChange={(e) => setDescription(e.target.value)}
                      className="w-full bg-slate-50 border border-slate-200 px-4 py-2.5 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 text-sm placeholder-slate-400 resize-none text-slate-800"
                    />
                  </div>

                  {/* Create Button */}
                  <button
                    type="submit"
                    disabled={isLoading || !title.trim()}
                    className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 font-bold text-xs uppercase tracking-wider text-white py-3.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center space-x-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        <span>Assembling DropIn Room...</span>
                      </span>
                    ) : (
                      <>
                        <span>Generate Active Room</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>
                </form>
              ) : (
                <form onSubmit={handleJoinSubmit} className="space-y-5" id="form-join-room">
                  <p className="text-xs text-slate-500 leading-normal font-medium">
                    Enter the uniquely generated 6-character room access code shared by your coordinator to access their status board instantly.
                  </p>

                  {/* Room ID input */}
                  <div>
                    <label htmlFor="join-room-id" className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1.5">
                      Room Access Code
                    </label>
                    <input
                      id="join-room-id"
                      type="text"
                      placeholder="e.g. MATCH9"
                      maxLength={6}
                      value={inputRoomId}
                      onChange={(e) => {
                        setInputRoomId(e.target.value.toUpperCase().replace(/[^a-zA-Z0-9]/g, ''));
                        setErrorRoomId('');
                      }}
                      className="w-full bg-slate-50 border border-slate-200 font-mono font-bold tracking-widest text-center uppercase text-2xl px-4 py-4 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 placeholder-slate-350 text-slate-800"
                    />
                    {errorRoomId && (
                      <p className="text-xs text-rose-500 font-medium mt-2" id="join-error-msg">
                        {errorRoomId}
                      </p>
                    )}
                  </div>

                  {/* Join Button */}
                  <button
                    type="submit"
                    disabled={isLoading || inputRoomId.trim().length !== 6}
                    className="w-full bg-orange-500 hover:bg-orange-600 active:bg-orange-700 disabled:bg-slate-200 disabled:text-slate-400 font-bold text-xs uppercase tracking-wider text-white py-3.5 px-4 rounded-xl transition-all duration-150 flex items-center justify-center space-x-2 shadow-sm cursor-pointer"
                  >
                    {isLoading ? (
                      <span className="flex items-center space-x-2">
                        <span className="animate-spin rounded-full h-4 w-4 border-2 border-white border-t-transparent"></span>
                        <span>Accessing room...</span>
                      </span>
                    ) : (
                      <>
                        <span>Enter DropIn Room</span>
                        <ArrowRight className="h-4 w-4" />
                      </>
                    )}
                  </button>

                  {/* Active sample indicators */}
                  <div className="relative pt-4">
                    <div className="absolute inset-0 flex items-center" aria-hidden="true">
                      <div className="w-full border-t border-slate-200/60"></div>
                    </div>
                    <div className="relative flex justify-center text-xs">
                      <span className="bg-white px-2.5 text-slate-400 font-bold uppercase tracking-wider text-[10px]">Sample Co-ordinates</span>
                    </div>
                  </div>

                  <div className="space-y-2.5">
                    {sampleRooms.map((s, idx) => (
                      <button
                        type="button"
                        key={idx}
                        onClick={() => {
                          setInputRoomId(s.code);
                          setErrorRoomId('');
                        }}
                        className="w-full text-left p-3 rounded-xl border border-dashed border-slate-200 hover:border-orange-400 hover:bg-orange-50/20 transition-all duration-150 flex justify-between items-center group cursor-pointer"
                      >
                        <div className="space-y-0.5">
                          <p className="text-xs font-bold text-slate-800 group-hover:text-orange-600 transition-colors uppercase tracking-tight">{s.title}</p>
                          <div className="flex items-center space-x-2">
                            <span className="text-[10px] text-slate-500 font-bold font-mono bg-slate-100 px-1.5 py-0.5 rounded-md">{s.code}</span>
                            <span className="text-[10.5px] text-slate-400 flex items-center">
                              <Navigation className="h-3 w-3 mr-0.5" />
                              {s.loc}
                            </span>
                          </div>
                        </div>
                        <div className="text-right flex flex-col items-end shrink-0">
                          <span className="text-[10.5px] text-orange-600 font-semibold flex items-center">
                            <Users className="h-3 w-3 mr-0.5" />
                            {s.active} active
                          </span>
                          <span className="text-[10px] text-slate-400 font-medium font-mono">{s.duration}</span>
                        </div>
                      </button>
                    ))}
                  </div>
                </form>
              )}
            </div>
          </div>
        </section>

        {/* BOTTOM CTA BANNER (Matching Image CTA) */}
        <section className="w-full max-w-lg mx-auto pt-16 pb-8" aria-label="Create your first room CTA">
          <div className="p-8 bg-white border border-slate-100 rounded-3xl flex flex-col items-center justify-center text-center space-y-5 shadow-xs">
            <h2 className="font-sans font-extrabold text-2xl md:text-3xl text-slate-900 tracking-tight leading-tight">
              Coordinate instantly without group chat chaos.
            </h2>
            <button
              type="button"
              onClick={() => scrollToWorkspace('create')}
              className="px-6 py-3 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 font-sans font-bold text-xs uppercase tracking-wider text-white rounded-xl shadow-sm transition-all cursor-pointer hover:shadow-orange-100"
            >
              Create Your First Room
            </button>
          </div>
        </section>

      </main>

      {/* FOOTER SECTION (Matching Image Layout) */}
      <footer className="w-full border-t border-slate-100 py-8 bg-white text-center mt-auto" id="app-footer">
        <div className="max-w-7xl mx-auto px-6 md:px-8 flex flex-col md:flex-row items-center justify-between gap-4">
          {/* Logo */}
          <div className="flex items-center space-x-2">
            <div className="h-6 w-6 rounded-sm bg-orange-500 flex items-center justify-center transform rotate-6">
              <span className="text-white font-extrabold text-xs">d</span>
            </div>
            <span className="font-sans font-bold text-sm text-slate-900 select-none">DropIn</span>
          </div>

          {/* Copy section */}
          <p className="text-slate-400 text-xs font-sans">
            © 2026 DropIn. Instant coordination for the real world.
          </p>

          {/* Footer Navigation */}
          <div className="flex items-center space-x-4 text-xs font-semibold text-slate-400">
            <a href="#privacy" onClick={(e) => { e.preventDefault(); alert("DropIn does not collect cookies, files, or any personal variables to protect client-side privacy."); }} className="hover:text-slate-700 transition-colors">Privacy</a>
            <a href="#terms" onClick={(e) => { e.preventDefault(); alert("DropIn rooms auto-expire. Use within coordination terms and agreements."); }} className="hover:text-slate-700 transition-colors">Terms</a>
            <a href="https://github.com" target="_blank" rel="noreferrer" className="hover:text-slate-700 transition-colors">Github</a>
            <a href="https://twitter.com" target="_blank" rel="noreferrer" className="hover:text-slate-700 transition-colors">Twitter</a>
            <a href="#status" onClick={(e) => { e.preventDefault(); alert("All server WebSockets are 100% operational."); }} className="hover:text-slate-700 transition-colors">Status</a>
          </div>
        </div>
      </footer>

      {/* HIGH FIDELITY PROFILE REGISTRATION MODAL */}
      {showSignupModal && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4 z-50 animate-in fade-in duration-200 animate-out fade-out duration-150" id="signup-profile-modal">
          <div className="bg-white rounded-3xl max-w-sm w-full shadow-2xl border border-slate-100 overflow-hidden transform scale-95 animate-in zoom-in-95 duration-200">
            {/* Header */}
            <div className="bg-slate-950 p-6 text-white text-left relative flex items-center justify-between">
              <div>
                <span className="text-[10px] uppercase font-bold tracking-widest text-[#FF7A00]">DropIn ID Activation</span>
                <h3 className="text-base font-sans font-extrabold leading-none mt-1">Profile Sign Up</h3>
              </div>
              <button
                type="button"
                onClick={() => {
                  setShowSignupModal(false);
                  setPendingAction(null);
                  setSignupError('');
                }}
                className="h-8 w-8 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center transition-colors cursor-pointer text-sm font-bold"
                aria-label="Close signup modal"
              >
                ✕
              </button>
            </div>

            {/* Form */}
            <form onSubmit={handleRegister} className="p-6 text-left space-y-4">
              <p className="text-xs text-slate-500 leading-relaxed font-sans">
                {pendingAction?.type === 'create_room' 
                  ? "To register as the Room Organizer and unlock dynamic coordination controls, please complete a quick signup profile first."
                  : pendingAction?.type === 'test_chip'
                    ? "Unlock fully personalized coordination. Register a quick profile to explore simulated chat updates and response chips."
                    : "Become a verified DropIn user to launch interactive room coordinates, customize alerts, and explore active chats."
                }
              </p>

              {signupError && (
                <div className="p-3 bg-rose-50 border border-rose-100 rounded-xl text-rose-700 text-xs font-semibold" id="signup-error-box">
                  ⚠️ {signupError}
                </div>
              )}

              {/* Full Name */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Full Name / Handle
                </label>
                <div className="relative">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="text"
                    required
                    placeholder="e.g. Captain Zack"
                    value={signupName}
                    onChange={(e) => setSignupName(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/50 focus:border-orange-500 rounded-xl px-4 py-3 pl-10 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/20 font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* Email Address */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Email Address
                </label>
                <div className="relative">
                  <Mail className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="email"
                    required
                    placeholder="e.g. zack@team.com"
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/50 focus:border-orange-500 rounded-xl px-4 py-3 pl-10 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/20 font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-[10px] font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Secure Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    type="password"
                    required
                    minLength={4}
                    placeholder="••••••••"
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-slate-50 border border-slate-200/50 focus:border-orange-500 rounded-xl px-4 py-3 pl-10 text-xs focus:outline-none focus:ring-1 focus:ring-orange-500/20 font-sans text-slate-800"
                  />
                </div>
              </div>

              {/* Submit Buttons */}
              <div className="pt-2 flex flex-col space-y-2">
                <button
                  type="submit"
                  className="w-full bg-orange-500 hover:bg-orange-600 font-sans font-bold text-xs uppercase tracking-wider text-white py-3.5 rounded-xl transition-colors cursor-pointer"
                >
                  {pendingAction ? "Register & Proceed" : "Complete Registration"}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowSignupModal(false);
                    setPendingAction(null);
                    setSignupError('');
                  }}
                  className="w-full border border-slate-200 text-slate-500 hover:text-slate-800 py-3 rounded-xl text-xs font-bold transition-all cursor-pointer"
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
