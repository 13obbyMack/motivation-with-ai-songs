'use client';

import React from 'react';

export interface LoadingSpinnerProps {
  size?: 'xs' | 'sm' | 'md' | 'lg' | 'xl';
  variant?: 'primary' | 'secondary' | 'muted';
  className?: string;
  label?: string;
}

const LoadingSpinner: React.FC<LoadingSpinnerProps> = ({
  size = 'md',
  variant = 'primary',
  className = '',
  label = 'Loading...',
}) => {
  const sizeClasses = {
    xs: 'w-3 h-3 border',
    sm: 'w-4 h-4 border',
    md: 'w-6 h-6 border-2',
    lg: 'w-8 h-8 border-2',
    xl: 'w-12 h-12 border-4',
  };

  const variantClasses = {
    primary: 'border-primary border-t-transparent',
    secondary: 'border-secondary border-t-transparent',
    muted: 'border-muted-foreground border-t-transparent',
  };

  return (
    <div
      className={`
        inline-flex items-center justify-center
        ${className}
      `}
      role="status"
      aria-label={label}
    >
      <div
        className={`
          animate-spin rounded-full
          ${sizeClasses[size]}
          ${variantClasses[variant]}
        `}
        aria-hidden="true"
      />
      <span className="sr-only">{label}</span>
    </div>
  );
};

export { LoadingSpinner };
export default LoadingSpinner;