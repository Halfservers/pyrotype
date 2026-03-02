import type { ReactNode } from 'react';

interface MainWrapperProps {
  children?: ReactNode;
  className?: string;
}

const MainWrapper = ({ children, className }: MainWrapperProps) => (
  <div
    className={`w-full h-full rounded-md bg-[radial-gradient(124.75%_124.75%_at_50.01%_-10.55%,_rgb(16,16,16)_0%,_rgb(4,4,4)_100%)] ${className ?? ''}`}
  >
    {children}
  </div>
);

export default MainWrapper;
