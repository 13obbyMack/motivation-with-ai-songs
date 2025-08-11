"use client";

import React from "react";

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: "default" | "destructive" | "success" | "warning" | "info";
  size?: "sm" | "md" | "lg";
  title?: string;
  description?: string;
  icon?: React.ReactNode;
  dismissible?: boolean;
  onDismiss?: () => void;
}

const Alert = React.forwardRef<HTMLDivElement, AlertProps>(
  (
    {
      className = "",
      variant = "default",
      size = "md",
      title,
      description,
      icon,
      dismissible = false,
      onDismiss,
      children,
      ...props
    },
    ref
  ) => {
    const baseClasses = `
      relative rounded-lg border p-4
      transition-all duration-200
    `;

    const variantClasses = {
      default: "border-border bg-card text-card-foreground",
      destructive: "border-destructive/20 bg-destructive/5 text-destructive",
      success: "border-success/20 bg-success/5 text-success",
      warning: "border-warning/20 bg-warning/5 text-warning",
      info: "border-info/20 bg-info/5 text-info",
    };

    const sizeClasses = {
      sm: "p-3",
      md: "p-4",
      lg: "p-6",
    };

    const getDefaultIcon = () => {
      switch (variant) {
        case "destructive":
          return "⚠️";
        case "success":
          return "✅";
        case "warning":
          return "⚠️";
        case "info":
          return "ℹ️";
        default:
          return "📢";
      }
    };

    return (
      <div
        ref={ref}
        role="alert"
        className={`
          ${baseClasses}
          ${variantClasses[variant]}
          ${sizeClasses[size]}
          ${className}
        `}
        {...props}
      >
        <div className="flex items-start gap-3">
          {/* Icon */}
          {(icon || !title) && (
            <div className="flex-shrink-0">
              {icon || (
                <span className="text-lg" role="img" aria-hidden="true">
                  {getDefaultIcon()}
                </span>
              )}
            </div>
          )}

          {/* Content */}
          <div className="flex-1 min-w-0">
            {title && <h3 className="font-semibold mb-1">{title}</h3>}

            {description && <p className="text-sm opacity-90">{description}</p>}

            {children && (
              <div className={title || description ? "mt-2" : ""}>
                {children}
              </div>
            )}
          </div>

          {/* Dismiss button */}
          {dismissible && onDismiss && (
            <button
              onClick={onDismiss}
              className="
                flex-shrink-0 ml-2
                w-6 h-6 rounded-md
                flex items-center justify-center
                hover:bg-current hover:bg-opacity-10
                transition-colors duration-150
                focus:outline-none focus:ring-2 focus:ring-current focus:ring-opacity-20
              "
              aria-label="Dismiss alert"
            >
              <svg
                className="w-4 h-4"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                aria-hidden="true"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M6 18L18 6M6 6l12 12"
                />
              </svg>
            </button>
          )}
        </div>
      </div>
    );
  }
);

Alert.displayName = "Alert";

export { Alert };
export default Alert;
