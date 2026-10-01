import React from 'react';
import { cn } from '../../lib/utils';
import { AlertCircle, CheckCircle2, Info, AlertTriangle } from 'lucide-react';

export interface AlertProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: 'info' | 'success' | 'warning' | 'destructive';
}

export function Alert({ className, variant = 'info', children, ...props }: AlertProps) {
  const variants = {
    info: 'bg-blue-50 text-blue-900 border-blue-200 dark:bg-blue-950/40 dark:text-blue-200 dark:border-blue-800',
    success: 'bg-emerald-50 text-emerald-900 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-200 dark:border-emerald-800',
    warning: 'bg-amber-50 text-amber-900 border-amber-200 dark:bg-amber-950/40 dark:text-amber-200 dark:border-amber-800',
    destructive: 'bg-red-50 text-red-900 border-red-200 dark:bg-red-950/40 dark:text-red-200 dark:border-red-800'
  };

  const icons = {
    info: <Info className="h-4 w-4 text-blue-600 flex-shrink-0" />,
    success: <CheckCircle2 className="h-4 w-4 text-emerald-600 flex-shrink-0" />,
    warning: <AlertTriangle className="h-4 w-4 text-amber-600 flex-shrink-0" />,
    destructive: <AlertCircle className="h-4 w-4 text-red-600 flex-shrink-0" />
  };

  return (
    <div
      role="alert"
      className={cn('relative w-full rounded-xl border p-4 text-sm flex items-start gap-3', variants[variant], className)}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1">{children}</div>
    </div>
  );
}

export function AlertTitle({ className, ...props }: React.HTMLAttributes<HTMLHeadingElement>) {
  return <h5 className={cn('mb-1 font-semibold leading-none tracking-tight', className)} {...props} />;
}

export function AlertDescription({ className, ...props }: React.HTMLAttributes<HTMLParagraphElement>) {
  return <div className={cn('text-xs opacity-90 leading-relaxed', className)} {...props} />;
}
