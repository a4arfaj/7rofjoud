import { useEffect, useState } from 'react';
import HexGrid from './components/HexGrid';
import Lobby from './components/Lobby';
import {
  generateHexGrid,
} from './utils/hex';
import type { HexCellData } from './utils/hex';
import type { CSSProperties } from 'react';
import { ARABIC_LETTERS, HEX_SIZE, ORANGE_ZONE_DISTANCE, GREEN_ZONE_DISTANCE, ORANGE_INNER_EDGE_LENGTH } from './constants';
import { db } from './firebase';
import { ref, set, onValue, update, get } from 'firebase/database';

// Add buzzer interface
interface BuzzerState {
  active: boolean;
  playerName: string | null;
  timestamp: number;
}

// Add player interface
interface Player {
  name: string;
  team: 'green' | 'orange';
}

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [grid, setGrid] = useState<HexCellData[]>(() => generateHexGrid(ARABIC_LETTERS));
  const [buzzer, setBuzzer] = useState<BuzzerState>({ active: false, playerName: null, timestamp: 0 });
  // Track all players in the room for the host
  const [players, setPlayers] = useState<Player[]>([]);
  const [roomError, setRoomError] = useState<string>('');
  
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  // Responsive orange zone parameters - use smaller values when width < 430px
  const isSmallScreen = viewportWidth < 430;
  const orangeZoneDistance = isSmallScreen ? 20 : ORANGE_ZONE_DISTANCE;
  const orangeInnerEdgeLength = isSmallScreen ? 5 : ORANGE_INNER_EDGE_LENGTH;

  // Handle joining/creating room
  const handleJoinRoom = (id: string, creator: boolean, name: string) => {
    // Clear any previous errors
    setRoomError('');
    
    // Assign team randomly for everyone
    const playerTeam = Math.random() > 0.5 ? 'green' : 'orange';

    if (creator) {
      setRoomId(id);
      setIsCreator(true);
      setPlayerName(name);

      // Creator generates grid and pushes to Firebase
      const newGrid = generateHexGrid(ARABIC_LETTERS);
      console.log("Creating room:", id, "with grid:", newGrid.length, "cells");
      setGrid(newGrid); // Set local state immediately
      
      const initialPlayer = { name, team: playerTeam };
      
      set(ref(db, `rooms/${id}`), {
        grid: newGrid,
        winner: null,
        createdAt: Date.now(),
        creatorName: name,
        buzzer: { active: false, playerName: null, timestamp: 0 },
        players: { [name]: initialPlayer } // Store as object key->value
      })
      .then(() => {
        console.log("Room created successfully in Firebase:", id);
      })
      .catch((err: any) => {
        console.error("Firebase Error (Create):", err);
        console.error("Error code:", err.code);
        console.error("Error message:", err.message);
        setRoomError("فشل في إنشاء الغرفة. تحقق من قاعدة البيانات والقواعد في Firebase Console.");
        // Reset room state on error
        setRoomId(null);
        setIsCreator(false);
        setPlayerName('');
      });
    } else {
      // Joiner: verify room exists before joining
      const roomRef = ref(db, `rooms/${id}`);
      get(roomRef)
        .then((snapshot) => {
          if (!snapshot.exists()) {
            setRoomError("لا غرفة بهذا الرقم");
            return;
          }

          setRoomId(id);
          setIsCreator(false);
          setPlayerName(name);
          setRoomError(''); // Clear error on successful join

          return update(roomRef, {
            [`players/${name}`]: { name, team: playerTeam }
          });
        })
        .catch((err: any) => {
          console.error("Firebase Error (Join):", err);
          console.error("Error code:", err.code);
          setRoomError("فشل في الانضمام للغرفة. تحقق من الاتصال.");
        });
    }
  };

  // Sync with Firebase when in a room
  useEffect(() => {
    if (!roomId) return;

    console.log("Setting up Firebase sync for room:", roomId);
    const roomRef = ref(db, `rooms/${roomId}`);
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Firebase data received:", data);
      
      if (data) {
        if (data.grid && Array.isArray(data.grid)) {
          setGrid(data.grid);
        }
        // Sync buzzer state
        if (data.buzzer) {
          setBuzzer(data.buzzer);
        }
        // Sync players list
        if (data.players) {
          // Convert object values to array
          // Handle both formats: object with name keys or array-like with auto-keys
          let playerList: Player[] = [];
          if (typeof data.players === 'object') {
            playerList = Object.values(data.players).filter((p: any) => 
              p && typeof p === 'object' && p.name && p.team
            ) as Player[];
          }
          setPlayers(playerList);
        }
      } else {
        console.warn("No data in Firebase for room:", roomId);
      }
    }, (error: any) => {
      console.error("Firebase sync error:", error);
      alert("خطأ في الاتصال بـ Firebase. تأكد من قاعدة البيانات والقواعد.");
    });

    return () => {
      console.log("Cleaning up Firebase listener");
      unsubscribe();
    };
  }, [roomId]);

  const handleCellClick = (id: string) => {
    // Only creator (Host) can modify the grid
    if (!isCreator) return;

    // Allow free editing - cycle through 4 states: 0 (white) -> 1 (yellow) -> 2 (orange) -> 3 (green) -> 0
    const newGrid = grid.map(cell => {
      if (cell.id === id) {
        return { ...cell, state: (cell.state + 1) % 4 as 0 | 1 | 2 | 3 };
      }
      return cell;
    });

    // Update grid freely without win blocking
    // If in a room, push update to Firebase
    if (roomId) {
      update(ref(db, `rooms/${roomId}`), {
        grid: newGrid
      })
      .catch((err: any) => {
        console.error("Firebase Error (Update):", err);
        // Still update local state even if Firebase fails
        setGrid(newGrid);
      });
    } else {
      // Local play fallback
      setGrid(newGrid);
    }
  };

  // Handle Buzzer Press (Guest)
  const handleBuzzerPress = () => {
    if (isCreator) return; // Host doesn't buzz
    if (buzzer.active) return; // Already buzzed

    if (roomId) {
      update(ref(db, `rooms/${roomId}/buzzer`), {
        active: true,
        playerName: playerName,
        timestamp: Date.now()
      });
    }
  };

  // Handle Reset Buzzer (Host)
  const handleResetBuzzer = () => {
    if (!isCreator) return;
    
    if (roomId) {
      update(ref(db, `rooms/${roomId}/buzzer`), {
        active: false,
        playerName: null,
        timestamp: 0
      });
    }
  };

  // Win detection disabled - free editing enabled

  // Track viewport width for responsive design
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const boardGlow: CSSProperties = {}; // No shadows

  // Convert numbers to Arabic numerals (Eastern Arabic numerals)
  const toArabicNumerals = (num: string | null): string => {
    if (!num) return '';
    const arabicNumerals = ['٠', '١', '٢', '٣', '٤', '٥', '٦', '٧', '٨', '٩'];
    return num.split('').map(char => {
      const digit = parseInt(char);
      return isNaN(digit) ? char : arabicNumerals[digit];
    }).join('');
  };

  // Helper to generate centralized positions for floating names
  const getFloatingStyle = (index: number, total: number, zone: 'green-top' | 'green-bottom' | 'orange-left' | 'orange-right') => {
    // Calculate centralized positions - spread evenly around center
    let offset = 0;
    if (total > 1) {
      const spacing = Math.min(30, 80 / total); // Max spacing of 30% per item
      offset = (index - (total - 1) / 2) * spacing;
    }

    // Adjust positions based on zone - more centralized
    switch(zone) {
      case 'green-top':
        // Top V shape - centered horizontally around 50%, small vertical offset
        return { 
          top: '40%', 
          left: `calc(50% + ${offset}%)`,
          transform: 'translateX(-50%)'
        };
      case 'green-bottom':
        // Bottom V shape - centered horizontally
        return { 
          bottom: '40%', 
          left: `calc(50% + ${offset}%)`,
          transform: 'translateX(-50%)'
        };
      case 'orange-left':
        // Left side - centered vertically around 50%, positioned in center of zone width
        return { 
          top: `calc(50% + ${offset}%)`, 
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
      case 'orange-right':
        // Right side - centered vertically
        return { 
          top: `calc(50% + ${offset}%)`, 
          left: '50%',
          transform: 'translate(-50%, -50%)'
        };
    }
    return {};
  };

  if (!roomId) {
    return <Lobby onJoinRoom={handleJoinRoom} roomError={roomError} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#3fa653] font-['Cairo']">
      {/* Top UI Layer */}
      <div className="absolute top-0 left-0 right-0 z-50 p-4 flex justify-between items-start pointer-events-none">
        {/* Left: Host Controls (only visible to Host) */}
        <div className="pointer-events-auto">
          {isCreator && (
            <div className="flex flex-col gap-2">
              {/* Buzzer Status for Host */}
              {buzzer.active && (
                <div className="px-6 py-4 rounded-xl shadow-lg transition-all transform bg-green-500 text-white scale-110">
                  <div className="text-center">
                    <div className="text-2xl font-bold animate-pulse">{buzzer.playerName}</div>
                    <div className="text-sm">ضغط الزر!</div>
                    <button 
                      onClick={handleResetBuzzer}
                      className="mt-2 bg-white text-green-600 px-4 py-1 rounded-full text-sm font-bold hover:bg-gray-100 active:scale-95 transition-transform"
                    >
                      إعادة تعيين الزر
                    </button>
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Right: Room Info */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg shadow font-bold text-white">
            غرفة: {toArabicNumerals(roomId)}
          </div>
          <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg shadow font-bold text-white text-sm">
            {isCreator ? 'المضيف (أنت)' : `اللاعب: ${playerName}`}
          </div>
        </div>
      </div>

      {/* Guest Buzzer UI (Bottom Center) */}
      {!isCreator && (
        <div className="absolute bottom-8 left-0 right-0 z-50 flex justify-center pointer-events-none">
          <div className="pointer-events-auto">
            <button
              onClick={handleBuzzerPress}
              disabled={buzzer.active}
              className={`
                w-32 h-32 rounded-full shadow-2xl border-8 flex items-center justify-center transition-all transform
                ${buzzer.active 
                  ? (buzzer.playerName === playerName 
                      ? 'bg-green-500 border-green-300 scale-110' // You won
                      : 'bg-red-500 border-red-300 opacity-50 grayscale') // Someone else won
                  : 'bg-blue-600 border-blue-400 hover:scale-105 active:scale-95 hover:bg-blue-500' // Active
                }
              `}
            >
              <span className="text-white font-black text-2xl drop-shadow-md">
                {buzzer.active 
                  ? (buzzer.playerName === playerName ? 'أنت!' : buzzer.playerName)
                  : 'اضغط!'}
              </span>
            </button>
          </div>
        </div>
      )}

      <div className="relative w-full h-screen flex items-center justify-center">
        {/* Game container that scales uniformly */}
        <div 
          className="relative"
          style={{
            width: 'min(95vw, 95vh)',
            height: 'min(95vw, 95vh)',
            maxWidth: '900px',
            maxHeight: '900px',
            aspectRatio: '1 / 1',
            overflow: 'visible'
          }}
        >
          {/* Background zones inside the container - green (z-index 1) */}
          <div className="absolute inset-0 z-[1]">
            {/* Base green background */}
            <div className="absolute inset-0 bg-[#3fa653]" />
            
            {/* Green zones at top and bottom - angled/diagonal */}
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: '#3fa653',
                clipPath: `polygon(0 0, 50% ${GREEN_ZONE_DISTANCE}%, 100% 0)`
              }}
            />
            {/* Floating Names in Green Zone (Top) */}
            <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: `polygon(0 0, 50% ${GREEN_ZONE_DISTANCE}%, 100% 0)` }}>
               {players.filter(p => p.team === 'green').slice(0, Math.ceil(players.filter(p => p.team === 'green').length / 2)).map((p, i, arr) => (
                 <div 
                   key={`green-top-${i}`} 
                   className="absolute text-white font-bold text-shadow-md bg-black/20 px-3 py-1 rounded-full whitespace-nowrap text-xl md:text-2xl animate-pulse"
                   style={getFloatingStyle(i, arr.length, 'green-top')}
                 >
                   {p.name}
                 </div>
               ))}
            </div>

            <div
              className="absolute inset-0"
              style={{
                backgroundColor: '#3fa653',
                clipPath: `polygon(0 100%, 50% ${100 - GREEN_ZONE_DISTANCE}%, 100% 100%)`
              }}
            />
             {/* Floating Names in Green Zone (Bottom) */}
             <div className="absolute inset-0 overflow-hidden pointer-events-none" style={{ clipPath: `polygon(0 100%, 50% ${100 - GREEN_ZONE_DISTANCE}%, 100% 100%)` }}>
               {players.filter(p => p.team === 'green').slice(Math.ceil(players.filter(p => p.team === 'green').length / 2)).map((p, i, arr) => (
                 <div 
                   key={`green-bottom-${i}`} 
                   className="absolute text-white font-bold text-shadow-md bg-black/20 px-3 py-1 rounded-full whitespace-nowrap text-xl md:text-2xl animate-pulse"
                   style={getFloatingStyle(i, arr.length, 'green-bottom')}
                 >
                   {p.name}
                 </div>
               ))}
            </div>
          </div>
          
          {/* Orange zones wrapper - extends to viewport edges, ON TOP of green (z-index 5) */}
          <div className="absolute z-[5]" style={{ 
            left: 'calc(-50vw + 50%)', 
            top: 'calc(-50vh + 50%)',
            width: '100vw',
            height: '100vh',
            pointerEvents: 'none'
          }}>
            {/* Calculate inner edge positions based on responsive length parameter */}
            {(() => {
              // Inner edge spans orangeInnerEdgeLength% of height, centered
              const innerEdgeTop = 50 - (orangeInnerEdgeLength / 2);
              const innerEdgeBottom = 50 + (orangeInnerEdgeLength / 2);
              return (
                <>
                  {/* Left orange zone */}
                  <div
                    className="absolute"
                    style={{
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `calc(2.5vw + ${orangeZoneDistance}%)`,
                      backgroundColor: '#f4841f',
                      clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`
                    }}
                  >
                    {/* Floating Names in Orange Zone (Left) */}
                    <div className="relative w-full h-full overflow-hidden">
                      {players.filter(p => p.team === 'orange').slice(0, Math.ceil(players.filter(p => p.team === 'orange').length / 2)).map((p, i, arr) => (
                        <div 
                          key={`orange-left-${i}`} 
                          className="absolute text-white font-bold text-shadow-md bg-black/20 px-3 py-1 rounded-full whitespace-nowrap text-xl md:text-2xl animate-pulse"
                          style={getFloatingStyle(i, arr.length, 'orange-left')}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right orange zone */}
                  <div
                    className="absolute"
                    style={{
                      right: 0,
                      top: 0,
                      bottom: 0,
                      width: `calc(2.5vw + ${orangeZoneDistance}%)`,
                      backgroundColor: '#f4841f',
                      clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`,
                      transform: 'scaleX(-1)'
                    }}
                  >
                    {/* Floating Names in Orange Zone (Right) */}
                    {/* Note: Text will be flipped because of scaleX(-1). We need to unflip it. */}
                    <div className="relative w-full h-full overflow-hidden" style={{ transform: 'scaleX(-1)' }}>
                       {players.filter(p => p.team === 'orange').slice(Math.ceil(players.filter(p => p.team === 'orange').length / 2)).map((p, i, arr) => (
                        <div 
                          key={`orange-right-${i}`} 
                          className="absolute text-white font-bold text-shadow-md bg-black/20 px-3 py-1 rounded-full whitespace-nowrap text-xl md:text-2xl animate-pulse"
                          style={getFloatingStyle(i, arr.length, 'orange-right')}
                        >
                          {p.name}
                        </div>
                      ))}
                    </div>
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Hex grid on top */}
          <div className="absolute inset-0 flex items-center justify-center z-10" style={boardGlow}>
            <HexGrid 
              grid={grid} 
              size={HEX_SIZE} 
              onCellClick={handleCellClick}
            />
            {!isCreator && (
              <div className="absolute inset-0 z-20 cursor-default" />
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
