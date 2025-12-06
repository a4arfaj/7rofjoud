import React, { useState } from 'react';
import logoImage from '../assets/noback7rof.png';

interface LobbyProps {
  onJoinRoom: (roomId: string, isCreator: boolean, playerName: string) => void;
  checkRoomExists: (roomId: string) => Promise<boolean>;
  roomError?: string;
}

const Lobby: React.FC<LobbyProps> = ({ onJoinRoom, checkRoomExists, roomError }) => {
  const [roomId, setRoomId] = useState('');
  const [playerName, setPlayerName] = useState('');
  const [error, setError] = useState('');
  const [showNameInput, setShowNameInput] = useState(false);
  const [pendingAction, setPendingAction] = useState<{ type: 'create' | 'join', roomId?: string } | null>(null);

  // Helper to convert Arabic numerals to English
  const toEnglishDigits = (str: string) => {
    return str.replace(/[٠-٩]/g, d => '0123456789'['٠١٢٣٤٥٦٧٨٩'.indexOf(d)]);
  };

  // Helper to convert numbers to Arabic numerals (Eastern Arabic numerals)
  const toArabicNumerals = (num: string | null | undefined): string => {
    if (!num) return '';
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.split('').map(char => {
      const digit = parseInt(char);
      return isNaN(digit) ? char : arabicNumerals[digit];
    }).join('');
  };

  const handleCreateClick = () => {
    setPendingAction({ type: 'create' });
    setShowNameInput(true);
    setError('');
  };

  const handleJoinClick = async () => {
    if (!roomId.trim()) {
      setError('ادخل رقم الغرفة');
      return;
    }
    
    // Validate room exists
    try {
      const exists = await checkRoomExists(roomId);
      if (!exists) {
        setError('رقم الغرفة غير صحيح');
        return;
      }
      setPendingAction({ type: 'join', roomId });
      setShowNameInput(true);
      setError('');
    } catch (err) {
      console.error("Error validating room:", err);
      setError('حدث خطأ أثناء التحقق من الغرفة');
    }
  };

  const handleNameSubmit = () => {
    if (!playerName.trim()) {
      setError('ادخل الاسم');
      return;
    }

    if (pendingAction?.type === 'create') {
      // Generate a random 4-digit room ID
      const newRoomId = Math.floor(1000 + Math.random() * 9000).toString();
      onJoinRoom(newRoomId, true, playerName); 
    } else if (pendingAction?.type === 'join' && pendingAction.roomId) {
      onJoinRoom(pendingAction.roomId, false, playerName);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-[#3fa653] font-['Cairo'] text-white p-0.5" dir="rtl">
      {/* Logo */}
      <img 
        src={logoImage} 
        alt="حروف مع جود" 
        className="mb-0 max-w-[600px] w-full h-auto drop-shadow-2xl"
        style={{ maxHeight: '250px', objectFit: 'contain' }}
      />
      
      <div className="bg-white/10 backdrop-blur-md p-6 rounded-2xl shadow-2xl w-full max-w-md border border-white/20 transition-all duration-300">
        <div className="space-y-6">
          {!showNameInput ? (
            // Initial View: Create or Join Room
            <>
          {/* Create Room Button */}
          <button
                onClick={handleCreateClick}
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
              type="tel"
              inputMode="numeric"
                  // Allow 0-9 and Arabic numerals
              value={roomId}
              onChange={(e) => {
                    // Convert Arabic numerals to English before filtering
                    const englishVal = toEnglishDigits(e.target.value);
                    const value = englishVal.replace(/[^0-9]/g, '');
                setRoomId(value);
                    setError('');
              }}
              placeholder="رقم الغرفة"
              className="w-full px-4 py-3 bg-white/90 text-gray-800 text-xl font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-[#f4841f] text-center placeholder-gray-500"
            />
            <button
                  onClick={handleJoinClick}
              className="w-full py-3 bg-[#2255cc] hover:bg-[#1a44a5] text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg"
            >
              ادخل غرفة
            </button>
              </div>
            </>
          ) : (
            // Name Input View
            <div className="animate-fadeIn">
              <div className="text-center mb-6">
                <h3 className="text-2xl font-bold mb-2">
                  {pendingAction?.type === 'create' ? 'إعداد الغرفة' : `دخول غرفة ${toArabicNumerals(pendingAction?.roomId)}`}
                </h3>
                <p className="text-white/80">أدخل اسمك</p>
              </div>

              <div className="space-y-4">
                <div>
                  <label className="block text-white/90 text-lg font-bold mb-2 mr-1">الاسم</label>
                  <input
                    type="text"
                    value={playerName}
                    onChange={(e) => setPlayerName(e.target.value)}
                    onKeyDown={(e) => e.key === 'Enter' && handleNameSubmit()}
                    placeholder="أدخل اسمك"
                    autoFocus
                    className="w-full px-4 py-3 bg-white/90 text-gray-800 text-xl font-bold rounded-xl focus:outline-none focus:ring-4 focus:ring-[#f4841f] text-center placeholder-gray-500"
                  />
                </div>

                <button
                  onClick={handleNameSubmit}
                  className="w-full py-3 bg-[#3ecf5e] hover:bg-[#2ea046] text-white text-xl font-bold rounded-xl transition-all transform hover:scale-105 shadow-lg mt-4"
                >
                  {pendingAction?.type === 'create' ? 'ابدأ اللعب' : 'شاركهم اللعب'}
                </button>

                <button
                  onClick={() => {
                    setShowNameInput(false);
                    setPendingAction(null);
                    setError('');
                  }}
                  className="w-full py-2 text-white/70 hover:text-white text-lg font-medium transition-colors"
                >
                  رجوع
                </button>
              </div>
            </div>
          )}

            {(error || roomError) && (
            <p className="text-red-200 text-center font-bold mt-2 bg-red-500/20 py-2 rounded-lg animate-pulse">
                {error || roomError}
              </p>
            )}
        </div>
      </div>
    </div>
  );
};

export default Lobby;
