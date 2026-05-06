import React from 'react';

interface SliderProps {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  step?: number;
  label?: string;
  showValue?: boolean;
}

export default function Slider({ value, onChange, min = 0, max = 1, step = 0.01, label, showValue = true }: SliderProps) {
  const displayValue = max === 1 ? `${Math.round(value * 100)}%` : value;

  return (
    <div className="w-full flex flex-col gap-2">
      <div className="flex justify-between items-center">
        {label && <label className="text-sm font-medium text-gray-700">{label}</label>}
        {showValue && (
          <span className="text-sm font-semibold text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded-md">
            {displayValue}
          </span>
        )}
      </div>
      <input
        type="range"
        min={min}
        max={max}
        step={step}
        value={value}
        onChange={(e) => onChange(parseFloat(e.target.value))}
        className="w-full h-2 rounded-lg bg-gray-200 appearance-none cursor-pointer accent-indigo-600"
      />
      <div className="flex justify-between text-xs text-gray-400">
        <span>{min}</span>
        <span>{max}</span>
      </div>
    </div>
  );
}
