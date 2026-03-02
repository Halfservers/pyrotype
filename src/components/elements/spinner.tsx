import { Suspense } from 'react';
import { cn } from '@/lib/utils';
import ErrorBoundary from '@/components/elements/error-boundary';

export type SpinnerSize = 'small' | 'base' | 'large';

interface SpinnerProps {
  size?: SpinnerSize;
  visible?: boolean;
  centered?: boolean;
  isBlue?: boolean;
  children?: React.ReactNode;
  className?: string;
}

const sizeClasses: Record<SpinnerSize, string> = {
  small: 'w-4 h-4 border-2',
  base: 'w-8 h-8 border-[3px]',
  large: 'w-16 h-16 border-[6px]',
};

function Spinner({ size = 'base', visible = true, centered, isBlue, className }: SpinnerProps) {
  if (!visible) return null;

  const spinnerEl = (
    <div
      className={cn(
        'rounded-full animate-spin aspect-square',
        sizeClasses[size],
        isBlue
          ? 'border-blue-600/20 border-t-blue-600'
          : 'border-white/20 border-t-white',
        className,
      )}
    />
  );

  if (centered) {
    return (
      <div className='flex justify-center items-center w-full sm:absolute sm:inset-0 sm:z-50'>
        {spinnerEl}
      </div>
    );
  }

  return spinnerEl;
}

Spinner.displayName = 'Spinner';

Spinner.Size = {
  SMALL: 'small' as SpinnerSize,
  BASE: 'base' as SpinnerSize,
  LARGE: 'large' as SpinnerSize,
};

const SpinnerSuspense = ({ children }: { children: React.ReactNode }) => (
  <Suspense fallback={<Spinner centered size='large' />}>
    <ErrorBoundary>{children}</ErrorBoundary>
  </Suspense>
);
SpinnerSuspense.displayName = 'Spinner.Suspense';
Spinner.Suspense = SpinnerSuspense;

export default Spinner;
