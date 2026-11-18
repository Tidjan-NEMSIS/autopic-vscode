import React from 'react';

interface ProviderTabsProps {
  selected: string;
  onSelect: (provider: string) => void;
}

const TABS = [
  { id: '', label: 'Tous' },
  { id: 'undraw', label: 'unDraw' },
  { id: 'openpeeps', label: 'Open Peeps' },
  { id: 'iradesign', label: 'IRA Design' },
];

export const ProviderTabs: React.FC<ProviderTabsProps> = ({ selected, onSelect }) => {
  return (
    <div className="flex items-center gap-1 px-3 py-1.5 border-b border-vscode-border overflow-x-auto text-[11px] no-scrollbar">
      {TABS.map((tab) => {
        const isActive = selected === tab.id;
        return (
          <button
            key={tab.id}
            onClick={() => onSelect(tab.id)}
            className={`px-2 py-1 rounded-md font-medium whitespace-nowrap transition-colors ${
              isActive
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-vscode-fg/70 hover:text-vscode-fg hover:bg-vscode-inputBg'
            }`}
          >
            {tab.label}
          </button>
        );
      })}
    </div>
  );
};
