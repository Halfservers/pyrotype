import { Link } from '@tanstack/react-router';

interface ScreenBlockProps {
  title: string;
  message: string;
}

const ScreenBlock = ({ title, message }: ScreenBlockProps) => {
  return (
    <div className='w-full h-full flex gap-12 items-center p-8 max-w-3xl mx-auto'>
      <div className='flex flex-col gap-8 max-w-sm text-left'>
        <h1 className='text-[32px] font-extrabold leading-[98%] tracking-[-0.11rem]'>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
};

const ServerError = ({ title, message }: ScreenBlockProps) => {
  return (
    <div className='w-full h-full flex gap-12 items-center p-8 max-w-3xl mx-auto'>
      <div className='flex flex-col gap-8 max-w-sm text-left'>
        <h1 className='text-[32px] font-extrabold leading-[98%] tracking-[-0.11rem]'>{title}</h1>
        <p>{message}</p>
      </div>
    </div>
  );
};

const NotFound = () => {
  return (
    <div className='w-full h-full flex gap-12 items-center p-8 max-w-3xl mx-auto'>
      <div className='flex flex-col gap-8 max-w-sm text-left'>
        <h1 className='text-[32px] font-extrabold leading-[98%] tracking-[-0.11rem]'>Page Not Found</h1>
        <p>
          We couldn&apos;t find the page you&apos;re looking for. You may have lost access, or the page may have been
          removed. Here are some helpful links instead:
        </p>
        <div className='flex flex-col gap-2'>
          <Link to='/' className='text-brand'>
            Your Servers
          </Link>
        </div>
      </div>
    </div>
  );
};

export { ServerError, NotFound };
export default ScreenBlock;
