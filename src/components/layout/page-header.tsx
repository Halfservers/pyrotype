import { useEffect } from 'react';
import type { ReactNode } from 'react';

import { useServerStore } from '@/store/server';

export interface PageContentBlockProps {
  title?: string;
  className?: string;
  showFlashKey?: string;
  children?: ReactNode;
}

export const PageContentBlock = ({ title, className, children }: PageContentBlockProps) => {
  useEffect(() => {
    if (title) {
      document.title = title + ' | Pyrotype';
    }
  }, [title]);

  return (
    <div className={`${className || ''} max-w-[120rem] w-full mx-auto px-2 sm:px-14 py-2 sm:py-14`}>
      {children}
    </div>
  );
};

export interface ServerContentBlockProps extends PageContentBlockProps {
  title: string;
}

export const ServerContentBlock = ({ title, children, ...props }: ServerContentBlockProps) => {
  const name = useServerStore((state) => state.server?.name ?? '');

  return (
    <PageContentBlock title={`${title} - ${name}`} {...props}>
      {children}
    </PageContentBlock>
  );
};

export default PageContentBlock;
