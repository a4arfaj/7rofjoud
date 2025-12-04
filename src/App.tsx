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
import { ref, set, onValue, update } from 'firebase/database';

function App() {
  const [roomId, setRoomId] = useState<string | null>(null);
  const [isCreator, setIsCreator] = useState(false);
  const [grid, setGrid] = useState<HexCellData[]>(() => generateHexGrid(ARABIC_LETTERS));
  const [winner, setWinner] = useState<'Orange' | 'Green' | null>(null);
  const winnerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [viewportWidth, setViewportWidth] = useState(window.innerWidth);

  // Responsive orange zone parameters - use smaller values when width < 430px
  const isSmallScreen = viewportWidth < 430;
  const orangeZoneDistance = isSmallScreen ? 20 : ORANGE_ZONE_DISTANCE;
  const orangeInnerEdgeLength = isSmallScreen ? 5 : ORANGE_INNER_EDGE_LENGTH;

  // Handle joining/creating room
  const handleJoinRoom = (id: string, creator: boolean) => {
    setRoomId(id);
    setIsCreator(creator);

    if (creator) {
      // Creator generates grid and pushes to Firebase
      const newGrid = generateHexGrid(ARABIC_LETTERS);
      setGrid(newGrid); // Set local state immediately
      set(ref(db, `rooms/${id}`), {
        grid: newGrid,
        winner: null,
        createdAt: Date.now()
      }).catch(err => console.error("Firebase Error:", err));
    }
  };

  // Sync with Firebase when in a room
  useEffect(() => {
    if (!roomId) return;

    const roomRef = ref(db, `rooms/${roomId}`);
    const unsubscribe = onValue(roomRef, (snapshot) => {
      const data = snapshot.val();
      if (data) {
        if (data.grid) setGrid(data.grid);
        if (data.winner !== undefined) setWinner(data.winner);
      }
    }, (error) => {
      console.error("Firebase sync error:", error);
    });

    return () => unsubscribe();
  }, [roomId]);

  const handleCellClick = (id: string) => {
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
      });
    } else {
      // Local play if somehow no roomId (fallback)
      setGrid(newGrid);
      if (newWinner) setWinner(newWinner);
    }
  };

  useEffect(() => {
    if (!winner) return;
    if (winnerTimeout.current) {
      clearTimeout(winnerTimeout.current);
    }
    // Only auto-reset winner if NOT in multiplayer (or handle reset differently)
    // For multiplayer, maybe we wait for explicit reset or just clear it locally after delay?
    // Let's keep the local effect for visual feedback, but the state source of truth is DB.
    // Actually, if we clear it locally, it might de-sync. 
    // Let's just auto-clear locally for effect, and maybe the DB resets?
    // The previous code auto-cleared winner after 1.6s.
    winnerTimeout.current = setTimeout(() => {
      if (roomId && isCreator) {
         // Only creator resets the DB state to avoid race conditions?
         // Or maybe we just let the local effect handle the visual "Reset" 
         // but keep the winner in DB until new game?
         // For simplicity, let's just clear local winner state for visual effect
         // BUT if we clear local state and DB still has winner, it might flicker back.
         // Let's update DB to null winner.
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

  if (!roomId) {
    return <Lobby onJoinRoom={handleJoinRoom} />;
  }

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#3fa653]">
      {/* Room ID Overlay */}
      <div className="absolute top-4 right-4 z-20 bg-white/80 backdrop-blur px-4 py-2 rounded-lg shadow font-bold text-gray-800">
        غرفة: {roomId}
      </div>

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
            <div
              className="absolute inset-0"
              style={{
                backgroundColor: '#3fa653',
                clipPath: `polygon(0 100%, 50% ${100 - GREEN_ZONE_DISTANCE}%, 100% 100%)`
              }}
            />
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
                  />
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
                  />
                </>
              );
            })()}
          </div>
          
          {/* Hex grid on top */}
          <div className="absolute inset-0 flex items-center justify-center z-10" style={boardGlow}>
            <HexGrid grid={grid} size={HEX_SIZE} onCellClick={handleCellClick} />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
