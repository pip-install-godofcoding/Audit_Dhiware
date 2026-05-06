import React from 'react';

interface SwitchProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  description?: string;
  disabled?: boolean;
}

export default function SwitchComponent({ checked, onChange, label, description, disabled }: SwitchProps) {
  return (
    <div 
      className={`flex w-full items-center justify-between ${disabled ? 'opacity-50 cursor-not-allowed pointer-events-none' : 'cursor-pointer'}`}
      onClick={() => !disabled && onChange(!checked)}
    >
      <div className="flex flex-col">
        {label && <span className="text-sm font-medium text-gray-900">{label}</span>}
        {description && <span className="text-xs text-gray-500 mt-0.5">{description}</span>}
      </div>
      <div className={`relative w-11 h-6 rounded-full transition-colors duration-200 ${checked ? 'bg-indigo-600' : 'bg-gray-200'}`}>
        <div className={`absolute top-0.5 left-0.5 w-5 h-5 rounded-full bg-white shadow transform transition-transform duration-200 ${checked ? 'translate-x-5' : 'translate-x-0'}`} />
      </div>
    </div>
  );
}
