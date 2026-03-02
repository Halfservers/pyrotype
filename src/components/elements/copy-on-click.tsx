import { cn } from '@/lib/utils';
import copy from 'copy-to-clipboard';
import { useEffect, useState } from 'react';
import * as React from 'react';
import { toast } from 'sonner';

interface CopyOnClickProps {
  text: string | number | null | undefined;
  showInNotification?: boolean;
  children: React.ReactNode;
}

const CopyOnClick = ({ text, children, showInNotification }: CopyOnClickProps) => {
  const [copied, setCopied] = useState(false);
  let truncatedText: string;
  if (showInNotification === false) {
    truncatedText = '';
  } else {
    const length = 80;
    const stringText = String(text);
    truncatedText = stringText.length > length ? `"${stringText.substring(0, length - 3)}..."` : `"${stringText}"`;
  }

  useEffect(() => {
    if (!copied) return;
    toast(`Copied ${truncatedText} to clipboard.`);

    const timeout = setTimeout(() => {
      setCopied(false);
    }, 2500);

    return () => {
      clearTimeout(timeout);
    };
  }, [copied]);

  if (!React.isValidElement(children)) {
    throw new Error('Component passed to <CopyOnClick/> must be a valid React element.');
  }

  const child = !text
    ? React.Children.only(children)
    : React.cloneElement(React.Children.only(children) as React.ReactElement<any>, {
        className: cn((children.props as Record<string, unknown>).className as string || '', 'cursor-pointer'),
        onClick: (e: React.MouseEvent<HTMLElement>) => {
          copy(String(text));
          setCopied(true);
          if (typeof (children.props as Record<string, unknown>).onClick === 'function') {
            ((children.props as Record<string, unknown>).onClick as (e: React.MouseEvent<HTMLElement>) => void)(e);
          }
        },
      });

  return <>{child}</>;
};

export default CopyOnClick;
