'use client';

import React from 'react';

export interface TextareaProps extends React.TextareaHTMLAttributes<HTMLTextAreaElement> {
  variant?: 'default' | 'error' | 'success';
  textareaSize?: 'sm' | 'md' | 'lg';
  error?: string;
  helperText?: string;
  label?: string;
  resize?: 'none' | 'vertical' | 'horizontal' | 'both';
  maxLength?: number;
  showCharCount?: boolean;
}

const Textarea = React.forwardRef<HTMLTextAreaElement, TextareaProps>(
  ({
    className = '',
    variant = 'default',
    textareaSize = 'md',
    error,
    helperText,
    label,
    resize = 'vertical',
    maxLength,
    showCharCount = false,
    id,
    value,
    required = false,
    ...props
  }, ref) => {
    const textareaId = id || `textarea-${Math.random().toString(36).substr(2, 9)}`;
    const errorId = error ? `${textareaId}-error` : undefined;
    const helperTextId = helperText ? `${textareaId}-helper` : undefined;
    const charCount = typeof value === 'string' ? value.length : 0;

    const baseClasses = `
      w-full rounded-lg border transition-all duration-200
      focus:outline-none focus:ring-2 focus:ring-offset-1
      disabled:opacity-50 disabled:cursor-not-allowed
      placeholder:text-muted-foreground
    `;

    const variantClasses = {
      default: `
        border-form-border bg-form-bg text-foreground
        focus:border-form-focus focus:ring-form-focus/20
      `,
      error: `
        border-form-error bg-form-bg text-foreground
        focus:border-form-error focus:ring-form-error/20
      `,
      success: `
        border-form-success bg-form-bg text-foreground
        focus:border-form-success focus:ring-form-success/20
      `,
    };

    const sizeClasses = {
      sm: 'px-3 py-1.5 text-sm min-h-[80px]',
      md: 'px-3 py-2 text-sm min-h-[100px]',
      lg: 'px-4 py-2.5 text-base min-h-[120px]',
    };

    const resizeClasses = {
      none: 'resize-none',
      vertical: 'resize-y',
      horizontal: 'resize-x',
      both: 'resize',
    };

    const currentVariant = error ? 'error' : variant;

    return (
      <div className="w-full">
        {/* Label */}
        {label && (
          <label
            htmlFor={textareaId}
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

        {/* Textarea */}
        <textarea
          ref={ref}
          id={textareaId}
          className={`
            ${baseClasses}
            ${variantClasses[currentVariant]}
            ${sizeClasses[textareaSize]}
            ${resizeClasses[resize]}
            ${className}
          `}
          aria-invalid={error ? 'true' : 'false'}
          aria-describedby={[errorId, helperTextId].filter(Boolean).join(' ') || undefined}
          maxLength={maxLength}
          value={value}
          required={required}
          {...props}
        />

        {/* Character count and helper text container */}
        <div className="flex justify-between items-start mt-1">
          <div className="flex-1">
            {/* Error message */}
            {error && (
              <p
                id={errorId}
                className="text-sm text-form-error"
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
                className="text-sm text-muted-foreground"
              >
                {helperText}
              </p>
            )}
          </div>

          {/* Character count */}
          {(showCharCount || maxLength) && (
            <div className="flex-shrink-0 ml-2">
              <span
                className={`text-xs ${
                  maxLength && charCount > maxLength * 0.9
                    ? charCount >= maxLength
                      ? 'text-form-error'
                      : 'text-warning'
                    : 'text-muted-foreground'
                }`}
                aria-label={`${charCount}${maxLength ? ` of ${maxLength}` : ''} characters`}
              >
                {charCount}
                {maxLength && `/${maxLength}`}
              </span>
            </div>
          )}
        </div>
      </div>
    );
  }
);

Textarea.displayName = 'Textarea';

export { Textarea };
export default Textarea;