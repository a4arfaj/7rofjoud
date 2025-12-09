import { useEffect, useMemo, useState, useRef } from 'react';
import type { CSSProperties } from 'react';
import HexGrid from './components/HexGrid';
import Lobby from './components/Lobby';
import Bubbles from './components/Bubbles';
import Bee from './components/Bee';
import SettingsMenu from './components/SettingsMenu';
import PlayerListMenu from './components/PlayerListMenu';
import ResetOverlay from './components/ResetOverlay';
import FloatingCard from './components/FloatingCard';
import { generateHexGrid, hexToPixel } from './utils/hex';
import type { HexCellData } from './utils/hex';
import { toArabicNumerals } from './utils/numerals';
import {
  ARABIC_LETTERS,
  HEX_SIZE,
  HONEYCOMB_HORIZONTAL_POSITION,
  ORANGE_INNER_EDGE_LENGTH,
  ORANGE_INNER_EDGE_WIDTH,
  ORANGE_INNER_EDGE_POSITION,
  ORANGE_OUTER_EDGE_LENGTH,
  ORANGE_OUTER_EDGE_OFFSET,
  GREEN_INNER_EDGE_WIDTH,
  GREEN_INNER_EDGE_POSITION,
  GREEN_OUTER_EDGE_LENGTH,
  GREEN_OUTER_EDGE_OFFSET,
  WATER_INNER_EDGE_WIDTH,
  WATER_INNER_EDGE_POSITION,
  WATER_OUTER_EDGE_LENGTH,
  WATER_OUTER_EDGE_OFFSET,
  WATER_LOWER_EDGE_POSITION,
  WATER_POSITION_OFFSET_X,
  WATER_POSITION_OFFSET_Y,
  WATER_ZONE_BUBBLE_OFFSET_X,
  WATER_ZONE_BUBBLE_OFFSET_Y,
  WATER_ZONE_BUBBLE_START_TOP,
  WATER_ZONE_BUBBLE_POSITIONS,
  FRAME_BORDER_WIDTH,
  FRAME_BORDER_COLOR,
  FRAME_BORDER_RADIUS,
  FRAME_PADDING_HORIZONTAL,
  FRAME_PADDING_VERTICAL,
  FRAME_POSITION_OFFSET_X,
  FRAME_POSITION_OFFSET_Y,
  COLOR_THEMES,
} from './constants';
import { db } from './firebase';
import { ref, set, onValue, update, get, onDisconnect, runTransaction, push, remove } from 'firebase/database';
import type { BubbleData, Player, BuzzerState, ResetTimer } from './types';

const RANDOM_SPIN_DURATION_MS = 3000;

function shuffleArray<T>(items: T[]): T[] {
  const arr = [...items];
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function buildSlowdownDelays(totalMs: number, startIntervalMs: number, multiplier: number, maxIntervalMs: number): number[] {
  const delays: number[] = [];
  let remaining = totalMs;
  let current = startIntervalMs;

  while (remaining > 0) {
    const next = Math.min(current, remaining);

    // If the final slice would be shorter than the previous interval,
    // merge it into the previous one to avoid a last-second speedup.
    if (remaining <= current && delays.length > 0 && next < delays[delays.length - 1]) {
      delays[delays.length - 1] += remaining;
      break;
    }

    delays.push(next);
    remaining -= next;
    current = Math.min(Math.round(current * multiplier), maxIntervalMs);
  }

  return delays;
}

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
  const [activeBeeCell, setActiveBeeCell] = useState<HexCellData | null>(null);
  const [beeStartTime, setBeeStartTime] = useState<number | null>(null);
  const lastBeeTimestampRef = useRef<number>(0);
  const beeSchedulerTimeoutRef = useRef<number | null>(null);
  const randomSelectionTimeoutsRef = useRef<number[]>([]);
  const [isRandomSelecting, setIsRandomSelecting] = useState(false);
  
  // Settings State
  const [showSettings, setShowSettings] = useState(false);
  const [showPlayerList, setShowPlayerList] = useState(false);
  const settingsRef = useRef<HTMLDivElement>(null);
  const playerListRef = useRef<HTMLDivElement>(null);
  const settingsButtonRef = useRef<HTMLButtonElement>(null);
  const playerListButtonRef = useRef<HTMLButtonElement>(null);
  const [showShuffleConfirm, setShowShuffleConfirm] = useState(false);
  const [zoneColors, setZoneColors] = useState({ orange: '#f4841f', green: '#3fa653' });
  const [gameSettings, setGameSettings] = useState({
    showBee: true,
    showBubbles: true
  });

  const activeThemeId = useMemo(() => {
    const match = COLOR_THEMES.find(
      (theme) => theme.orange === zoneColors.orange && theme.green === zoneColors.green
    );
    return match?.id ?? 'custom';
  }, [zoneColors]);
  const isFireIce = activeThemeId === 'fireice';
  
  // Reset Timer State
  const [resetTimer, setResetTimer] = useState<ResetTimer | null>(null);
  const resetTimerIntervalRef = useRef<number | null>(null);
  const lastBuzzerPlayerRef = useRef<string | null>(null);
  const [showCard, setShowCard] = useState(false);
  // Red is allowed by default; becomes disallowed only when red ends naturally.
  const allowRedRef = useRef<boolean>(true);
  
  const prevBuzzerRef = useRef<BuzzerState>({ active: false, playerName: null, timestamp: 0 });
  const audioContextRef = useRef<AudioContext | null>(null);
  
  const hasUncoloredCells = useMemo(() => grid.some((cell) => cell.state === 0), [grid]);

  const clearRandomSelectionTimers = () => {
    randomSelectionTimeoutsRef.current.forEach((t) => clearTimeout(t));
    randomSelectionTimeoutsRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearRandomSelectionTimers();
    };
  }, []);

  // Click outside to close menus
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      
      // Close settings if clicking outside
      if (showSettings && 
          settingsRef.current && 
          !settingsRef.current.contains(target) &&
          settingsButtonRef.current &&
          !settingsButtonRef.current.contains(target)) {
        setShowSettings(false);
      }
      
      // Close player list if clicking outside
      if (showPlayerList && 
          playerListRef.current && 
          !playerListRef.current.contains(target) &&
          playerListButtonRef.current &&
          !playerListButtonRef.current.contains(target)) {
        setShowPlayerList(false);
      }
    };

    if (showSettings || showPlayerList) {
      document.addEventListener('mousedown', handleClickOutside);
      return () => {
        document.removeEventListener('mousedown', handleClickOutside);
      };
    }
  }, [showSettings, showPlayerList]);

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

  const playTimesUpSound = async () => {
    try {
      const audioContext = await getAudioContext();
      const oscillator = audioContext.createOscillator();
      const gainNode = audioContext.createGain();
      
      oscillator.connect(gainNode);
      gainNode.connect(audioContext.destination);
      
      // Lower pitch, descending tone for "times up"
      oscillator.frequency.setValueAtTime(400, audioContext.currentTime);
      oscillator.frequency.exponentialRampToValueAtTime(200, audioContext.currentTime + 0.5);
      oscillator.type = 'sawtooth';
      
      gainNode.gain.setValueAtTime(0.4, audioContext.currentTime);
      gainNode.gain.exponentialRampToValueAtTime(0.01, audioContext.currentTime + 0.5);
      
      oscillator.start(audioContext.currentTime);
      oscillator.stop(audioContext.currentTime + 0.5);
    } catch (error) {
      console.error('Error playing times up sound:', error);
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
        players: { [name]: initialPlayer }, // Store as object key->value
        settings: {
          zoneColors: { orange: '#f4841f', green: '#3fa653' },
          gameSettings: { showBee: true, showBubbles: true }
        }
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
            // Only the winner hears the win sound; others silent
            if (newBuzzer.playerName === playerName) {
              playWinSound();
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
        // Sync selection mode
        if (data.selectionMode === 'beam' || data.selectionMode === 'fill') {
          setSelectionMode(data.selectionMode);
        } else {
          setSelectionMode('fill');
        }
        
        // Sync settings
        if (data.settings) {
          if (data.settings.zoneColors) setZoneColors(data.settings.zoneColors);
          if (data.settings.gameSettings) setGameSettings(data.settings.gameSettings);
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
    
    // Clear existing target if bee is disabled
    if (!gameSettings.showBee) {
      if (activeBeeCell) {
        update(ref(db, `rooms/${roomId}`), { beeTarget: null });
        setActiveBeeCell(null);
      }
      return;
    }
    
    const scheduleNextBee = () => {
      // Random interval between 70-80 seconds
      const intervalMs = 70000 + Math.random() * 10000; // 70-80 seconds
      
      beeSchedulerTimeoutRef.current = window.setTimeout(() => {
        // 50% chance that bee comes at all
        if (Math.random() < 0.5) {
          setGrid(currentGrid => {
            // Pick Real Target (Random Cell)
            const realTarget = currentGrid[Math.floor(Math.random() * currentGrid.length)];
            
            // 30% chance to fake a cell (fake-out)
            const shouldFake = Math.random() < 0.3;
            
            if (shouldFake && currentGrid.length > 1) {
              // Fake-out path: fly to fake target first, then redirect
              // 1. Pick Fake Target (different from real)
              let fakeTarget = currentGrid[Math.floor(Math.random() * currentGrid.length)];
              while (fakeTarget.id === realTarget.id) {
                fakeTarget = currentGrid[Math.floor(Math.random() * currentGrid.length)];
              }

              // 2. Start flight to Fake Target
              const now = Date.now();
              update(ref(db, `rooms/${roomId}`), {
                beeTarget: { id: fakeTarget.id, timestamp: now }
              });

              // Calculate flight time to fake target to ensure we switch BEFORE landing
              const centers = currentGrid.map(c => hexToPixel(c, HEX_SIZE));
              if (centers.length > 0) {
                const xs = centers.map(p => p.x);
                const ys = centers.map(p => p.y);
                const minX = Math.min(...xs);
                const minY = Math.min(...ys);
                const maxY = Math.max(...ys);
                const padding = HEX_SIZE * 1.6;
                
                // Bee start pos (from Bee.tsx)
                const startX = (minX - padding) - 100;
                const viewBoxHeight = (maxY - minY) + padding * 2;
                const startY = (minY - padding) + viewBoxHeight / 2;
                
                const targetPixel = hexToPixel(fakeTarget, HEX_SIZE);
                const dist = Math.sqrt(Math.pow(targetPixel.x - startX, 2) + Math.pow(targetPixel.y - startY, 2));
                const flightDuration = (dist / 80) * 1000; // 80px/s speed
                
                // Switch at 50-55% of the way (well before landing)
                // Ensure we switch early enough so bee never lands on fake target
                // Calculate switch time: use 50% of flight duration, but cap it to ensure we're always before landing
                const switchPercentage = 0.50; // Switch at 50% of flight
                const safetyMargin = 800; // Safety margin: always switch at least 800ms before landing
                const switchTime = Math.min(
                  flightDuration * switchPercentage, // 50% of flight
                  flightDuration - safetyMargin      // Always at least 800ms before landing
                );

                // Switch to Real Target mid-flight (Fake-out) - MUST happen before landing
                // Use the calculated switch time with a minimum to ensure it always executes
                const finalSwitchTime = Math.max(500, switchTime);
                setTimeout(() => {
                   update(ref(db, `rooms/${roomId}`), {
                      beeTarget: { id: realTarget.id, timestamp: Date.now() }
                   });
                }, finalSwitchTime);
              } else {
                 // Fallback if grid empty
                 setTimeout(() => {
                   update(ref(db, `rooms/${roomId}`), {
                      beeTarget: { id: realTarget.id, timestamp: Date.now() }
                   });
                 }, 2500);
              }
            } else {
              // Direct path: fly straight to real target (no fake-out)
              const now = Date.now();
              update(ref(db, `rooms/${roomId}`), {
                beeTarget: { id: realTarget.id, timestamp: now }
              });
            }

            return currentGrid;
          });
        }
        
        // Schedule next bee (recursive)
        scheduleNextBee();
      }, intervalMs);
    };

    // Start first bee after initial delay
    scheduleNextBee();
    
    return () => {
      if (beeSchedulerTimeoutRef.current !== null) {
        clearTimeout(beeSchedulerTimeoutRef.current);
        beeSchedulerTimeoutRef.current = null;
      }
    };
  }, [isCreator, roomId, gameSettings.showBee]);

  const handleBeeReachTarget = () => {
    if (isCreator && activeBeeCell && roomId) {
      const currentCell = grid.find(c => c.id === activeBeeCell.id);
      if (currentCell) {
         const index = grid.findIndex(c => c.id === activeBeeCell.id);
         if (index !== -1) {
           if (currentCell.state === 2 || currentCell.state === 3) {
             // If colored, clear it
             update(ref(db, `rooms/${roomId}/grid/${index}`), { state: 0 });
           } else {
             // If uncolored, 1% chance to color randomly
             if (Math.random() < 0.01) {
               const newState = Math.random() < 0.5 ? 2 : 3; // orange or green
               update(ref(db, `rooms/${roomId}/grid/${index}`), { state: newState });
             }
           }
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
    if (!isCreator || !roomId || players.length === 0 || !gameSettings.showBubbles) return;

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
  }, [isCreator, roomId, players, gameSettings.showBubbles]); // Added gameSettings.showBubbles dependency

  const handleBubblePop = (id: string) => {
    if (!roomId) return;
    update(ref(db, `rooms/${roomId}/bubbles/${id}`), {
      popped: true,
      popTime: Date.now()
    });
  };

  const handleSelectionModeToggle = (mode: 'fill' | 'beam') => {
    if (!isCreator || !roomId) return;
    setSelectionMode(mode);
    update(ref(db, `rooms/${roomId}`), {
      selectionMode: mode
    });
  };

  const handleSettingChange = (key: string, value: any) => {
    if (!isCreator || !roomId) return;
    
    if (key === 'theme') {
      const selectedTheme = COLOR_THEMES.find(t => t.id === value);
      if (selectedTheme) {
        const newColors = { orange: selectedTheme.orange, green: selectedTheme.green };
        setZoneColors(newColors);
        update(ref(db, `rooms/${roomId}/settings/zoneColors`), newColors);
      }
    } else {
      const newSettings = { ...gameSettings, [key]: value };
      setGameSettings(newSettings);
      update(ref(db, `rooms/${roomId}/settings/gameSettings`), newSettings);
    }
  };

  const performShuffleLetters = () => {
    const lettersPool: string[] = [];
    while (lettersPool.length < grid.length) {
      lettersPool.push(...shuffleArray(ARABIC_LETTERS));
    }
    const newGrid = grid.map((cell, idx) => ({
      ...cell,
      letter: lettersPool[idx] ?? cell.letter,
      state: 0 as 0 | 1 | 2 | 3
    }));
    setGrid(newGrid);
    if (roomId) {
      update(ref(db, `rooms/${roomId}`), { grid: newGrid }).catch((err: any) => {
        console.error('Firebase Error (Shuffle Letters):', err);
      });
    }
  };

  const handleShuffleRequest = () => {
    if (!isCreator) return;
    setShowShuffleConfirm(true);
  };

  const handleShuffleConfirm = () => {
    performShuffleLetters();
    setShowShuffleConfirm(false);
  };

  const handleShuffleCancel = () => {
    setShowShuffleConfirm(false);
  };

  const handleRandomLetterSelect = () => {
    if (!isCreator || isRandomSelecting || !hasUncoloredCells) return;

    const available = grid.filter((cell) => cell.state === 0);
    if (available.length === 0) return;

    clearRandomSelectionTimers();
    setIsRandomSelecting(true);

    const baseGrid = grid.map((cell) => (cell.state === 1 ? { ...cell, state: 0 as 0 | 1 | 2 | 3 } : cell));
    const delays = buildSlowdownDelays(RANDOM_SPIN_DURATION_MS, 70, 1.18, 450);
    const finalCell = available[Math.floor(Math.random() * available.length)];

    let elapsed = 0;
    delays.forEach((interval, idx) => {
      elapsed += interval;
      const isFinal = idx === delays.length - 1;
      const timeoutId = window.setTimeout(() => {
        const targetCell = isFinal
          ? finalCell
          : available[Math.floor(Math.random() * available.length)];
        const nextGrid = baseGrid.map((cell) =>
          cell.id === targetCell.id ? { ...cell, state: 1 as 0 | 1 | 2 | 3 } : cell
        );
        setGrid(nextGrid);

        if (isFinal) {
          if (roomId) {
            update(ref(db, `rooms/${roomId}`), { grid: nextGrid })
              .catch((err: any) => {
                console.error('Firebase Error (Random Select):', err);
              })
              .finally(() => {
                setIsRandomSelecting(false);
                clearRandomSelectionTimers();
              });
          } else {
            setIsRandomSelecting(false);
            clearRandomSelectionTimers();
          }
        }
      }, elapsed);
      randomSelectionTimeoutsRef.current.push(timeoutId);
    });
  };

  // Auto-start timer when buzzer becomes active and track last player
  useEffect(() => {
    if (buzzer.active && buzzer.playerName) {
      // Update last buzzer player
      lastBuzzerPlayerRef.current = buzzer.playerName;

      // Start green immediately on press (if no timer running)
      if (!resetTimer) {
        setShowCard(false);
        setResetTimer({ active: true, phase: 'initial', time: 4 });
      }
    }
  }, [buzzer.active, buzzer.playerName, buzzer.timestamp]);

  // Reset Timer Effect
  useEffect(() => {
    if (!resetTimer || !resetTimer.active) {
      if (resetTimerIntervalRef.current) {
        window.clearInterval(resetTimerIntervalRef.current);
        resetTimerIntervalRef.current = null;
      }
      return;
    }

    resetTimerIntervalRef.current = window.setInterval(() => {
      setResetTimer(current => {
        if (!current) return null;

        if (current.time <= 1) {
          // Phase transition or reset
          if (current.phase === 'initial') {
            // Play times up sound when 4 seconds finish (host only)
            if (isCreator) playTimesUpSound();
            // If red allowed, go to red; otherwise end and show card
            if (allowRedRef.current) {
              return { active: true, phase: 'countdown', time: 15 };
            }
            // red not allowed: reset buzzer and show card
            if (roomId) {
              update(ref(db, `rooms/${roomId}/buzzer`), {
                active: false,
                playerName: null,
                timestamp: 0
              });
            }
            setShowCard(true);
            return null;
          } else {
            // Countdown finished - reset buzzer and show card, and DISALLOW red until card is pressed
            if (roomId) {
              update(ref(db, `rooms/${roomId}/buzzer`), {
                active: false,
                playerName: null,
                timestamp: 0
              });
            }
            setShowCard(true);
            allowRedRef.current = false; // only re-allowed when card button pressed
            return null;
          }
        }

        return { ...current, time: current.time - 1 };
      });
    }, 1000);

    return () => {
      if (resetTimerIntervalRef.current) {
        window.clearInterval(resetTimerIntervalRef.current);
        resetTimerIntervalRef.current = null;
      }
    };
  }, [resetTimer, roomId]);

  // Handle Start Red Phase (manually triggered)
  const handleStartRedPhase = () => {
    if (!isCreator) return;
    // Card acknowledged, hide it; re-allow red for next cycle
    setShowCard(false);
    allowRedRef.current = true;
  };

  // When entering a room, allow red for the first green completion
  useEffect(() => {
    if (roomId) {
    }
  }, [roomId]);

  // Win detection disabled - free editing enabled


  const boardGlowStyle: CSSProperties = {}; // No shadows

  // Handle Reset Buzzer (Host) - manual reset in red; do not show card
  const handleResetBuzzer = () => {
    if (!isCreator) return;
    if (roomId) {
      update(ref(db, `rooms/${roomId}/buzzer`), {
        active: false,
        playerName: null,
        timestamp: 0
      });
    }
    setResetTimer(null);
    setShowCard(false); // manual reset: keep card hidden
    if (resetTimerIntervalRef.current) {
      window.clearInterval(resetTimerIntervalRef.current);
      resetTimerIntervalRef.current = null;
    }
  };


  if (!roomId) {
    return <Lobby onJoinRoom={handleJoinRoom} checkRoomExists={checkRoomExists} roomError={roomError} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#3fa653] font-['Cairo']" dir="rtl">
      {showShuffleConfirm && (
        <div className="fixed inset-0 z-[70] flex items-center justify-center bg-black/60 backdrop-blur-sm">
          <div className="bg-white rounded-xl shadow-2xl p-6 w-[90%] max-w-md text-center space-y-4">
            <div className="text-xl font-bold text-gray-900">أمتأكد أنك تريد خبصها؟</div>
            <div className="flex justify-center gap-3">
              <button
                onClick={handleShuffleConfirm}
                className="px-4 py-2 rounded-lg bg-green-600 text-white font-bold hover:bg-green-700 transition-colors"
              >
                نعم
              </button>
              <button
                onClick={handleShuffleCancel}
                className="px-4 py-2 rounded-lg bg-gray-200 text-gray-800 font-bold hover:bg-gray-300 transition-colors"
              >
                لا
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Top UI Layer */}
      <div className="absolute top-0 left-0 right-0 z-50 p-2 sm:p-4 flex justify-between items-start pointer-events-none" style={{ paddingTop: 'max(env(safe-area-inset-top), 8px)' }}>
        {/* Right: Host Controls (only visible to Host) */}
        <div className="pointer-events-auto flex flex-col gap-2">
          {isCreator && (
            <>
              <div className="flex gap-2">
                <button
                  ref={settingsButtonRef}
                  onClick={() => setShowSettings(!showSettings)}
                  className="bg-white/20 backdrop-blur hover:bg-white/30 text-white p-2 rounded-lg shadow transition-colors"
                  title="الإعدادات"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                </button>
                <button
                  ref={playerListButtonRef}
                  onClick={() => setShowPlayerList(!showPlayerList)}
                  className="bg-white/20 backdrop-blur hover:bg-white/30 text-white px-4 py-2 rounded-lg shadow transition-colors font-bold"
                >
                  👥 اللاعبين ({players.length})
                </button>
              </div>
              <div className="flex gap-2">
                        <button
                  onClick={handleShuffleRequest}
                  className="bg-white/20 backdrop-blur hover:bg-white/30 text-white px-4 py-2 rounded-lg shadow transition-colors font-bold"
                  title="خلط الحروف"
                  aria-label="خلط الحروف"
                >
                  🔀
                        </button>
                        <button
                  onClick={handleRandomLetterSelect}
                  disabled={isRandomSelecting || !hasUncoloredCells}
                  className={`px-4 py-2 rounded-lg shadow font-bold transition-colors backdrop-blur ${
                    isRandomSelecting || !hasUncoloredCells
                      ? 'bg-white/10 text-white/70 cursor-not-allowed'
                      : 'bg-white/20 text-white hover:bg-white/30'
                  }`}
                  title="اختيار حرف عشوائي من الخلايا غير الملونة"
                  aria-label="اختيار حرف عشوائي من الخلايا غير الملونة"
                >
                  {isRandomSelecting ? '⏳' : '🎲'}
                        </button>
                    </div>

              <SettingsMenu
                show={showSettings}
                settingsRef={settingsRef}
                selectionMode={selectionMode}
                onSelectionModeChange={handleSelectionModeToggle}
                gameSettings={gameSettings}
                zoneColors={zoneColors}
                onSettingChange={handleSettingChange}
              />

              <PlayerListMenu show={showPlayerList} playerListRef={playerListRef} players={players} />

              {/* Reset Timer Full Screen Overlay - Shows when timer is running */}
              <ResetOverlay
                timer={resetTimer}
                playerName={lastBuzzerPlayerRef.current}
                toArabicNumerals={toArabicNumerals}
                onReset={handleResetBuzzer}
              />

              <FloatingCard
                visible={isCreator && showCard && (!resetTimer || resetTimer.phase !== 'countdown')}
                label={lastBuzzerPlayerRef.current || buzzer.playerName || '---'}
                onStartRedPhase={handleStartRedPhase}
              />
            </>
          )}
        </div>

        {/* Left: Room Info with Padding */}
        <div className="pointer-events-auto flex flex-col items-start gap-2 pr-4" dir="rtl">
          <div className="bg-white/10 backdrop-blur px-4 py-2 rounded-lg shadow font-bold text-white">
            غرفة: {toArabicNumerals(roomId)}
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
             

            {/* Zones overlay (green/blue) */}
              <div 
            className="absolute z-[2] pointer-events-none"
                style={{
              left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}% + ${(isFireIce ? WATER_POSITION_OFFSET_X : 0)}%)`,
              top: `calc(50% + ${(isFireIce ? WATER_POSITION_OFFSET_Y : 0)}%)`,
                  transform: 'translate(-50%, -50%)',
                  width: 'min(90vw, 60vh)',
                  height: 'min(90vw, 60vh)',
                  maxWidth: '800px',
                  maxHeight: '800px',
                aspectRatio: '1 / 1',
                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.25))'
                }}
              >
                {/* Green zones at top and bottom - aligned to grid edges */}
                {/* GREEN_INNER_EDGE_POSITION moves inner edge vertically (positive = toward center) */}
                {/* GREEN_OUTER_EDGE_LENGTH controls the horizontal length of the outer edge */}
                {(() => {
                  const innerWidth = isFireIce ? WATER_INNER_EDGE_WIDTH : GREEN_INNER_EDGE_WIDTH;
                  const innerPos = isFireIce ? WATER_INNER_EDGE_POSITION : GREEN_INNER_EDGE_POSITION;
                  const outerLength = isFireIce ? WATER_OUTER_EDGE_LENGTH : GREEN_OUTER_EDGE_LENGTH;
                  const outerOffset = isFireIce ? WATER_OUTER_EDGE_OFFSET : GREEN_OUTER_EDGE_OFFSET;
                  const outerEdgeLeft = 50 - (outerLength / 2);
                  const waterFill = 'linear-gradient(180deg, #bbdefb 0%, #64b5f6 55%, #0d47a1 100%)';

                  // Bubble positions for water zones (similar to cells method)
                  // For top triangle: bubbles start near bottom (high %) and rise up
                  // For bottom triangle: bubbles start near top (low %) and rise up
                  const zoneBubbles = isFireIce ? WATER_ZONE_BUBBLE_POSITIONS.map(b => ({
                    left: `${b.left + WATER_ZONE_BUBBLE_OFFSET_X}%`,
                    size: `${b.size}px`,
                    delay: `${b.delay}s`
                  })) : [];

                  return (
                    <>
                      <div
                        className={`absolute ${isFireIce ? 'water-zone' : ''}`}
                        style={{
                          left: `${outerEdgeLeft}%`,
                          width: `${outerLength}%`,
                          top: `calc(-${innerWidth}% - ${outerOffset}% + ${innerPos}%)`,
                          height: `${innerWidth}%`,
                          background: isFireIce ? waterFill : zoneColors.green,
                          clipPath: `polygon(0 0, 50% 100%, 100% 0)`
                        }}
                      />

                      <div
                        className={`absolute ${isFireIce ? 'water-zone' : ''}`}
                        style={{
                          left: `${outerEdgeLeft}%`,
                          width: `${outerLength}%`,
                          bottom: `calc(-${innerWidth}% - ${outerOffset}% + ${innerPos}% + ${(isFireIce ? WATER_LOWER_EDGE_POSITION : 0)}%)`,
                          height: `${innerWidth}%`,
                          background: isFireIce ? waterFill : zoneColors.green,
                          clipPath: `polygon(0 100%, 50% 0, 100% 100%)`
                        }}
                      />
                      {/* Separate bubble container without clip-path so bubbles can be visible outside */}
                      {isFireIce && (
                        <div
                          className="absolute"
                          style={{
                            left: `${outerEdgeLeft}%`,
                            width: `${outerLength}%`,
                            bottom: `calc(-${innerWidth}% - ${outerOffset}% + ${innerPos}% + ${(isFireIce ? WATER_LOWER_EDGE_POSITION : 0)}%)`,
                            height: `${innerWidth}%`,
                            overflow: 'visible',
                            pointerEvents: 'none',
                            zIndex: 3,
                          }}
                        >
                          {zoneBubbles.map((bubble, idx) => (
                            <div
                              key={`bottom-zone-bubble-${idx}`}
                              className="water-zone-bubble"
                              style={{
                                position: 'absolute',
                                left: bubble.left,
                                top: `${WATER_ZONE_BUBBLE_START_TOP - WATER_ZONE_BUBBLE_OFFSET_Y}%`, // Start near top of triangle (which is the bottom of the zone)
                                width: bubble.size,
                                height: bubble.size,
                                borderRadius: '50%',
                                backgroundColor: 'rgba(255, 255, 255, 0.8)',
                                mixBlendMode: 'screen',
                                animation: `water-zone-bubble-rise 12s ease-in-out infinite`,
                                animationDelay: bubble.delay,
                                pointerEvents: 'none',
                                willChange: 'transform',
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </>
                  );
                })()}
              </div>

            {/* Zones overlay (orange/red) */}
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
                aspectRatio: '1 / 1',
                filter: 'drop-shadow(0 0 10px rgba(0,0,0,0.3))'
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
                          backgroundColor: zoneColors.orange,
                          clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`
                        }}
                      />

                      {/* Right orange zone */}
                      <div
                        className="absolute"
                        style={{
                          right: `calc(-${ORANGE_INNER_EDGE_WIDTH}% - ${ORANGE_OUTER_EDGE_OFFSET}% + ${ORANGE_INNER_EDGE_POSITION}%)`,
                          top: `${outerEdgeTop}%`,
                          height: `${ORANGE_OUTER_EDGE_LENGTH}%`,
                          width: `${ORANGE_INNER_EDGE_WIDTH}%`,
                          backgroundColor: zoneColors.orange,
                          clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`,
                          transform: 'scaleX(-1)'
                        }}
                      />
                    </>
                  );
                })()}
              </div>

              {/* Game container that scales uniformly - scaled down slightly for guest view */}
              <div 
                className="relative z-10"
                style={{
                  left: `${HONEYCOMB_HORIZONTAL_POSITION}%`,
                width: 'min(90vw, 60vh)',
                  height: 'min(90vw, 60vh)',
                  maxWidth: '800px',
                  maxHeight: '800px',
                  aspectRatio: '1 / 1',
                  overflow: 'visible'
                }}
              >
                {/* Real frame around zones for guest view - extends to cover outer edges */}
                {(() => {
                  const baseSize = 'min(90vw, 60vh)';
                  const baseMaxSize = '800px';
                  
                  return (
                    <div 
                      className="absolute z-[6] pointer-events-none"
                      style={{
                        left: `calc(50% + ${FRAME_POSITION_OFFSET_X}%)`,
                        top: `calc(50% + ${FRAME_POSITION_OFFSET_Y}%)`,
                        transform: 'translate(-50%, -50%)',
                        width: `calc(${baseSize} + ${FRAME_PADDING_HORIZONTAL}%)`,
                        height: `calc(${baseSize} + ${FRAME_PADDING_VERTICAL}%)`,
                        maxWidth: `calc(${baseMaxSize} + ${FRAME_PADDING_HORIZONTAL * 8}px)`,
                        maxHeight: `calc(${baseMaxSize} + ${FRAME_PADDING_VERTICAL * 8}px)`,
                        border: `${FRAME_BORDER_WIDTH}px solid ${FRAME_BORDER_COLOR}`,
                        borderRadius: `${FRAME_BORDER_RADIUS}px`,
                        boxShadow: 'inset 0 0 40px rgba(255, 255, 255, 0.1), 0 0 60px rgba(0, 0, 0, 0.5)'
                      }}
                    />
                  );
                })()}
                {/* Hex grid on top */}
              <div className="absolute inset-0 flex items-center justify-center" style={boardGlowStyle}>
                  <HexGrid 
                    grid={grid} 
                    size={HEX_SIZE} 
                    onCellClick={handleCellClick}
                    selectionMode={selectionMode}
                    orangeColor={zoneColors.orange}
                    greenColor={zoneColors.green}
                    themeId={activeThemeId}
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
                    ? (buzzer.playerName === playerName ? 'أنت' : buzzer.playerName)
                    : 'اضغط'}
                </span>
        </button>
           </div>
        </div>
      ) : (
      /* Host UI: Full Screen Game Board */
      <div className="relative w-full h-screen flex items-center justify-center bg-[#5e35b1]" style={{ 
        paddingTop: 'max(80px, env(safe-area-inset-top))',
        paddingBottom: showCard ? '140px' : '20px',
        paddingLeft: 'max(env(safe-area-inset-left), 0px)',
        paddingRight: 'max(env(safe-area-inset-right), 0px)'
      }}>
        {/* Bubbles Overlay */}
        <Bubbles bubbles={bubbles} onPop={handleBubblePop} />
        
        {/* Game container that scales uniformly */}
        <div 
          className="relative z-10"
          style={{
            width: 'min(90vw, calc(95vh - 100px))',
            height: 'min(90vw, calc(95vh - 100px))',
            maxWidth: '900px',
            maxHeight: '900px',
            aspectRatio: '1 / 1',
            overflow: 'visible'
          }}
        >
          {/* Real frame around zones - extends to cover outer edges */}
          {(() => {
              const baseSize = 'min(90vw, calc(95vh - 100px))';
            const baseMaxSize = '900px';
            
            return (
              <div 
                className="absolute z-[6] pointer-events-none"
                style={{
                  left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}% + ${FRAME_POSITION_OFFSET_X}%)`,
                  top: `calc(50% + ${FRAME_POSITION_OFFSET_Y}%)`,
                  transform: 'translate(-50%, -50%)',
                  width: `calc(${baseSize} + ${FRAME_PADDING_HORIZONTAL}%)`,
                  height: `calc(${baseSize} + ${FRAME_PADDING_VERTICAL}%)`,
                  maxWidth: `calc(${baseMaxSize} + ${FRAME_PADDING_HORIZONTAL * 9}px)`,
                  maxHeight: `calc(${baseMaxSize} + ${FRAME_PADDING_VERTICAL * 9}px)`,
                  border: `${FRAME_BORDER_WIDTH}px solid ${FRAME_BORDER_COLOR}`,
                  borderRadius: `${FRAME_BORDER_RADIUS}px`,
                  boxShadow: 'inset 0 0 40px rgba(255, 255, 255, 0.1), 0 0 60px rgba(0, 0, 0, 0.5)'
                }}
              />
            );
          })()}

          {/* Zones overlay (green/blue) */}
          <div 
            className="absolute z-[2] pointer-events-none"
            style={{
              left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}% + ${(isFireIce ? WATER_POSITION_OFFSET_X : 0)}%)`,
              top: `calc(50% + ${(isFireIce ? WATER_POSITION_OFFSET_Y : 0)}%)`,
              transform: 'translate(-50%, -50%)',
              width: 'min(90vw, calc(95vh - 100px))',
              height: 'min(90vw, calc(95vh - 100px))',
              maxWidth: '900px',
              maxHeight: '900px',
              aspectRatio: '1 / 1',
              filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.25))'
            }}
          >
            {/* Green zones at top and bottom - aligned to grid edges */}
            {/* GREEN_INNER_EDGE_POSITION moves inner edge vertically (positive = toward center) */}
            {/* GREEN_OUTER_EDGE_LENGTH controls the horizontal length of the outer edge */}
            {(() => {
              const innerWidth = isFireIce ? WATER_INNER_EDGE_WIDTH : GREEN_INNER_EDGE_WIDTH;
              const innerPos = isFireIce ? WATER_INNER_EDGE_POSITION : GREEN_INNER_EDGE_POSITION;
              const outerLength = isFireIce ? WATER_OUTER_EDGE_LENGTH : GREEN_OUTER_EDGE_LENGTH;
              const outerOffset = isFireIce ? WATER_OUTER_EDGE_OFFSET : GREEN_OUTER_EDGE_OFFSET;
              const outerEdgeLeft = 50 - (outerLength / 2);
              const waterFill = 'linear-gradient(180deg, #bbdefb 0%, #64b5f6 55%, #0d47a1 100%)';

              // Bubble positions for water zones (similar to cells method)
              // For top triangle: bubbles start near bottom (high %) and rise up
              // For bottom triangle: bubbles start near top (low %) and rise up
              const zoneBubbles = isFireIce ? WATER_ZONE_BUBBLE_POSITIONS.map(b => ({
                left: `${b.left + WATER_ZONE_BUBBLE_OFFSET_X}%`,
                size: `${b.size}px`,
                delay: `${b.delay}s`
              })) : [];

              return (
                <>
                  <div
                    className={`absolute ${isFireIce ? 'water-zone' : ''}`}
                    style={{
                      left: `${outerEdgeLeft}%`,
                      width: `${outerLength}%`,
                      top: `calc(-${innerWidth}% - ${outerOffset}% + ${innerPos}%)`,
                      height: `${innerWidth}%`,
                      background: isFireIce ? waterFill : zoneColors.green,
                      clipPath: `polygon(0 0, 50% 100%, 100% 0)`
                    }}
                  />

                  <div
                    className={`absolute ${isFireIce ? 'water-zone' : ''}`}
                    style={{
                      left: `${outerEdgeLeft}%`,
                      width: `${outerLength}%`,
                      bottom: `calc(-${innerWidth}% - ${outerOffset}% + ${innerPos}% + ${(isFireIce ? WATER_LOWER_EDGE_POSITION : 0)}%)`,
                      height: `${innerWidth}%`,
                      background: isFireIce ? waterFill : zoneColors.green,
                      clipPath: `polygon(0 100%, 50% 0, 100% 100%)`
                    }}
                  />
                  {/* Separate bubble container without clip-path so bubbles can be visible outside */}
                  {isFireIce && (
                    <div
                      className="absolute"
                      style={{
                        left: `${outerEdgeLeft}%`,
                        width: `${outerLength}%`,
                        bottom: `calc(-${innerWidth}% - ${outerOffset}% + ${innerPos}% + ${(isFireIce ? WATER_LOWER_EDGE_POSITION : 0)}%)`,
                        height: `${innerWidth}%`,
                        overflow: 'visible',
                        pointerEvents: 'none',
                        zIndex: 3,
                      }}
                    >
                      {zoneBubbles.map((bubble, idx) => (
                        <div
                          key={`bottom-zone-bubble-${idx}`}
                          className="water-zone-bubble"
                          style={{
                            position: 'absolute',
                            left: bubble.left,
                            top: `${WATER_ZONE_BUBBLE_START_TOP - WATER_ZONE_BUBBLE_OFFSET_Y}%`, // Start near top of triangle (which is the bottom of the zone)
                            width: bubble.size,
                            height: bubble.size,
                            borderRadius: '50%',
                            backgroundColor: 'rgba(255, 255, 255, 0.8)',
                            mixBlendMode: 'screen',
                            animation: `water-zone-bubble-rise 8s ease-in-out infinite`,
                            animationDelay: bubble.delay,
                            pointerEvents: 'none',
                            willChange: 'transform',
                          }}
                        />
                      ))}
                    </div>
                  )}
                </>
              );
            })()}
          </div>
          
          {/* Zones overlay (orange/red) */}
          <div className="absolute z-[5]" style={{ 
            left: `calc(50% + ${HONEYCOMB_HORIZONTAL_POSITION}%)`,
            top: '50%',
            transform: 'translate(-50%, -50%)',
            width: 'min(90vw, calc(95vh - 100px))',
            height: 'min(90vw, calc(95vh - 100px))',
            maxWidth: '900px',
            maxHeight: '900px',
            aspectRatio: '1 / 1',
            pointerEvents: 'none',
            filter: 'drop-shadow(0 0 12px rgba(0,0,0,0.3))'
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
                      backgroundColor: zoneColors.orange,
                      clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`
                    }}
                  />

                  {/* Right orange zone */}
                  <div
                    className="absolute"
                    style={{
                      right: `calc(-${ORANGE_INNER_EDGE_WIDTH}% - ${ORANGE_OUTER_EDGE_OFFSET}% + ${ORANGE_INNER_EDGE_POSITION}%)`,
                      top: `${outerEdgeTop}%`,
                      height: `${ORANGE_OUTER_EDGE_LENGTH}%`,
                      width: `calc(${ORANGE_INNER_EDGE_WIDTH}% + ${ORANGE_OUTER_EDGE_OFFSET}%)`,
                      backgroundColor: zoneColors.orange,
                      clipPath: `polygon(0 0, 100% ${innerEdgeTop}%, 100% ${innerEdgeBottom}%, 0 100%)`,
                      transform: 'scaleX(-1)'
                    }}
                  />
                </>
              );
            })()}
          </div>
          
          {/* Hex grid on top */}
            <div className="absolute inset-0 flex items-center justify-center z-10" style={boardGlowStyle}>
            <HexGrid 
              grid={grid} 
              size={HEX_SIZE} 
              onCellClick={handleCellClick}
              selectionMode={selectionMode}
              orangeColor={zoneColors.orange}
              greenColor={zoneColors.green}
              themeId={activeThemeId}
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
