'use client';

import React from 'react';

export interface Step {
  id: string;
  title: string;
  description?: string;
  status: 'pending' | 'current' | 'completed' | 'error';
}

export interface StepIndicatorProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  size?: 'sm' | 'md' | 'lg';
  showConnector?: boolean;
  className?: string;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  steps,
  orientation = 'horizontal',
  size = 'md',
  showConnector = true,
  className = '',
}) => {
  const sizeClasses = {
    sm: {
      circle: 'w-6 h-6 text-xs',
      title: 'text-xs',
      description: 'text-xs',
      spacing: orientation === 'horizontal' ? 'space-x-2' : 'space-y-2',
    },
    md: {
      circle: 'w-8 h-8 text-sm',
      title: 'text-sm',
      description: 'text-xs',
      spacing: orientation === 'horizontal' ? 'space-x-4' : 'space-y-4',
    },
    lg: {
      circle: 'w-10 h-10 text-base',
      title: 'text-base',
      description: 'text-sm',
      spacing: orientation === 'horizontal' ? 'space-x-6' : 'space-y-6',
    },
  };

  const getStepIcon = (step: Step, index: number) => {
    switch (step.status) {
      case 'completed':
        return (
          <svg
            className="w-full h-full"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'error':
        return (
          <svg
            className="w-full h-full"
            fill="currentColor"
            viewBox="0 0 20 20"
            aria-hidden="true"
          >
            <path
              fillRule="evenodd"
              d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
              clipRule="evenodd"
            />
          </svg>
        );
      case 'current':
        return (
          <div className="w-3 h-3 bg-current rounded-full animate-pulse" />
        );
      default:
        return <span className="font-medium">{index + 1}</span>;
    }
  };

  const getStepClasses = (step: Step) => {
    const baseClasses = `
      flex items-center justify-center rounded-full border-2 font-medium
      transition-all duration-200
      ${sizeClasses[size].circle}
    `;

    switch (step.status) {
      case 'completed':
        return `${baseClasses} bg-success text-success-foreground border-success`;
      case 'current':
        return `${baseClasses} bg-primary text-primary-foreground border-primary`;
      case 'error':
        return `${baseClasses} bg-destructive text-destructive-foreground border-destructive`;
      default:
        return `${baseClasses} bg-muted text-muted-foreground border-muted`;
    }
  };

  const getTextClasses = (step: Step) => {
    switch (step.status) {
      case 'completed':
        return 'text-success';
      case 'current':
        return 'text-primary font-medium';
      case 'error':
        return 'text-destructive';
      default:
        return 'text-muted-foreground';
    }
  };

  const containerClasses = orientation === 'horizontal'
    ? `flex items-center ${sizeClasses[size].spacing}`
    : `flex flex-col ${sizeClasses[size].spacing}`;

  return (
    <nav
      className={`${containerClasses} ${className}`}
      aria-label="Progress steps"
    >
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div
            className={`
              flex items-center
              ${orientation === 'vertical' ? 'w-full' : ''}
            `}
          >
            {/* Step circle */}
            <div
              className={getStepClasses(step)}
              aria-current={step.status === 'current' ? 'step' : undefined}
            >
              {getStepIcon(step, index)}
            </div>

            {/* Step content */}
            <div
              className={`
                ${orientation === 'horizontal' ? 'ml-2' : 'ml-3 flex-1'}
              `}
            >
              <div
                className={`
                  font-medium
                  ${sizeClasses[size].title}
                  ${getTextClasses(step)}
                `}
              >
                {step.title}
              </div>
              {step.description && (
                <div
                  className={`
                    text-muted-foreground
                    ${sizeClasses[size].description}
                  `}
                >
                  {step.description}
                </div>
              )}
            </div>
          </div>

          {/* Connector line */}
          {showConnector && index < steps.length - 1 && (
            <div
              className={`
                ${orientation === 'horizontal'
                  ? 'flex-1 h-px bg-border mx-2'
                  : 'w-px h-6 bg-border ml-4'
                }
              `}
              aria-hidden="true"
            />
          )}
        </React.Fragment>
      ))}
    </nav>
  );
};

export { StepIndicator };
export default StepIndicator;