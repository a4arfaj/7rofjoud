import { useEffect, useRef, useState } from 'react';
import HexGrid from './components/HexGrid';
import Lobby from './components/Lobby';
import {
  generateHexGrid,
  checkWin,
  isGreenStart,
  isGreenEnd,
  isOrangeStart,
  isOrangeEnd,
} from './utils/hex';
import type { HexCellData } from './utils/hex';
import type { CSSProperties } from 'react';
import { ARABIC_LETTERS, HEX_SIZE, ORANGE_ZONE_DISTANCE, GREEN_ZONE_DISTANCE, ORANGE_INNER_EDGE_LENGTH } from './constants';
import { db } from './firebase';
import { ref, set, onValue, update, push } from 'firebase/database';

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
  const [winner, setWinner] = useState<'Orange' | 'Green' | null>(null);
  const [buzzer, setBuzzer] = useState<BuzzerState>({ active: false, playerName: null, timestamp: 0 });
  // Track all players in the room for the host
  const [players, setPlayers] = useState<Player[]>([]);
  
  const winnerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  // Responsive orange zone parameters - use smaller values when width < 430px
  const isSmallScreen = viewportWidth < 430;
  const orangeZoneDistance = isSmallScreen ? 20 : ORANGE_ZONE_DISTANCE;
  const orangeInnerEdgeLength = isSmallScreen ? 5 : ORANGE_INNER_EDGE_LENGTH;

  // Handle joining/creating room
  const handleJoinRoom = (id: string, creator: boolean, name: string) => {
    setRoomId(id);
    setIsCreator(creator);
    setPlayerName(name);
    
    // Assign team: Creator is Green (or random?), Joiners are Random
    // Let's make everyone random to be fair, or keep creator as Green default?
    // "teams should discied randomly" implies for everyone or at least competitors.
    // I'll make it random for everyone including creator, or just creator green for simplicity.
    // Let's make it random for everyone.
    const playerTeam = Math.random() > 0.5 ? 'green' : 'orange';

    if (creator) {
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
        alert("فشل في إنشاء الغرفة. تحقق من قاعدة البيانات والقواعد في Firebase Console.");
      });
    } else {
      // Joiner adds themselves to players list with random team
      const playerRef = ref(db, `rooms/${id}/players`);
      push(playerRef, { name, team: playerTeam });
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
        if (data.winner !== undefined) {
          setWinner(data.winner);
        }
        // Sync buzzer state
        if (data.buzzer) {
          setBuzzer(data.buzzer);
        }
        // Sync players list
        if (data.players) {
          // Convert object values to array
          // Data might be { "key1": {name: "A", team: "green"}, "key2": ... }
          const playerList = Object.values(data.players) as Player[];
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
    
    if (winner) return;

    // Optimistic update
    const newGrid = grid.map(cell => {
      if (cell.id === id) {
        return { ...cell, state: (cell.state + 1) % 3 as 0 | 1 | 2 };
      }
      return cell;
    });

    // Check win conditions locally first
    const orangeWin = checkWin(newGrid, 1, isOrangeStart, isOrangeEnd);
    const greenWin = checkWin(newGrid, 2, isGreenStart, isGreenEnd);
    
    let newWinner: 'Orange' | 'Green' | null = null;
    if (orangeWin) newWinner = 'Orange';
    else if (greenWin) newWinner = 'Green';

    // If in a room, push update to Firebase
    if (roomId) {
      update(ref(db, `rooms/${roomId}`), {
        grid: newGrid,
        winner: newWinner
      })
      .catch((err: any) => {
        console.error("Firebase Error (Update):", err);
        // Still update local state even if Firebase fails
        setGrid(newGrid);
        if (newWinner) setWinner(newWinner);
      });
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

  useEffect(() => {
    if (!winner) return;
    if (winnerTimeout.current) {
      clearTimeout(winnerTimeout.current);
    }
    
    winnerTimeout.current = setTimeout(() => {
      if (roomId && isCreator) {
         // Creator resets the DB state
         update(ref(db, `rooms/${roomId}`), { winner: null });
      } else if (!roomId) {
        setWinner(null);
      }
      winnerTimeout.current = null;
    }, 1600);
  }, [winner, roomId, isCreator]);

  useEffect(() => {
    return () => {
      if (winnerTimeout.current) {
        clearTimeout(winnerTimeout.current);
      }
    };
  }, []);

  // Track viewport width for responsive design
  useEffect(() => {
    const handleResize = () => {
      setViewportWidth(window.innerWidth);
    };
    
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const boardGlow: CSSProperties = {}; // No shadows

  // Helper to generate deterministic positions for floating names
  const getFloatingStyle = (name: string, zone: 'green-top' | 'green-bottom' | 'orange-left' | 'orange-right') => {
    // Simple deterministic "random" based on name
    let hash = 0;
    for (let i = 0; i < name.length; i++) {
      hash = name.charCodeAt(i) + ((hash << 5) - hash);
    }
    
    const rand1 = Math.abs(hash % 100) / 100; // 0 to 1
    const rand2 = Math.abs((hash >> 3) % 100) / 100; // 0 to 1

    // Adjust positions based on zone to ensure visibility within clip paths
    switch(zone) {
      case 'green-top':
        // Top V shape. Keep vertically small (0-10%) and horizontally centered (20-80%)
        return { 
          top: `${5 + rand1 * 10}%`, 
          left: `${15 + rand2 * 70}%`,
          transform: `rotate(${rand1 * 20 - 10}deg)`
        };
      case 'green-bottom':
        // Bottom V shape.
        return { 
          bottom: `${5 + rand1 * 10}%`, 
          left: `${15 + rand2 * 70}%`,
          transform: `rotate(${rand1 * 20 - 10}deg)`
        };
      case 'orange-left':
        // Left side.
        return { 
          top: `${10 + rand1 * 80}%`, 
          left: `${10 + rand2 * 40}%`, // Keep mostly to the left/outer side
          transform: `rotate(${rand1 * 20 - 10}deg)`
        };
      case 'orange-right':
        // Right side (container is flipped scaleX(-1))
        // So 'left' here visually means 'right' edge of the screen
        return { 
          top: `${10 + rand1 * 80}%`, 
          left: `${10 + rand2 * 40}%`,
          transform: `rotate(${rand1 * 20 - 10}deg)` // Rotation might need counter-flip if text wasn't un-flipped
        };
    }
    return {};
  };

  if (!roomId) {
    return <Lobby onJoinRoom={handleJoinRoom} />;
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
              <div className={`px-6 py-4 rounded-xl shadow-lg transition-all transform ${buzzer.active ? 'bg-green-500 text-white scale-110' : 'bg-white/80 text-gray-500'}`}>
                {buzzer.active ? (
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
                ) : (
                  <div className="text-center font-bold">بانتظار المتسابقين...</div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Right: Room Info */}
        <div className="pointer-events-auto flex flex-col items-end gap-2">
          <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow font-bold text-gray-800">
            غرفة: {roomId}
          </div>
          <div className="bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow font-bold text-gray-800 text-sm">
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
               {players.filter(p => p.team === 'green').slice(0, Math.ceil(players.filter(p => p.team === 'green').length / 2)).map((p, i) => (
                 <div 
                   key={`green-top-${i}`} 
                   className="absolute text-white font-bold text-shadow-md bg-black/20 px-2 rounded-full whitespace-nowrap text-sm md:text-base animate-pulse"
                   style={getFloatingStyle(p.name, 'green-top')}
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
               {players.filter(p => p.team === 'green').slice(Math.ceil(players.filter(p => p.team === 'green').length / 2)).map((p, i) => (
                 <div 
                   key={`green-bottom-${i}`} 
                   className="absolute text-white font-bold text-shadow-md bg-black/20 px-2 rounded-full whitespace-nowrap text-sm md:text-base animate-pulse"
                   style={getFloatingStyle(p.name, 'green-bottom')} // Different seed
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
                      {players.filter(p => p.team === 'orange').slice(0, Math.ceil(players.filter(p => p.team === 'orange').length / 2)).map((p, i) => (
                        <div 
                          key={`orange-left-${i}`} 
                          className="absolute text-white font-bold text-shadow-md bg-black/20 px-2 rounded-full whitespace-nowrap text-sm md:text-base animate-pulse"
                          style={getFloatingStyle(p.name, 'orange-left')}
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
                       {players.filter(p => p.team === 'orange').slice(Math.ceil(players.filter(p => p.team === 'orange').length / 2)).map((p, i) => (
                        <div 
                          key={`orange-right-${i}`} 
                          className="absolute text-white font-bold text-shadow-md bg-black/20 px-2 rounded-full whitespace-nowrap text-sm md:text-base animate-pulse"
                          style={getFloatingStyle(p.name, 'orange-right')}
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
