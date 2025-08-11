'use client';

import React from 'react';

export interface SelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  variant?: 'default' | 'error' | 'success';
  selectSize?: 'sm' | 'md' | 'lg';
  error?: string;
  helperText?: string;
  label?: string;
  placeholder?: string;
  options?: Array<{ value: string; label: string; disabled?: boolean }>;
}

const Select = React.forwardRef<HTMLSelectElement, SelectProps>(
  ({
    className = '',
    variant = 'default',
    selectSize = 'md',
    error,
    helperText,
    label,
    placeholder,
    options = [],
    id,
    children,
    required = false,
    ...props
  }, ref) => {
    const selectId = id || `select-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${selectId}-error` : undefined;
    const helperTextId = helperText ? `${selectId}-helper` : undefined;

    const baseClasses = `
      w-full rounded-lg border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      bg-form-bg text-foreground
      appearance-none cursor-pointer
    `;

    const variantClasses = {
      default: `
        border-form-border
        focus:border-form-focus focus:ring-form-focus/20
      `,
      error: `
        border-form-error
        focus:border-form-error focus:ring-form-error/20
      `,
      success: `
        border-form-success
        focus:border-form-success focus:ring-form-success/20
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm h-8 pr-8',
      md: 'px-3 py-2 text-sm h-10 pr-10',
      lg: 'px-4 py-2.5 text-base h-11 pr-12',
    };

    const currentVariant = error ? 'error' : variant;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={selectId}
            className="block text-sm font-medium text-foreground mb-1"
          >
            {label}
            {required && (
              <span className="text-destructive ml-1" aria-label="required">
                *
              </span>
            )}
          </label>
        )}

        {/* Select container */}
        <div className="relative">
          <select
            ref={ref}
            id={selectId}
            className={`
              ${baseClasses}
              ${variantClasses[currentVariant]}
              ${sizeClasses[selectSize]}
              ${className}
            `}
            aria-invalid={error ? 'true' : 'false'}
            aria-describedby={[errorId, helperTextId].filter(Boolean).join(' ') || undefined}
            required={required}
            {...props}
          >
            {placeholder && (
              <option value="" disabled>
                {placeholder}
              </option>
            )}
            
            {options.map((option) => (
              <option
                key={option.value}
                value={option.value}
                disabled={option.disabled}
              >
                {option.label}
              </option>
            ))}
            
            {children}
          </select>

          {/* Dropdown arrow */}
          <div className="absolute right-3 top-1/2 transform -translate-y-1/2 pointer-events-none">
            <svg
              className="w-4 h-4 text-muted-foreground"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
              aria-hidden="true"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M19 9l-7 7-7-7"
              />
            </svg>
          </div>
        </div>

        {/* Error message */}
        {error && (
          <p
            id={errorId}
            className="mt-1 text-sm text-form-error"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}

        {/* Helper text */}
        {helperText && !error && (
          <p
            id={helperTextId}
            className="mt-1 text-sm text-muted-foreground"
          >
            {helperText}
          </p>
        )}
      </div>
    );
  }
);

Select.displayName = 'Select';

export { Select };
export default Select;