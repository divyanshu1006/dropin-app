import React, { useState, useId } from 'react';
import { User, ShieldAlert, Sparkles, Wand2 } from 'lucide-react';
import { generateRandomNickname } from '../utils.js';

interface NicknameModalProps {
  onConfirm: (name: string) => void;
  title: string;
  location?: string;
  onCancel: () => void;
}

export default function NicknameModal({ onConfirm, title, location, onCancel }: NicknameModalProps) {
  const [nickname, setNickname] = useState(() => generateRandomNickname());
  const inputId = useId();

  const handleRoll = () => {
    setNickname(generateRandomNickname());
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (nickname.trim()) {
      onConfirm(nickname.trim());
    }
  };

  return (
    <div className="fixed inset-0 bg-slate-900/10 backdrop-blur-xs flex items-center justify-center z-50 p-4" id="nickname-modal-container">
      <div className="bg-white rounded-3xl border border-slate-100 p-6 md:p-8 max-w-md w-full shadow-sm relative overflow-hidden animate-in fade-in zoom-in duration-200">
        
        {/* Subtle decorative ring */}
        <div className="absolute top-0 right-0 h-20 w-20 bg-orange-50/50 rounded-full blur-xl opacity-60"></div>

        <div className="space-y-5">
          <div className="space-y-1.5 text-center sm:text-left">
            <span className="text-[10px] uppercase font-bold tracking-widest text-orange-600 bg-orange-50 px-2.5 py-1 rounded-full font-mono">
              Identity Requirement
            </span>
            <h3 className="text-xl font-bold font-sans text-slate-900 mt-2">Choose Nickname</h3>
            <p className="text-slate-500 text-xs leading-normal">
              You are joining <span className="font-semibold text-slate-800">"{title}"</span>
              {location && <span> located at <span className="text-slate-700 font-semibold">({location})</span></span>}.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4" id="form-select-nickname">
            <div>
              <label htmlFor={inputId} className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
                Your Guest Handle
              </label>
              <div className="flex space-x-2">
                <div className="relative flex-1">
                  <User className="absolute left-3.5 top-3.5 h-4 w-4 text-slate-400" />
                  <input
                    id={inputId}
                    type="text"
                    required
                    maxLength={20}
                    placeholder="Enter nickname..."
                    value={nickname}
                    onChange={(e) => setNickname(e.target.value.replace(/[^a-zA-Z0-9]/g, ''))}
                    className="w-full bg-slate-50 border border-slate-150 px-4 py-3 pl-10 rounded-xl focus:outline-none focus:ring-2 focus:ring-orange-500/10 focus:border-orange-500 font-medium text-sm text-slate-800"
                  />
                </div>
                
                {/* Reroll nickname */}
                <button
                  type="button"
                  id="btn-reroll-nick"
                  onClick={handleRoll}
                  title="Generate another identifier"
                  className="px-3 py-3 rounded-xl border border-slate-150 text-slate-500 hover:text-slate-800 hover:bg-slate-50 active:bg-slate-100 transition-colors flex items-center justify-center cursor-pointer"
                >
                  <Wand2 className="h-5 w-5" />
                </button>
              </div>
            </div>

            <div className="flex items-center space-x-2 p-3 bg-amber-50/50 border border-amber-100 rounded-xl text-[11px] text-amber-700 leading-normal">
              <ShieldAlert className="h-4 w-4 shrink-0 text-amber-500" />
              <span>No login needed. This is a temporary guest card valid only for this room session.</span>
            </div>

            <div className="grid grid-cols-2 gap-3.5 pt-2">
              <button
                type="button"
                id="btn-cancel-join"
                onClick={onCancel}
                className="w-full py-3 px-4 rounded-xl border border-slate-150 text-slate-500 hover:bg-slate-50 font-semibold text-xs text-center transition-colors cursor-pointer"
              >
                Go Back
              </button>
              
              <button
                type="submit"
                id="btn-confirm-join"
                className="w-full py-3 px-4 bg-orange-500 hover:bg-orange-600 active:bg-orange-700 text-white font-semibold text-xs rounded-xl shadow-sm transition-colors text-center flex items-center justify-center space-x-1.5 cursor-pointer"
              >
                <Sparkles className="h-3.5 w-3.5" />
                <span>Join Chat</span>
              </button>
            </div>
          </form>
        </div>
      </div>
    </div>
  );
}
