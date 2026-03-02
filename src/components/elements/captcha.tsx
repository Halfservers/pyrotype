import { useEffect, useRef, useState } from 'react';

interface CaptchaConfig {
  enabled: boolean;
  provider: 'hcaptcha' | 'turnstile';
  siteKey: string;
}

let captchaConfig: CaptchaConfig | null = null;

function getCaptchaConfig(): CaptchaConfig {
  if (captchaConfig) return captchaConfig;

  const meta = document.querySelector('meta[name="captcha-config"]');
  if (meta) {
    captchaConfig = JSON.parse(meta.getAttribute('content') || '{}');
  }

  return captchaConfig || { enabled: false, provider: 'turnstile', siteKey: '' };
}

interface CaptchaProps {
  onSuccess?: (token: string) => void;
  onError?: (error: unknown) => void;
  onExpired?: () => void;
  className?: string;
  theme?: 'light' | 'dark' | 'auto';
  size?: 'normal' | 'compact' | 'invisible' | 'flexible';
}

export default function Captcha({
  onSuccess,
  onError,
  onExpired,
  className,
  theme = 'dark',
  size = 'flexible',
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const onSuccessRef = useRef(onSuccess);
  const onErrorRef = useRef(onError);
  const onExpiredRef = useRef(onExpired);

  useEffect(() => {
    onSuccessRef.current = onSuccess;
    onErrorRef.current = onError;
    onExpiredRef.current = onExpired;
  });

  useEffect(() => {
    const config = getCaptchaConfig();
    if (!config.enabled) return;

    let mounted = true;
    setIsLoading(true);
    setError(null);

    const loadScript = (src: string) => {
      return new Promise<void>((resolve, reject) => {
        if (document.querySelector(`script[src="${src}"]`)) {
          resolve();
          return;
        }
        const script = document.createElement('script');
        script.src = src;
        script.async = true;
        script.onload = () => resolve();
        script.onerror = () => reject(new Error(`Failed to load ${src}`));
        document.head.appendChild(script);
      });
    };

    const init = async () => {
      try {
        if (config.provider === 'turnstile') {
          await loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit');
          if (!mounted || !containerRef.current) return;
          const turnstile = (window as any).turnstile;
          if (turnstile) {
            turnstile.render(containerRef.current, {
              sitekey: config.siteKey,
              theme,
              size,
              callback: (token: string) => onSuccessRef.current?.(token),
              'error-callback': (err: unknown) => {
                setError('Captcha verification failed');
                onErrorRef.current?.(err);
              },
              'expired-callback': () => {
                setError('Captcha expired');
                onExpiredRef.current?.();
              },
            });
          }
        } else {
          await loadScript('https://js.hcaptcha.com/1/api.js?render=explicit');
          if (!mounted || !containerRef.current) return;
          const hcaptcha = (window as any).hcaptcha;
          if (hcaptcha) {
            hcaptcha.render(containerRef.current, {
              sitekey: config.siteKey,
              theme,
              size,
              callback: (token: string) => onSuccessRef.current?.(token),
              'error-callback': (err: unknown) => {
                setError('Captcha verification failed');
                onErrorRef.current?.(err);
              },
              'expired-callback': () => {
                setError('Captcha expired');
                onExpiredRef.current?.();
              },
            });
          }
        }
      } catch {
        if (mounted) setError('Failed to load captcha');
      } finally {
        if (mounted) setIsLoading(false);
      }
    };

    init();

    return () => {
      mounted = false;
    };
  }, [theme, size]);

  const config = getCaptchaConfig();
  if (!config.enabled) return null;

  return (
    <div className={className}>
      <div ref={containerRef} />
      {isLoading && <div className='text-sm text-gray-500 mt-2'>Loading captcha...</div>}
      {error && <div className='text-sm text-red-500 mt-2'>{error}</div>}
    </div>
  );
}
