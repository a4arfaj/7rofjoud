import type { RefObject } from 'react';
import { COLOR_THEMES } from '../constants';

type SettingsMenuProps = {
  show: boolean;
  settingsRef: RefObject<HTMLDivElement | null>;
  selectionMode: 'fill' | 'beam';
  onSelectionModeChange: (mode: 'fill' | 'beam') => void;
  gameSettings: { showBee: boolean; showBubbles: boolean };
  zoneColors: { orange: string; green: string };
  activeThemeId: string;
  onSettingChange: (key: string, value: any) => void;
};

function SettingsMenu({
  show,
  settingsRef,
  selectionMode,
  onSelectionModeChange,
  gameSettings,
  zoneColors,
  activeThemeId,
  onSettingChange,
}: SettingsMenuProps) {
  if (!show) return null;

  return (
    <div
      ref={settingsRef}
      className="bg-white/90 backdrop-blur-md p-4 rounded-xl shadow-2xl text-gray-800 w-64 mt-2 animate-fade-in border border-white/50"
      dir="rtl"
    >
      <h3 className="font-bold text-lg mb-3 border-b border-gray-300 pb-2 text-right">إعدادات اللعبة</h3>

      <div className="space-y-4">
        <div>
          <label className="block text-sm font-bold mb-1 text-right">حال التعليم</label>
          <div className="flex bg-gray-200 rounded-lg p-1 flex-row-reverse">
            <button
              onClick={() => onSelectionModeChange('fill')}
              className={`flex-1 py-1 rounded-md text-sm font-bold transition-all ${
                selectionMode === 'fill' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              ومضة
            </button>
            <button
              onClick={() => onSelectionModeChange('beam')}
              className={`flex-1 py-1 rounded-md text-sm font-bold transition-all ${
                selectionMode === 'beam' ? 'bg-white shadow text-blue-600' : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              حلقة
            </button>
          </div>
        </div>

        <div>
          <label className="block text-sm font-bold mb-2 text-right">سمة الألوان</label>
          <div className="grid grid-cols-2 gap-2">
            {COLOR_THEMES.map((theme) => (
              <button
                key={theme.id}
                onClick={() => onSettingChange('theme', theme.id)}
                className={`
                  relative overflow-hidden rounded-lg h-12 border-2 transition-all
                  ${zoneColors.green === theme.green && zoneColors.orange === theme.orange 
                    ? 'border-blue-500 scale-105 shadow-md' 
                    : 'border-transparent hover:scale-105 hover:shadow-sm'}
                `}
                title={theme.name}
              >
                <div className="absolute inset-0 flex">
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.orange }} />
                  <div className="w-1/2 h-full" style={{ backgroundColor: theme.green }} />
                </div>
                <span className="absolute inset-0 flex items-center justify-center text-white text-xs font-bold text-shadow-sm bg-black/20">
                  {theme.name}
                </span>
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-3 pt-2 border-t border-gray-200">
          <div
            className="flex items-center justify-between cursor-pointer group flex-row-reverse"
            onClick={() => onSettingChange('showBee', !gameSettings.showBee)}
          >
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                gameSettings.showBee ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                  gameSettings.showBee ? '-translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm font-bold group-hover:text-blue-600 transition-colors text-left">النحلة</span>
          </div>

          <div
            className="flex items-center justify-between cursor-pointer group flex-row-reverse"
            onClick={() => onSettingChange('showBubbles', !gameSettings.showBubbles)}
          >
            <div
              className={`w-12 h-6 rounded-full p-1 transition-colors duration-300 ease-in-out ${
                gameSettings.showBubbles ? 'bg-green-500' : 'bg-gray-300'
              }`}
            >
              <div
                className={`bg-white w-4 h-4 rounded-full shadow-md transform transition-transform duration-300 ease-in-out ${
                  gameSettings.showBubbles ? '-translate-x-6' : 'translate-x-0'
                }`}
              />
            </div>
            <span className="text-sm font-bold group-hover:text-blue-600 transition-colors text-left">الفقاعات</span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SettingsMenu;

