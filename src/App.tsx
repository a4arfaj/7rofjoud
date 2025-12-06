import { useEffect, useState, useRef } from 'react';
import HexGrid from './components/HexGrid';
import Lobby from './components/Lobby';
import Bubbles from './components/Bubbles';
import Bee from './components/Bee';
import {
  generateHexGrid,
} from './utils/hex';
import type { HexCellData } from './utils/hex';
import type { CSSProperties } from 'react';
import { ARABIC_LETTERS, HEX_SIZE, HONEYCOMB_HORIZONTAL_POSITION, ORANGE_INNER_EDGE_LENGTH, ORANGE_INNER_EDGE_WIDTH, ORANGE_INNER_EDGE_POSITION, ORANGE_OUTER_EDGE_LENGTH, ORANGE_OUTER_EDGE_OFFSET, GREEN_INNER_EDGE_WIDTH, GREEN_INNER_EDGE_POSITION, GREEN_OUTER_EDGE_LENGTH, GREEN_OUTER_EDGE_OFFSET, FRAME_BORDER_WIDTH, FRAME_BORDER_COLOR, FRAME_BORDER_RADIUS, FRAME_PADDING_EXTRA } from './constants';
import { db } from './firebase';
import { ref, set, onValue, update, get, onDisconnect, runTransaction, push, remove } from 'firebase/database';
import type { BubbleData, Player, BuzzerState } from './types';

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [playerName, setPlayerName] = useState('');
  const [grid, setGrid] = useState<HexCellData[]>(() => generateHexGrid(ARABIC_LETTERS));
  const [buzzer, setBuzzer] = useState<BuzzerState>({ active: false, playerName: null, timestamp: 0 });
  // Track all players in the room for the host
  const [players, setPlayers] = useState<Player[]>([]);
  const [bubbles, setBubbles] = useState<BubbleData[]>([]);
  const [selectionMode, setSelectionMode] = useState<'fill' | 'beam'>('fill');
  const [roomError, setRoomError] = useState<string>('');
  const [hostName, setHostName] = useState<string | null>(null);
  const [activeBeeCell, setActiveBeeCell] = useState<HexCellData | null>(null);
  const [beeStartTime, setBeeStartTime] = useState<number | null>(null);
  const lastBeeTimestampRef = useRef<number>(0);
  
  const prevBuzzerRef = useRef<BuzzerState>({ active: false, playerName: null, timestamp: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);

  // Initialize audio context on first user interaction
  const getAudioContext = async () => {
    if (!audioContextRef.current) {
      audioContextRef.current = new (window.AudioContext || (window as any).webkitAudioContext)();
    }
    // Resume context if suspended (required by browser autoplay policy)
    if (audioContextRef.current.state === 'suspended') {
      await audioContextRef.current.resume();
    }
    return audioContextRef.current;
  };

  // Sound functions using Web Audio API
  const playBuzzSound = async () => {
    try {
      const audioContext = await getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      oscillator.frequency.value = 800; // Buzzer frequency
      oscillator.type = 'square';
      
      gainNode.gain.setValueAtTime(0.3, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.2);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.2);
    } catch (error) {
      console.error('Error playing buzz sound:', error);
    }
  };

  const playWinSound = async () => {
    try {
      const audioContext = await getAudioContext();
      
      // Play a sequence of notes for win sound
      const notes = [523.25, 659.25, 783.99]; // C, E, G (C major chord)
      const noteDuration = 0.15;
      
      notes.forEach((freq, index) => {
        const oscillator = audioContext.createOscillator();
        const gainNode = audioContext.createGain();
        
        oscillator.connect(gainNode);
        gainNode.connect(audioContext.destination);
        
        oscillator.frequency.value = freq;
        oscillator.type = 'sine';
        
        const startTime = audioContext.currentTime + (index * noteDuration);
        gainNode.gain.setValueAtTime(0.3, startTime);
        gainNode.gain.exponentialRampToValueAtTime(0.01, startTime + noteDuration);
        
        oscillator.start(startTime);
        oscillator.stop(startTime + noteDuration);
      });
    } catch (error) {
      console.error('Error playing win sound:', error);
    }
  };

  const checkRoomExists = async (id: string): Promise<boolean> => {
    try {
      const roomRef = ref(db, `rooms/${id}`);
      const snapshot = await get(roomRef);
      return snapshot.exists();
    } catch (error) {
      console.error('Error checking room existence:', error);
      return false;
    }
  };

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
        selectionMode: 'fill',
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
    if (!roomId || !playerName) return;

    console.log("Setting up Firebase sync for room:", roomId);
    const roomRef = ref(db, `rooms/${roomId}`);
    const playerRef = ref(db, `rooms/${roomId}/players/${playerName}`);
    
    // Set up onDisconnect to remove player when they leave
    const disconnectRef = onDisconnect(playerRef);
    disconnectRef.remove().then(() => {
      console.log("onDisconnect handler set up for player:", playerName);
    }).catch((err: any) => {
      console.error("Failed to set up onDisconnect:", err);
    });
    
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      console.log("Firebase data received:", data);
      
      if (data) {
        if (data.grid && Array.isArray(data.grid)) {
          setGrid(data.grid);
        }
        // Sync buzzer state
        if (data.buzzer) {
          const newBuzzer = data.buzzer;
          const prevBuzzer = prevBuzzerRef.current;
          
          // Detect when buzzer becomes active
          if (newBuzzer.active && !prevBuzzer.active) {
            // Buzzer just became active - play win sound for the winner
            if (newBuzzer.playerName === playerName) {
              // This player won - play win sound
              playWinSound();
            } else {
              // Someone else won - play buzz sound
              playBuzzSound();
            }
          }
          
          prevBuzzerRef.current = newBuzzer;
          setBuzzer(newBuzzer);
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
        // Sync creatorName to identify host
        if (data.creatorName) {
            setHostName(data.creatorName);
        }
        // Sync selection mode
        if (data.selectionMode === 'beam' || data.selectionMode === 'fill') {
          setSelectionMode(data.selectionMode);
        } else {
          setSelectionMode('fill');
        }
        // Sync bee target
        if (data.beeTarget && data.beeTarget.timestamp > lastBeeTimestampRef.current) {
          lastBeeTimestampRef.current = data.beeTarget.timestamp;
          // Use functional update to ensure we have the latest grid
          // Actually we just set activeBeeCell, grid is updated via data.grid sync
          const targetCell = (data.grid || []).find((c: any) => c.id === data.beeTarget.id);
          if (targetCell) {
            setActiveBeeCell(targetCell);
            setBeeStartTime(data.beeTarget.timestamp); // Sync start time for all clients
          }
        } else if (!data.beeTarget && activeBeeCell) {
          // If beeTarget is cleared in Firebase, clear local state too
          setActiveBeeCell(null);
          setBeeStartTime(null);
        }
        // Sync bubbles
        if (data.bubbles) {
          const bubbleList = Object.entries(data.bubbles).map(([key, value]: [string, any]) => ({
            ...value,
            id: key,
            hasBee: value.hasBee || false // Ensure hasBee is always defined
          }));
          setBubbles(bubbleList);
        } else {
          setBubbles([]);
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
      // Cancel onDisconnect when component unmounts
      disconnectRef.cancel().catch((err: any) => {
        console.error("Failed to cancel onDisconnect:", err);
      });
    };
  }, [roomId, playerName]);

  const handleCellClick = (id: string) => {
    // Only creator (Host) can modify the grid
    if (!isCreator) return;

    // Find the clicked cell's current state
    const clickedCell = grid.find(cell => cell.id === id);
    if (!clickedCell) return;

    // Calculate new state for clicked cell
    const newState = (clickedCell.state + 1) % 4 as 0 | 1 | 2 | 3;

    // Allow free editing - cycle through 4 states: 0 (white) -> 1 (yellow) -> 2 (orange) -> 3 (green) -> 0
    // Special rule: Only one cell can be yellow at a time
    const newGrid = grid.map(cell => {
      if (cell.id === id) {
        // If clicking to make it yellow, ensure no other cell is yellow
        if (newState === 1) {
          return { ...cell, state: 1 as 0 | 1 | 2 | 3 };
        }
        return { ...cell, state: newState };
      }
      // If clicked cell is becoming yellow, turn any other yellow cell back to white
      if (newState === 1 && cell.state === 1) {
        return { ...cell, state: 0 as 0 | 1 | 2 | 3 };
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
    if (buzzer.active) return; // Local guard if state already active

    // Play buzz sound when button is pressed
    playBuzzSound();

    if (roomId) {
      const buzzerRef = ref(db, `rooms/${roomId}/buzzer`);
      runTransaction(buzzerRef, (current) => {
        if (!current || !current.active) {
          return {
            active: true,
            playerName,
            timestamp: Date.now()
          };
        }
        return current;
      }, { applyLocally: false }).catch((err: any) => {
        console.error('Firebase Error (Buzzer Transaction):', err);
      });
    }
  };

  // Host Bee Logic
  useEffect(() => {
    if (!isCreator || !roomId) return;
    
    const interval = setInterval(() => {
      setGrid(currentGrid => {
        // Find colored cells
        const coloredCells = currentGrid.filter(c => c.state === 2 || c.state === 3);
        if (coloredCells.length > 0) {
          const randomCell = coloredCells[Math.floor(Math.random() * coloredCells.length)];
          update(ref(db, `rooms/${roomId}`), {
            beeTarget: { id: randomCell.id, timestamp: Date.now() }
          });
        }
        return currentGrid;
      });
    }, 10000); // 10 seconds for testing (was 45000 + Math.random() * 30000)

    return () => clearInterval(interval);
  }, [isCreator, roomId]);

  const handleBeeReachTarget = () => {
    if (isCreator && activeBeeCell && roomId) {
      // Use activeBeeCell directly since it's the target
      // Verify it's still colored in the latest grid
      const currentCell = grid.find(c => c.id === activeBeeCell.id);
      if (currentCell && (currentCell.state === 2 || currentCell.state === 3)) {
         const index = grid.findIndex(c => c.id === activeBeeCell.id);
         if (index !== -1) {
           update(ref(db, `rooms/${roomId}/grid/${index}`), { state: 0 });
         }
      }
    }
  };

  const handleBeeFinish = () => {
    setActiveBeeCell(null);
    // Clear beeTarget from Firebase so next bee can spawn
    if (isCreator && roomId) {
      update(ref(db, `rooms/${roomId}`), {
        beeTarget: null
      });
    }
  };

  // Host Bubble Spawn Logic
  useEffect(() => {
    if (!isCreator || !roomId || players.length === 0) return;

    const spawnInterval = setInterval(() => {
      // Read current bubbles from Firebase to check limit
      get(ref(db, `rooms/${roomId}/bubbles`)).then((snapshot) => {
        const currentBubbles = snapshot.val();
        const bubbleCount = currentBubbles ? Object.keys(currentBubbles).length : 0;
        if (bubbleCount >= 8) return; // Limit max bubbles

        const randomPlayer = players[Math.floor(Math.random() * players.length)];
        const size = 60 + Math.random() * 40;
        
        const newBubble: Omit<BubbleData, 'id'> = {
          name: randomPlayer.name,
          x: 10 + Math.random() * 80,
          size,
          speed: 0.02 + Math.random() * 0.03,
          wobbleOffset: Math.random() * Math.PI * 2,
          spawnTime: Date.now(),
          popped: false,
          hasBee: Math.random() < 0.25 // 25% chance to have a bee
        };

        push(ref(db, `rooms/${roomId}/bubbles`), newBubble);
      }).catch((err: any) => {
        console.error("Error checking bubbles:", err);
      });
    }, 35000); // Spawn every 35 seconds

    // Cleanup old bubbles (older than 60s)
    const cleanupInterval = setInterval(() => {
      const now = Date.now();
      get(ref(db, `rooms/${roomId}/bubbles`)).then((snapshot) => {
        const currentBubbles = snapshot.val();
        if (!currentBubbles) return;
        
        Object.entries(currentBubbles).forEach(([key, value]: [string, any]) => {
          const b = value as BubbleData;
          if ((b.popped && b.popTime && now - b.popTime > 5000) || (now - b.spawnTime > 60000)) {
            remove(ref(db, `rooms/${roomId}/bubbles/${key}`));
          }
        });
      }).catch((err: any) => {
        console.error("Error cleaning up bubbles:", err);
      });
    }, 10000);

    return () => {
      clearInterval(spawnInterval);
      clearInterval(cleanupInterval);
    };
  }, [isCreator, roomId, players]);

  const handleBubblePop = (id: string) => {
    if (!roomId) return;
    update(ref(db, `rooms/${roomId}/bubbles/${id}`), {
      popped: true,
      popTime: Date.now()
    });
  };

  const handleSelectionModeToggle = () => {
    if (!isCreator || !roomId) return;
    const nextMode: 'fill' | 'beam' = selectionMode === 'fill' ? 'beam' : 'fill';
    setSelectionMode(nextMode);
    update(ref(db, `rooms/${roomId}`), {
      selectionMode: nextMode
    });
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

    // Adjust positions based on zone - more centralized, moved further away from grid
    switch(zone) {
      case 'green-top':
        // Top V shape - centered horizontally around 50%, moved further up (35% instead of 40%)
        return { 
          top: '35%', 
          left: `calc(50% + ${offset}%)`,
          transform: 'translateX(-50%)'
        };
      case 'green-bottom':
        // Bottom V shape - centered horizontally, moved further down (35% instead of 40%)
        return { 
          bottom: '35%', 
          left: `calc(50% + ${offset}%)`,
          transform: 'translateX(-50%)'
        };
      case 'orange-left':
        // Left side - centered vertically around 50%, moved further left (40% instead of 50%)
        return { 
          top: `calc(50% + ${offset}%)`, 
          left: '40%',
          transform: 'translate(-50%, -50%)'
        };
      case 'orange-right':
        // Right side - centered vertically, moved further right (40% instead of 50%)
        return { 
          top: `calc(50% + ${offset}%)`, 
          left: '40%',
          transform: 'translate(-50%, -50%)'
        };
    }
    return {};
  };

  if (!roomId) {
    return <Lobby onJoinRoom={handleJoinRoom} checkRoomExists={checkRoomExists} roomError={roomError} />;
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
                      استانف الأزرار
                    </button>
                  </div>
                </div>
              )}
              <button
                onClick={handleSelectionModeToggle}
                className="px-4 py-2 rounded-xl bg-white/15 backdrop-blur text-white font-bold shadow hover:bg-white/25 transition-colors text-sm"
              >
                وضع التحديد: {selectionMode === 'fill' ? 'تلوين' : 'شعاع'}
              </button>
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


      {/* Guest Layout: Honeycomb/Zones in Top Frame, Buzzer in Bottom Frame with Padding */}
      {!isCreator ? (
        <div className="flex flex-col h-screen w-full overflow-hidden bg-[#5e35b1]">
           {/* Top Frame: Game Board & Zones */}
           <div className="flex-grow relative w-full flex items-center justify-center overflow-hidden">
             {/* Bubbles Overlay */}
             <Bubbles bubbles={bubbles} onPop={handleBubblePop} />
             

              {/* Green zones - positioned relative to grid container */}
              <div 
                className="absolute z-[2] pointer-events-none"
                style={{
                  left: '50%',
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'min(90vw, 60vh)',
                  height: 'min(90vw, 60vh)',
                  maxWidth: '800px',
                  maxHeight: '800px',
                  aspectRatio: '1 / 1'
                }}
              >
                {/* Green zones at top and bottom - aligned to grid edges */}
                {/* GREEN_INNER_EDGE_POSITION moves inner edge vertically (positive = toward center) */}
                {/* GREEN_OUTER_EDGE_LENGTH controls the horizontal length of the outer edge */}
                {(() => {
                  const outerEdgeLeft = 50 - (GREEN_OUTER_EDGE_LENGTH / 2);
                  return (
                    <>
                      <div
                        className="absolute"
                        style={{
                          left: `${outerEdgeLeft}%`,
                          width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                          top: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                          height: `${GREEN_INNER_EDGE_WIDTH}%`,
                          backgroundColor: '#3fa653',
                          clipPath: `polygon(0 0, 50% 100%, 100% 0)`
                        }}
                      />
                      {/* Floating Names in Green Zone (Top) */}
                      <div className="absolute overflow-hidden pointer-events-none z-30" style={{
                        left: `${outerEdgeLeft}%`,
                        width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                        top: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                        height: `${GREEN_INNER_EDGE_WIDTH}%`,
                        clipPath: `polygon(0 0, 50% 100%, 100% 0)`
                      }}>
                   {players.filter(p => p.team === 'green' && p.name !== hostName)
                   .slice(0, Math.ceil(players.filter(p => p.team === 'green' && p.name !== hostName).length / 2)).map((p, i, arr) => (
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
                        className="absolute"
                        style={{
                          left: `${outerEdgeLeft}%`,
                          width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                          bottom: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                          height: `${GREEN_INNER_EDGE_WIDTH}%`,
                          backgroundColor: '#3fa653',
                          clipPath: `polygon(0 100%, 50% 0, 100% 100%)`
                        }}
                      />
                       {/* Floating Names in Green Zone (Bottom) */}
                       <div className="absolute overflow-hidden pointer-events-none z-30" style={{
                         left: `${outerEdgeLeft}%`,
                         width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                         bottom: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                         height: `${GREEN_INNER_EDGE_WIDTH}%`,
                         clipPath: `polygon(0 100%, 50% 0, 100% 100%)`
                       }}>
                         {players.filter(p => p.team === 'green' && p.name !== hostName)
                         .slice(Math.ceil(players.filter(p => p.team === 'green' && p.name !== hostName).length / 2)).map((p, i, arr) => (
                           <div 
                             key={`green-bottom-${i}`} 
                             className="absolute text-white font-bold text-shadow-md bg-black/20 px-3 py-1 rounded-full whitespace-nowrap text-xl md:text-2xl animate-pulse"
                             style={getFloatingStyle(i, arr.length, 'green-bottom')}
                           >
                             {p.name}
                           </div>
                         ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {/* Orange zones - positioned relative to grid container, ON TOP of green (z-index 5) */}
              {/* Position zones relative to the grid container using CSS calc */}
              <div 
                className="absolute z-[5] pointer-events-none"
                style={{
                  // Position to match grid container: centered, min(90vw, 60vh) with max 800px
                  left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}%)`,
                  top: '50%',
                  transform: 'translate(-50%, -50%)',
                  width: 'min(90vw, 60vh)',
                  height: 'min(90vw, 60vh)',
                  maxWidth: '800px',
                  maxHeight: '800px',
                  aspectRatio: '1 / 1'
                }}
              >
                {(() => {
                  // Inner edges are positioned relative to grid container (100% = full grid height)
                  // ORANGE_INNER_EDGE_LENGTH is % of grid height
                  // ORANGE_INNER_EDGE_POSITION moves inner edge horizontally (positive = toward center)
                  const innerEdgeTop = 50 - (ORANGE_INNER_EDGE_LENGTH / 2);
                  const innerEdgeBottom = 50 + (ORANGE_INNER_EDGE_LENGTH / 2);
                  // ORANGE_OUTER_EDGE_LENGTH controls the vertical length of the outer edge
                  const outerEdgeTop = 50 - (ORANGE_OUTER_EDGE_LENGTH / 2);
                  
                  return (
                    <>
                      {/* Left orange zone */}
                      <div
                        className="absolute"
                        style={{
                          left: `calc(-${ORANGE_INNER_EDGE_WIDTH}% - ${ORANGE_OUTER_EDGE_OFFSET}% + ${ORANGE_INNER_EDGE_POSITION}%)`,
                          top: `${outerEdgeTop}%`,
                          height: `${ORANGE_OUTER_EDGE_LENGTH}%`,
                          width: `${ORANGE_INNER_EDGE_WIDTH}%`,
                          backgroundColor: '#f4841f',
                          clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`
                        }}
                      >
                        {/* Floating Names in Orange Zone (Left) */}
                        <div className="relative w-full h-full overflow-hidden z-30">
                          {players.filter(p => p.team === 'orange' && p.name !== hostName)
                          .slice(0, Math.ceil(players.filter(p => p.team === 'orange' && p.name !== hostName).length / 2)).map((p, i, arr) => (
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
                          right: `calc(-${ORANGE_INNER_EDGE_WIDTH}% - ${ORANGE_OUTER_EDGE_OFFSET}% + ${ORANGE_INNER_EDGE_POSITION}%)`,
                          top: `${outerEdgeTop}%`,
                          height: `${ORANGE_OUTER_EDGE_LENGTH}%`,
                          width: `${ORANGE_INNER_EDGE_WIDTH}%`,
                          backgroundColor: '#f4841f',
                          clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`,
                          transform: 'scaleX(-1)'
                        }}
                      >
                        {/* Floating Names in Orange Zone (Right) */}
                        {/* Note: Text will be flipped because of scaleX(-1). We need to unflip it. */}
                        <div className="relative w-full h-full overflow-hidden z-30" style={{ transform: 'scaleX(-1)' }}>
                           {players.filter(p => p.team === 'orange' && p.name !== hostName)
                           .slice(Math.ceil(players.filter(p => p.team === 'orange' && p.name !== hostName).length / 2)).map((p, i, arr) => (
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

              {/* Game container that scales uniformly - scaled down slightly for guest view */}
              <div 
                className="relative z-10"
                style={{
                  left: `${HONEYCOMB_HORIZONTAL_POSITION}%`,
                  width: 'min(90vw, 60vh)', // Reduced height constraint for guests
                  height: 'min(90vw, 60vh)',
                  maxWidth: '800px',
                  maxHeight: '800px',
                  aspectRatio: '1 / 1',
                  overflow: 'visible'
                }}
              >
                {/* Real frame around zones for guest view - extends to cover outer edges */}
                {(() => {
                  // Calculate the maximum extension of zones beyond the container
                  // Green zones extend up/down by: GREEN_INNER_EDGE_WIDTH + abs(GREEN_OUTER_EDGE_OFFSET) - GREEN_INNER_EDGE_POSITION
                  const greenTopExtension = (GREEN_INNER_EDGE_WIDTH + Math.abs(GREEN_OUTER_EDGE_OFFSET)) * 0.01;
                  const greenBottomExtension = (GREEN_INNER_EDGE_WIDTH + Math.abs(GREEN_OUTER_EDGE_OFFSET)) * 0.01;
                  // Orange zones extend left/right by: ORANGE_INNER_EDGE_WIDTH + ORANGE_OUTER_EDGE_OFFSET
                  const orangeLeftExtension = (ORANGE_INNER_EDGE_WIDTH + Math.abs(ORANGE_OUTER_EDGE_OFFSET)) * 0.01;
                  const orangeRightExtension = (ORANGE_INNER_EDGE_WIDTH + Math.abs(ORANGE_OUTER_EDGE_OFFSET)) * 0.01;
                  
                  // Base container size
                  const baseSize = 'min(90vw, 60vh)';
                  const baseMaxSize = '800px';
                  
                  return (
                    <div 
                      className="absolute z-[6] pointer-events-none"
                      style={{
                        left: `calc(50% - ${Math.max(orangeLeftExtension, orangeRightExtension) * 100}%)`,
                        top: `calc(50% - ${Math.max(greenTopExtension, greenBottomExtension) * 100}%)`,
                        transform: 'translate(-50%, -50%)',
                        width: `calc(${baseSize} + ${(Math.max(orangeLeftExtension, orangeRightExtension) * 200)}% + ${FRAME_PADDING_EXTRA * 2}%)`,
                        height: `calc(${baseSize} + ${(Math.max(greenTopExtension, greenBottomExtension) * 200)}% + ${FRAME_PADDING_EXTRA * 2}%)`,
                        maxWidth: `calc(${baseMaxSize} + ${(Math.max(orangeLeftExtension, orangeRightExtension) * 800)}px + ${FRAME_PADDING_EXTRA * 16}px)`,
                        maxHeight: `calc(${baseMaxSize} + ${(Math.max(greenTopExtension, greenBottomExtension) * 800)}px + ${FRAME_PADDING_EXTRA * 16}px)`,
                        border: `${FRAME_BORDER_WIDTH}px solid ${FRAME_BORDER_COLOR}`,
                        borderRadius: `${FRAME_BORDER_RADIUS}px`,
                        boxShadow: 'inset 0 0 40px rgba(255, 255, 255, 0.1), 0 0 60px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                  );
                })()}
                {/* Hex grid on top */}
                <div className="absolute inset-0 flex items-center justify-center" style={boardGlow}>
                  <HexGrid 
                    grid={grid} 
                    size={HEX_SIZE} 
                    onCellClick={handleCellClick}
                    selectionMode={selectionMode}
                  />
                  {activeBeeCell && (
                    <Bee 
                      targetCell={activeBeeCell} 
                      onReachTarget={handleBeeReachTarget} 
                      onFinish={handleBeeFinish} 
                      hexSize={HEX_SIZE}
                      grid={grid}
                      startTime={beeStartTime || undefined}
                    />
                  )}
                  <div className="absolute inset-0 z-20 cursor-default" />
                </div>
              </div>
           </div>

           {/* Bottom Frame: Buzzer */}
           <div className="flex-shrink-0 w-full bg-[#5e35b1] pb-8 pt-4 flex justify-center items-center z-50 border-t-4 border-white/20 shadow-[0_-4px_20px_rgba(0,0,0,0.3)]">
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
                    ? (buzzer.playerName === playerName ? '!أنت' : buzzer.playerName)
                    : '!اضغط'}
                </span>
        </button>
           </div>
        </div>
      ) : (
      /* Host UI: Full Screen Game Board */
      <div className="relative w-full h-screen flex items-center justify-center bg-[#5e35b1]">
        {/* Bubbles Overlay */}
        <Bubbles bubbles={bubbles} onPop={handleBubblePop} />
        
        {/* Game container that scales uniformly */}
        <div 
          className="relative z-10"
          style={{
            width: 'min(95vw, 95vh)',
            height: 'min(95vw, 95vh)',
            maxWidth: '900px',
            maxHeight: '900px',
            aspectRatio: '1 / 1',
            overflow: 'visible'
          }}
        >
          {/* Real frame around zones - extends to cover outer edges */}
          {(() => {
            // Calculate the maximum extension of zones beyond the container
            // Green zones extend up/down by: GREEN_INNER_EDGE_WIDTH + abs(GREEN_OUTER_EDGE_OFFSET) - GREEN_INNER_EDGE_POSITION
            const greenTopExtension = (GREEN_INNER_EDGE_WIDTH + Math.abs(GREEN_OUTER_EDGE_OFFSET)) * 0.01;
            const greenBottomExtension = (GREEN_INNER_EDGE_WIDTH + Math.abs(GREEN_OUTER_EDGE_OFFSET)) * 0.01;
            // Orange zones extend left/right by: ORANGE_INNER_EDGE_WIDTH + ORANGE_OUTER_EDGE_OFFSET
            const orangeLeftExtension = (ORANGE_INNER_EDGE_WIDTH + Math.abs(ORANGE_OUTER_EDGE_OFFSET)) * 0.01;
            const orangeRightExtension = (ORANGE_INNER_EDGE_WIDTH + Math.abs(ORANGE_OUTER_EDGE_OFFSET)) * 0.01;
            
            // Base container size
            const baseSize = 'min(95vw, 95vh)';
            const baseMaxSize = '900px';
            
            return (
              <div 
                className="absolute z-[6] pointer-events-none"
                style={{
                  left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}% - ${Math.max(orangeLeftExtension, orangeRightExtension) * 100}%)`,
                  top: `calc(50% - ${Math.max(greenTopExtension, greenBottomExtension) * 100}%)`,
                  transform: 'translate(-50%, -50%)',
                  width: `calc(${baseSize} + ${(Math.max(orangeLeftExtension, orangeRightExtension) * 200)}% + ${FRAME_PADDING_EXTRA * 2}%)`,
                  height: `calc(${baseSize} + ${(Math.max(greenTopExtension, greenBottomExtension) * 200)}% + ${FRAME_PADDING_EXTRA * 2}%)`,
                  maxWidth: `calc(${baseMaxSize} + ${(Math.max(orangeLeftExtension, orangeRightExtension) * 900)}px + ${FRAME_PADDING_EXTRA * 18}px)`,
                  maxHeight: `calc(${baseMaxSize} + ${(Math.max(greenTopExtension, greenBottomExtension) * 900)}px + ${FRAME_PADDING_EXTRA * 18}px)`,
                  border: `${FRAME_BORDER_WIDTH}px solid ${FRAME_BORDER_COLOR}`,
                  borderRadius: `${FRAME_BORDER_RADIUS}px`,
                  boxShadow: 'inset 0 0 40px rgba(255, 255, 255, 0.1), 0 0 60px rgba(0, 0, 0, 0.5)'
                }}
              />
            );
          })()}

          {/* Green zones - positioned relative to grid container */}
          <div 
            className="absolute z-[2] pointer-events-none"
            style={{
              left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}%)`,
              top: '50%',
              transform: 'translate(-50%, -50%)',
              width: 'min(95vw, 95vh)',
              height: 'min(95vw, 95vh)',
              maxWidth: '900px',
              maxHeight: '900px',
              aspectRatio: '1 / 1'
            }}
          >
            {/* Green zones at top and bottom - aligned to grid edges */}
            {/* GREEN_INNER_EDGE_POSITION moves inner edge vertically (positive = toward center) */}
            {/* GREEN_OUTER_EDGE_LENGTH controls the horizontal length of the outer edge */}
            {(() => {
              const outerEdgeLeft = 50 - (GREEN_OUTER_EDGE_LENGTH / 2);
              return (
                <>
                  <div
                    className="absolute"
                    style={{
                      left: `${outerEdgeLeft}%`,
                      width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                      top: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                      height: `${GREEN_INNER_EDGE_WIDTH}%`,
                      backgroundColor: '#3fa653',
                      clipPath: `polygon(0 0, 50% 100%, 100% 0)`
                    }}
                  />
                  {/* Floating Names in Green Zone (Top) */}
                  <div className="absolute overflow-hidden pointer-events-none z-30" style={{
                    left: `${outerEdgeLeft}%`,
                    width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                    top: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                    height: `${GREEN_INNER_EDGE_WIDTH}%`,
                    clipPath: `polygon(0 0, 50% 100%, 100% 0)`
                  }}>
                     {players.filter(p => p.team === 'green' && p.name !== hostName)
                     .slice(0, Math.ceil(players.filter(p => p.team === 'green' && p.name !== hostName).length / 2)).map((p, i, arr) => (
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
                    className="absolute"
                    style={{
                      left: `${outerEdgeLeft}%`,
                      width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                      bottom: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                      height: `${GREEN_INNER_EDGE_WIDTH}%`,
                      backgroundColor: '#3fa653',
                      clipPath: `polygon(0 100%, 50% 0, 100% 100%)`
                    }}
                  />
                   {/* Floating Names in Green Zone (Bottom) */}
                   <div className="absolute overflow-hidden pointer-events-none z-30" style={{
                     left: `${outerEdgeLeft}%`,
                     width: `${GREEN_OUTER_EDGE_LENGTH}%`,
                     bottom: `calc(-${GREEN_INNER_EDGE_WIDTH}% - ${GREEN_OUTER_EDGE_OFFSET}% + ${GREEN_INNER_EDGE_POSITION}%)`,
                     height: `${GREEN_INNER_EDGE_WIDTH}%`,
                     clipPath: `polygon(0 100%, 50% 0, 100% 100%)`
                   }}>
                     {players.filter(p => p.team === 'green' && p.name !== hostName)
                     .slice(Math.ceil(players.filter(p => p.team === 'green' && p.name !== hostName).length / 2)).map((p, i, arr) => (
                       <div 
                         key={`green-bottom-${i}`} 
                         className="absolute text-white font-bold text-shadow-md bg-black/20 px-3 py-1 rounded-full whitespace-nowrap text-xl md:text-2xl animate-pulse"
                         style={getFloatingStyle(i, arr.length, 'green-bottom')}
                       >
                         {p.name}
                       </div>
                     ))}
                  </div>
                </>
              );
            })()}
          </div>
          
          {/* Orange zones wrapper - positioned relative to grid, extends to viewport edges, ON TOP of green (z-index 5) */}
          <div className="absolute z-[5]" style={{ 
            left: '50%',
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(95vw, 95vh)',
            height: 'min(95vw, 95vh)',
            maxWidth: '900px',
            maxHeight: '900px',
            aspectRatio: '1 / 1',
            pointerEvents: 'none'
          }}>
                {/* Calculate inner edge positions relative to grid container */}
                {/* ORANGE_INNER_EDGE_POSITION moves inner edge horizontally (positive = toward center) */}
                {/* ORANGE_OUTER_EDGE_LENGTH controls the vertical length of the outer edge */}
                {(() => {
                  // Inner edges are positioned relative to grid container (100% = full grid height)
                  // ORANGE_INNER_EDGE_LENGTH is % of grid height
                  const innerEdgeTop = 50 - (ORANGE_INNER_EDGE_LENGTH / 2);
                  const innerEdgeBottom = 50 + (ORANGE_INNER_EDGE_LENGTH / 2);
                  // ORANGE_OUTER_EDGE_LENGTH controls the vertical length of the outer edge
                  const outerEdgeTop = 50 - (ORANGE_OUTER_EDGE_LENGTH / 2);
              return (
                <>
                  {/* Left orange zone */}
                  <div
                    className="absolute"
                    style={{
                      left: `calc(-${ORANGE_INNER_EDGE_WIDTH}% - ${ORANGE_OUTER_EDGE_OFFSET}% + ${ORANGE_INNER_EDGE_POSITION}%)`,
                      top: `${outerEdgeTop}%`,
                      height: `${ORANGE_OUTER_EDGE_LENGTH}%`,
                      width: `calc(${ORANGE_INNER_EDGE_WIDTH}% + ${ORANGE_OUTER_EDGE_OFFSET}%)`,
                      backgroundColor: '#f4841f',
                      clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`
                    }}
                  >
                    {/* Floating Names in Orange Zone (Left) */}
                    <div className="relative w-full h-full overflow-hidden">
                      {players.filter(p => p.team === 'orange' && p.name !== hostName)
                      .slice(0, Math.ceil(players.filter(p => p.team === 'orange' && p.name !== hostName).length / 2)).map((p, i, arr) => (
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
                      right: `calc(-${ORANGE_INNER_EDGE_WIDTH}% - ${ORANGE_OUTER_EDGE_OFFSET}% + ${ORANGE_INNER_EDGE_POSITION}%)`,
                      top: `${outerEdgeTop}%`,
                      height: `${ORANGE_OUTER_EDGE_LENGTH}%`,
                      width: `calc(${ORANGE_INNER_EDGE_WIDTH}% + ${ORANGE_OUTER_EDGE_OFFSET}%)`,
                      backgroundColor: '#f4841f',
                      clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`,
                      transform: 'scaleX(-1)'
                    }}
                  >
                    {/* Floating Names in Orange Zone (Right) */}
                    {/* Note: Text will be flipped because of scaleX(-1). We need to unflip it. */}
                    <div className="relative w-full h-full overflow-hidden" style={{ transform: 'scaleX(-1)' }}>
                       {players.filter(p => p.team === 'orange' && p.name !== hostName)
                       .slice(Math.ceil(players.filter(p => p.team === 'orange' && p.name !== hostName).length / 2)).map((p, i, arr) => (
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
              selectionMode={selectionMode}
            />
            {activeBeeCell && (
              <Bee 
                targetCell={activeBeeCell} 
                onReachTarget={handleBeeReachTarget} 
                onFinish={handleBeeFinish} 
                hexSize={HEX_SIZE}
                grid={grid}
                startTime={beeStartTime || undefined}
              />
            )}
          </div>
        </div>
      </div>
      )}
    </div>
  );
}

export default App;
