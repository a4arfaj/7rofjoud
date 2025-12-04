import React, { useState } from 'react';

interface LobbyProps {
  onJoinRoom: (roomId: string, isCreator: boolean) => void;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinRoom }) => {
  const [roomId, setRoomId] = useState('');
  const [error, setError] = useState('');

  const handleCreate = () => {
    // Generate a random 4-digit room ID
    const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();
    onJoinRoom(newRoomId, true);
  };

  const handleEnter = () => {
    if (!roomId.trim()) {
      setError('الرجاء إدخال رقم الغرفة');
      return;
    }
    onJoinRoom(roomId, false);
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#3fa653] font-['Cairo'] text-white p-4" dir="rtl">
      <h1 className="text-5xl font-bold mb-12 text-white drop-shadow-lg">حروف وجوود</h1>
      
      <div className="bg-white/10 backdrop-blur-md p-8 rounded-2xl shadow-2xl w-full max-w-md border border-white/20">
        <div className="space-y-6">
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
            {error && <p className="text-red-200 text-center font-bold mt-2">{error}</p>}
          </div>
        </div>
      </div>
    </div>
  );
};

export default Lobby;

