import React, { useRef, useEffect } from 'react';

interface CheckboxProps {
  checked: boolean;
  onChange: (checked: boolean) => void;
  label?: string;
  id: string;
  disabled?: boolean;
  indeterminate?: boolean;
}

export default function Checkbox({ checked, onChange, label, id, disabled, indeterminate }: CheckboxProps) {
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (inputRef.current) {
      inputRef.current.indeterminate = !!indeterminate;
    }
  }, [indeterminate]);

  return (
    <div className={`flex items-center ${disabled ? 'opacity-50 cursor-not-allowed' : ''}`}>
      <div className="relative flex items-center justify-center">
        <input
          type="checkbox"
          id={id}
          ref={inputRef}
          checked={checked}
          onChange={(e) => onChange(e.target.checked)}
          disabled={disabled}
          className="sr-only"
        />
        <div 
          className={`flex items-center justify-center w-4 h-4 rounded border-2 cursor-pointer ${
            indeterminate || checked 
              ? 'border-indigo-600 bg-indigo-600' 
              : 'border-gray-300 bg-white'
          }`}
          onClick={() => !disabled && onChange(!checked)}
        >
          {indeterminate ? (
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6h8" stroke="white" strokeWidth="2" strokeLinecap="round"/></svg>
          ) : checked ? (
            <svg viewBox="0 0 12 12" fill="none" className="w-3 h-3"><path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
          ) : null}
        </div>
      </div>
      {label && (
        <label htmlFor={id} className="text-sm text-gray-700 ml-2 cursor-pointer select-none">
          {label}
        </label>
      )}
    </div>
  );
}
