import { useEffect, useRef, useState } from 'react';
import HexGrid from './components/HexGrid';
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

function App() {
  const [grid, setGrid] = useState<HexCellData[]>(() => generateHexGrid(ARABIC_LETTERS));
  const [winner, setWinner] = useState<'Orange' | 'Green' | null>(null);
  const winnerTimeout = useRef<ReturnType<typeof setTimeout> | null>(null);

  const handleCellClick = (id: string) => {
    setGrid(prevGrid => {
      const newGrid = prevGrid.map(cell => {
        if (cell.id === id) {
          return { ...cell, state: (cell.state + 1) % 3 as 0 | 1 | 2 };
        }
        return cell;
      });

      // Check win conditions
      // We check the *new* grid
      const orangeWin = checkWin(newGrid, 1, isOrangeStart, isOrangeEnd);
      const greenWin = checkWin(newGrid, 2, isGreenStart, isGreenEnd);

      if (orangeWin) setWinner('Orange');
      else if (greenWin) setWinner('Green');
      
      return newGrid;
    });
  };

  useEffect(() => {
    if (!winner) return;
    if (winnerTimeout.current) {
      clearTimeout(winnerTimeout.current);
    }
    winnerTimeout.current = setTimeout(() => {
      setWinner(null);
      winnerTimeout.current = null;
    }, 1600);
  }, [winner]);

  useEffect(() => {
    return () => {
      if (winnerTimeout.current) {
        clearTimeout(winnerTimeout.current);
      }
    };
  }, []);

  const boardGlow: CSSProperties = {}; // No shadows

  return (
    <div className="relative min-h-screen w-full overflow-hidden bg-[#3fa653]">
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
            {/* Calculate inner edge positions based on length parameter */}
            {(() => {
              // Inner edge spans ORANGE_INNER_EDGE_LENGTH% of height, centered
              const innerEdgeTop = 50 - (ORANGE_INNER_EDGE_LENGTH / 2);
              const innerEdgeBottom = 50 + (ORANGE_INNER_EDGE_LENGTH / 2);
              return (
                <>
                  {/* Left orange zone */}
                  <div
                    className="absolute"
                    style={{
                      left: 0,
                      top: 0,
                      bottom: 0,
                      width: `calc(2.5vw + ${ORANGE_ZONE_DISTANCE}%)`,
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
                      width: `calc(2.5vw + ${ORANGE_ZONE_DISTANCE}%)`,
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
