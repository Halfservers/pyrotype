import type { ReactNode } from 'react';

interface MainSidebarProps {
  children?: ReactNode;
}

const MainSidebar = ({ children }: MainSidebarProps) => (
  <nav className='hidden lg:flex w-[300px] shrink-0 flex-col rounded-lg overflow-x-hidden p-8 mr-2 select-none bg-black/60 border border-white/[0.08]'>
    <div className='flex flex-col text-sm [&>a]:flex [&>a]:relative [&>a]:py-4 [&>a]:gap-2 [&>a]:font-semibold [&>a]:min-h-[56px] [&>a]:select-none [&>a]:transition-all [&>a]:duration-200 [&>a.active]:text-brand [&>a.active]:fill-brand [&>div]:flex [&>div]:relative [&>div]:py-4 [&>div]:gap-2 [&>div]:font-semibold [&>div]:min-h-[56px]'>
      {children}
    </div>
  </nav>
);

export default MainSidebar;
