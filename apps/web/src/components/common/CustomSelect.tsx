import React, { useState, useRef, useEffect } from 'react';
import { ChevronDownIcon, CheckIcon } from '../icons.js';

export interface SelectOption {
  value: string;
  label: string;
  description?: string;
}

export interface CustomSelectProps {
  options: SelectOption[];
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  className?: string;
  disabled?: boolean;
}

export const CustomSelect: React.FC<CustomSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = 'Select an option...',
  className = '',
  disabled = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  const selectedOption = options.find((opt) => opt.value === value);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('keydown', handleKeyDown);
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [isOpen]);

  const handleSelect = (optionValue: string) => {
    onChange(optionValue);
    setIsOpen(false);
  };

  return (
    <div ref={containerRef} className={`relative w-full ${className}`}>
      <button
        type="button"
        disabled={disabled}
        onClick={() => setIsOpen((prev) => !prev)}
        className={`w-full px-4 py-2.5 rounded-xl border text-sm font-medium transition flex items-center justify-between text-left cursor-pointer ${
          disabled
            ? 'bg-[#F1F5F9] text-[#94A3B8] border-[#E2E8F0] cursor-not-allowed'
            : isOpen
            ? 'bg-white border-[#0F172A] ring-2 ring-[#0F172A]/10 text-[#0F172A] shadow-xs'
            : 'bg-white hover:bg-[#F8FAFC] border-[#CBD5E1] text-[#0F172A] shadow-2xs hover:border-[#94A3B8]'
        }`}
      >
        <span className={selectedOption ? 'text-[#0F172A] font-semibold truncate' : 'text-[#94A3B8] truncate'}>
          {selectedOption ? selectedOption.label : placeholder}
        </span>
        <ChevronDownIcon
          className={`w-4 h-4 text-[#64748B] transition-transform duration-200 shrink-0 ml-2 ${
            isOpen ? 'rotate-180 text-[#0F172A]' : ''
          }`}
        />
      </button>

      {isOpen && (
        <div className="absolute left-0 top-full mt-1.5 w-full bg-white border border-[#CBD5E1] rounded-xl shadow-xl z-50 overflow-hidden py-1 max-h-64 overflow-y-auto animate-fadeIn">
          {options.map((opt) => {
            const isSelected = opt.value === value;
            return (
              <div
                key={opt.value}
                onClick={() => handleSelect(opt.value)}
                className={`px-4 py-2.5 text-sm transition-colors flex items-center justify-between cursor-pointer ${
                  isSelected
                    ? 'bg-[#F1F5F9] font-bold text-[#0F172A]'
                    : 'text-[#334155] hover:bg-[#F8FAFC] hover:text-[#0F172A]'
                }`}
              >
                <div className="pr-2">
                  <div>{opt.label}</div>
                  {opt.description && (
                    <div className="text-xs text-[#64748B] font-normal mt-0.5">{opt.description}</div>
                  )}
                </div>
                {isSelected && (
                  <CheckIcon className="w-4 h-4 text-emerald-600 shrink-0" />
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
