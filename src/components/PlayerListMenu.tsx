import type { RefObject } from 'react';
import type { Player } from '../types';

type PlayerListMenuProps = {
  show: boolean;
  playerListRef: RefObject<HTMLDivElement | null>;
  players: Player[];
};

function PlayerListMenu({ show, playerListRef, players }: PlayerListMenuProps) {
  if (!show) return null;

  return (
    <div
      ref={playerListRef}
      className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl text-gray-800 w-64 mt-2 animate-fade-in border border-white/50 max-h-[60vh] overflow-y-auto"
      dir="rtl"
    >
      <h3 className="font-bold text-lg mb-3 border-b border-gray-300 pb-2 text-right">قائمة اللاعبين</h3>
      {players.length === 0 ? (
        <p className="text-gray-500 text-center py-2">لا يوجد لاعبين بعد</p>
      ) : (
        <ul className="space-y-2">
          {players.map((p, idx) => (
            <li
              key={`${p.name}-${idx}`}
              className="flex items-center justify-between bg-gray-50 p-2 rounded shadow-sm flex-row-reverse"
            >
              <span className="font-bold">{p.name}</span>
              <span
                className={`text-xs px-2 py-1 rounded-full text-white ${
                  p.team === 'green' ? 'bg-[#3fa653]' : 'bg-[#f4841f]'
                }`}
              >
                {p.team === 'green' ? 'طولي' : 'عرضي'}
              </span>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}

export default PlayerListMenu;

