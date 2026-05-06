import React from 'react';

interface FrameworkCardProps {
  id: string
  name: string
  shortName: string
  controlCount: number
  description: string
  selected: boolean
  onToggle: (id: string) => void
  disabled?: boolean
}

export default function FrameworkCard({
  id, name, shortName, controlCount, description, selected, onToggle, disabled
}: FrameworkCardProps) {
  return (
    <div
      onClick={() => !disabled && onToggle(id)}
      className={`w-full cursor-pointer transition-all duration-150 ${
        disabled ? 'opacity-40 cursor-not-allowed pointer-events-none' : ''
      } ${
        selected 
          ? 'bg-indigo-50 border-2 border-indigo-500 rounded-xl p-5 shadow-sm' 
          : 'bg-white border-2 border-gray-200 rounded-xl p-5 hover:border-indigo-300 hover:shadow-sm'
      }`}
    >
      <div className="flex justify-between items-start">
        <span className={`text-xs font-bold px-2 py-1 rounded-md ${selected ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-600'}`}>
          {shortName}
        </span>
        {selected ? (
          <div className="w-5 h-5 bg-indigo-600 rounded-full flex items-center justify-center">
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3">
              <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
          </div>
        ) : (
          <div className="w-5 h-5 rounded-full border-2 border-gray-300"></div>
        )}
      </div>
      <h3 className="text-base font-semibold text-gray-900 mt-3">{name}</h3>
      <p className="text-sm text-gray-500 mt-1 line-clamp-2">{description}</p>
      <div className="mt-3 flex justify-between items-center">
        <span className="text-xs text-gray-400">{controlCount} controls</span>
        {selected && <span className="text-xs font-medium text-indigo-600">Selected</span>}
      </div>
    </div>
  );
}
