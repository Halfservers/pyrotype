import type { ReactNode } from 'react';
import { Link } from '@tanstack/react-router';

interface MobileFullScreenMenuProps {
  isVisible: boolean;
  onClose: () => void;
  children: ReactNode;
}

const MobileFullScreenMenu = ({ isVisible, onClose, children }: MobileFullScreenMenuProps) => {
  if (!isVisible) return null;

  return (
    <div className='lg:hidden fixed inset-0 z-[9999] bg-[#1a1a1a] pt-16'>
      <button
        onClick={onClose}
        className='absolute top-4 right-4 p-2 text-white/70 hover:text-white hover:bg-white/10 rounded-lg transition-all duration-200'
        aria-label='Close menu'
      >
        <svg xmlns='http://www.w3.org/2000/svg' width='22' height='22' viewBox='0 0 24 24' fill='currentColor'>
          <path d='M18.3 5.71a1 1 0 00-1.42 0L12 10.59 7.12 5.71a1 1 0 00-1.42 1.42L10.59 12l-4.88 4.88a1 1 0 001.42 1.42L12 13.41l4.88 4.88a1 1 0 001.42-1.42L13.41 12l4.88-4.88a1 1 0 000-1.41z' />
        </svg>
      </button>

      <div className='h-full overflow-y-auto'>
        <div className='p-6'>
          <nav className='space-y-2'>{children}</nav>
        </div>
      </div>
    </div>
  );
};

interface NavigationItemProps {
  to: string;
  icon: React.ComponentType<React.SVGProps<SVGSVGElement>>;
  children: ReactNode;
  onClick: () => void;
}

const NavigationItem = ({ to, icon: Icon, children, onClick }: NavigationItemProps) => (
  <Link
    to={to}
    className='flex items-center gap-4 p-4 rounded-md transition-all duration-200 text-white/80 hover:text-white hover:bg-[#ffffff11] border-l-4 border-transparent [&.active]:bg-gradient-to-r [&.active]:from-brand/20 [&.active]:to-brand/10 [&.active]:border-brand [&.active]:text-white'
    onClick={onClick}
  >
    <div>
      <Icon width={22} height={22} fill='currentColor' />
    </div>
    <span className='text-lg font-medium'>{children}</span>
  </Link>
);

interface DashboardMobileMenuProps {
  isVisible: boolean;
  onClose: () => void;
}

export const DashboardMobileMenu = ({ isVisible, onClose }: DashboardMobileMenuProps) => {
  const HomeIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' {...props}><path d='M10 20v-6h4v6h5v-8h3L12 3 2 12h3v8z'/></svg>
  );
  const ApiIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' {...props}><path d='M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z'/></svg>
  );
  const KeyIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' {...props}><path d='M12.65 10C11.83 7.67 9.61 6 7 6c-3.31 0-6 2.69-6 6s2.69 6 6 6c2.61 0 4.83-1.67 5.65-4H17v4h4v-4h2v-4H12.65z'/></svg>
  );
  const GearIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns='http://www.w3.org/2000/svg' viewBox='0 0 24 24' {...props}><path d='M19.14 12.94c.04-.3.06-.61.06-.94 0-.32-.02-.64-.07-.94l2.03-1.58a.49.49 0 00.12-.61l-1.92-3.32a.49.49 0 00-.59-.22l-2.39.96c-.5-.38-1.03-.7-1.62-.94l-.36-2.54a.484.484 0 00-.48-.41h-3.84c-.24 0-.43.17-.47.41l-.36 2.54c-.59.24-1.13.57-1.62.94l-2.39-.96c-.22-.08-.47 0-.59.22L2.74 8.87c-.12.21-.08.47.12.61l2.03 1.58c-.05.3-.07.62-.07.94s.02.64.07.94l-2.03 1.58a.49.49 0 00-.12.61l1.92 3.32c.12.22.37.29.59.22l2.39-.96c.5.38 1.03.7 1.62.94l.36 2.54c.05.24.24.41.48.41h3.84c.24 0 .44-.17.47-.41l.36-2.54c.59-.24 1.13-.56 1.62-.94l2.39.96c.22.08.47 0 .59-.22l1.92-3.32c.12-.22.07-.47-.12-.61l-2.01-1.58zM12 15.6c-1.98 0-3.6-1.62-3.6-3.6s1.62-3.6 3.6-3.6 3.6 1.62 3.6 3.6-1.62 3.6-3.6 3.6z'/></svg>
  );

  return (
    <MobileFullScreenMenu isVisible={isVisible} onClose={onClose}>
      <NavigationItem to='/' icon={HomeIcon} onClick={onClose}>Servers</NavigationItem>
      <NavigationItem to='/account/api' icon={ApiIcon} onClick={onClose}>API Keys</NavigationItem>
      <NavigationItem to='/account/ssh' icon={KeyIcon} onClick={onClose}>SSH Keys</NavigationItem>
      <NavigationItem to='/account' icon={GearIcon} onClick={onClose}>Settings</NavigationItem>
    </MobileFullScreenMenu>
  );
};

export default MobileFullScreenMenu;
