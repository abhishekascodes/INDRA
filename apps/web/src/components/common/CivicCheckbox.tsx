import React from 'react';

export interface CivicCheckboxProps {
  id?: string;
  checked: boolean;
  onChange: (checked: boolean) => void;
  disabled?: boolean;
  label?: React.ReactNode;
  description?: React.ReactNode;
  requiredBadge?: boolean;
  size?: 'md' | 'lg';
  className?: string;
}

export const CivicCheckbox: React.FC<CivicCheckboxProps> = ({
  id,
  checked,
  onChange,
  disabled = false,
  label,
  description,
  requiredBadge = false,
  size = 'lg',
  className = '',
}) => {
  const boxDimensions = size === 'lg' ? 'w-7 h-7 rounded-xl' : 'w-6 h-6 rounded-lg';
  const iconDimensions = size === 'lg' ? 'w-4.5 h-4.5 stroke-[3.5]' : 'w-4 h-4 stroke-[3]';

  const handleClick = (e: React.MouseEvent) => {
    if (disabled) return;
    e.stopPropagation();
    onChange(!checked);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (disabled) return;
    if (e.key === ' ' || e.key === 'Enter') {
      e.preventDefault();
      e.stopPropagation();
      onChange(!checked);
    }
  };

  return (
    <div
      role="checkbox"
      aria-checked={checked}
      aria-disabled={disabled}
      tabIndex={disabled ? -1 : 0}
      onClick={handleClick}
      onKeyDown={handleKeyDown}
      className={`group relative flex items-start space-x-3.5 sm:space-x-4 p-4 sm:p-5 rounded-2xl border-2 transition-all duration-200 select-none ${
        disabled
          ? 'bg-slate-50 border-slate-200 cursor-not-allowed opacity-60'
          : checked
          ? 'bg-emerald-50/90 border-emerald-500 border-l-6 border-l-emerald-600 ring-2 ring-emerald-500/10 cursor-pointer shadow-xs'
          : 'bg-white border-slate-300 border-l-6 border-l-amber-500 hover:border-slate-500 hover:bg-slate-50/60 cursor-pointer shadow-2xs hover:shadow-sm'
      } ${className}`}
    >
      {/* Prominent Tactile Checkbox Box */}
      <div className="pt-0.5 shrink-0">
        <div
          className={`${boxDimensions} flex items-center justify-center border-2 transition-all duration-200 ${
            disabled
              ? 'bg-slate-100 border-slate-300 text-slate-400'
              : checked
              ? 'bg-emerald-600 border-emerald-600 text-white ring-4 ring-emerald-100 scale-105 shadow-xs'
              : 'bg-white border-slate-400 group-hover:border-[#0F172A] group-hover:scale-110 ring-4 ring-transparent group-hover:ring-slate-100 shadow-2xs'
          }`}
        >
          {checked ? (
            <svg
              className={iconDimensions}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          ) : (
            <svg
              className={`${iconDimensions} text-slate-300 opacity-0 group-hover:opacity-60 transition-opacity`}
              fill="none"
              viewBox="0 0 24 24"
              stroke="currentColor"
            >
              <polyline points="20 6 9 17 4 12" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          id={id}
          checked={checked}
          disabled={disabled}
          onChange={() => {}}
          className="sr-only"
          tabIndex={-1}
          aria-hidden="true"
        />
      </div>

      {/* Label & Description Content */}
      <div className="space-y-1.5 flex-1 min-w-0">
        <div className="flex items-center justify-between gap-2">
          <span
            className={`text-xs font-black uppercase tracking-wider flex items-center gap-1.5 ${
              checked ? 'text-emerald-800' : 'text-amber-800'
            }`}
          >
            {checked ? (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-emerald-600" />
                <span>Confirmed & Verified</span>
              </>
            ) : (
              <>
                <span className="w-1.5 h-1.5 rounded-full bg-amber-600" />
                <span>Mandatory Confirmation · Click to Agree</span>
              </>
            )}
          </span>

          {requiredBadge && !checked && (
            <span className="text-2xs font-extrabold uppercase px-2 py-0.5 rounded-md bg-amber-100 text-amber-900 border border-amber-300">
              Required
            </span>
          )}
        </div>

        {label && (
          <div className="text-sm sm:text-base font-semibold text-[#0F172A] leading-relaxed">
            {label}
          </div>
        )}

        {description && (
          <div className="text-xs text-[#64748B] leading-relaxed">
            {description}
          </div>
        )}
      </div>
    </div>
  );
};
