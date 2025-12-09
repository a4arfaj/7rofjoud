import type { ResetTimer } from '../types';

type ResetOverlayProps = {
  timer: ResetTimer | null;
  playerName: string | null;
  toArabicNumerals: (num: string | number | null | undefined) => string;
  onReset: () => void;
};

function ResetOverlay({ timer, playerName, toArabicNumerals, onReset }: ResetOverlayProps) {
  if (!timer || !timer.active || !playerName) return null;

  return (
    <div className="fixed inset-0 z-[100] flex flex-col items-center justify-center" dir="rtl">
      <div
        className={`absolute inset-0 transition-colors duration-500 ${
          timer.phase === 'initial' ? 'bg-green-500/95' : 'bg-red-500/95'
        }`}
      />
      <div className="relative z-10 text-center text-white">
        <div className="text-4xl md:text-5xl font-black mb-12 animate-pulse">{playerName}</div>
        <div className="text-8xl md:text-9xl font-black mb-8 animate-pulse">
          {toArabicNumerals(timer.time.toString())}
        </div>
        <div className="text-3xl md:text-4xl font-bold mb-6">
          {timer.phase === 'initial' ? 'جاهز...' : 'انتهى الوقت!'}
        </div>
        <button
          onClick={onReset}
          className={`mt-2 px-8 py-3 rounded-full text-xl font-bold hover:bg-gray-100 active:scale-95 transition-transform shadow-2xl ${
            timer.phase === 'initial' ? 'bg-white text-green-600' : 'bg-white text-red-600'
          }`}
        >
          استأنف الأزرار
        </button>
      </div>
    </div>
  );
}

export default ResetOverlay;

