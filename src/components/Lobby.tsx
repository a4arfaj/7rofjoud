import React, { useState } from 'react';
import logoImage from '../assets/noback7rof.png';

interface LobbyProps {
  onJoinRoom: (roomId: string, isCreator: boolean, playerName: string) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');

  const validateAndProceed = (action: () => void) => {
    if (!playerName.trim()) {
      setError('ادخل الاسم');
      return;
    }
    setError('');
    action();
  };

  const handleCreate = () => {
    validateAndProceed(() => {
      // Generate a random 4-digit room ID
      const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();
      onJoinRoom(newRoomId, true, playerName);
    });
  };

  const handleEnter = () => {
    validateAndProceed(() => {
      if (!roomId.trim()) {
        setError('ادخل رقم الغرفة');
        return;
      }
      onJoinRoom(roomId, false, playerName);
    });
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#3fa653] font-['Cairo'] text-white p-4" dir="rtl">
      {/* Logo */}
      <img 
        src={logoImage} 
        alt="حروف مع جود" 
        className="mb-12 max-w-[600px] w-full h-auto drop-shadow-2xl"
        style={{ maxHeight: '250px', objectFit: 'contain' }}
      />
      
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="space-y-6">
          {/* Name Input */}
          <div>
            <label className="block text-white/90 text-lg font-bold mb-2 mr-1">الاسم</label>
            <input
              type="text"
              value={playerName}
              onChange={(e) => setPlayerName(e.target.value)}
              placeholder="ادخل اسمك"
              className="w-full px-4 py-3 bg-white/90 text-gray-800 text-xl font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-[#f4841f] text-center placeholder-gray-500"
            />
          </div>

          <div className="border-t border-white/20 my-4"></div>

          {/* Create Room Button */}
          <button
            onClick={handleCreate}
            className="w-full py-4 bg-[#f4841f] hover:bg-[#d66e0d] text-white text-2xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
          >
            أنشئ غرفة
          </button>

          <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-white/30"></div>
            <span className="flex-shrink-0 mx-4 text-white/80">أو</span>
            <div className="flex-grow border-t border-white/30"></div>
          </div>

          {/* Enter Room Section */}
          <div className="space-y-3">
            <input
              type="text"
              value={roomId}
              onChange={(e) => setRoomId(e.target.value)}
              placeholder="رقم الغرفة"
              className="w-full px-4 py-3 bg-white/90 text-gray-800 text-xl font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-[#f4841f] text-center placeholder-gray-500"
            />
            <button
              onClick={handleEnter}
              className="w-full py-3 bg-[#2255cc] hover:bg-[#1a44a5] text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              ادخل غرفة
            </button>
            {error && <p className="text-red-200 text-center font-bold mt-2 bg-red-500/20 py-2 rounded-lg">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;
