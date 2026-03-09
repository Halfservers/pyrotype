import { useEffect, useRef, useState, useCallback } from 'react'

export interface CaptchaConfig {
  enabled: boolean
  provider: string
  siteKey: string
}

interface CaptchaProps {
  config: CaptchaConfig
  onVerify: (token: string) => void
  onError?: () => void
  onExpired?: () => void
  className?: string
  theme?: 'light' | 'dark' | 'auto'
  size?: 'normal' | 'compact' | 'invisible' | 'flexible'
}

const SCRIPT_URLS: Record<string, string> = {
  turnstile: 'https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit',
  hcaptcha: 'https://js.hcaptcha.com/1/api.js?render=explicit',
  recaptcha: 'https://www.google.com/recaptcha/api.js?render=explicit',
}

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (document.querySelector(`script[src="${src}"]`)) {
      resolve()
      return
    }
    const script = document.createElement('script')
    script.src = src
    script.async = true
    script.onload = () => resolve()
    script.onerror = () => reject(new Error(`Failed to load ${src}`))
    document.head.appendChild(script)
  })
}

export default function Captcha({
  config,
  onVerify,
  onError,
  onExpired,
  className,
  theme = 'dark',
  size = 'flexible',
}: CaptchaProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const widgetRef = useRef<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const onVerifyRef = useRef(onVerify)
  const onErrorRef = useRef(onError)
  const onExpiredRef = useRef(onExpired)
  useEffect(() => {
    onVerifyRef.current = onVerify
    onErrorRef.current = onError
    onExpiredRef.current = onExpired
  })

  useEffect(() => {
    if (!config.enabled || !config.siteKey || !config.provider || config.provider === 'none') return

    let mounted = true
    setLoading(true)
    setError(null)

    const scriptUrl = SCRIPT_URLS[config.provider]
    if (!scriptUrl) {
      setError(`Unknown captcha provider: ${config.provider}`)
      setLoading(false)
      return
    }

    const init = async () => {
      try {
        await loadScript(scriptUrl)
        if (!mounted || !containerRef.current) return

        if (config.provider === 'turnstile') {
          const turnstile = (window as any).turnstile
          if (!turnstile) return
          widgetRef.current = turnstile.render(containerRef.current, {
            sitekey: config.siteKey,
            theme,
            size,
            callback: (token: string) => onVerifyRef.current(token),
            'error-callback': () => {
              setError('Captcha failed')
              onErrorRef.current?.()
            },
            'expired-callback': () => {
              setError('Captcha expired')
              onExpiredRef.current?.()
            },
          })
        } else if (config.provider === 'hcaptcha') {
          const hcaptcha = (window as any).hcaptcha
          if (!hcaptcha) return
          widgetRef.current = hcaptcha.render(containerRef.current, {
            sitekey: config.siteKey,
            theme,
            size,
            callback: (token: string) => onVerifyRef.current(token),
            'error-callback': () => {
              setError('Captcha failed')
              onErrorRef.current?.()
            },
            'expired-callback': () => {
              setError('Captcha expired')
              onExpiredRef.current?.()
            },
          })
        } else if (config.provider === 'recaptcha') {
          const grecaptcha = (window as any).grecaptcha
          if (!grecaptcha) return
          widgetRef.current = grecaptcha.render(containerRef.current, {
            sitekey: config.siteKey,
            theme,
            size: size === 'flexible' ? 'normal' : size,
            callback: (token: string) => onVerifyRef.current(token),
            'error-callback': () => {
              setError('Captcha failed')
              onErrorRef.current?.()
            },
            'expired-callback': () => {
              setError('Captcha expired')
              onExpiredRef.current?.()
            },
          })
        }
      } catch {
        if (mounted) setError('Failed to load captcha')
      } finally {
        if (mounted) setLoading(false)
      }
    }

    init()

    return () => {
      mounted = false
      // Cleanup widget
      if (widgetRef.current != null) {
        try {
          if (config.provider === 'turnstile') (window as any).turnstile?.remove(widgetRef.current)
          else if (config.provider === 'hcaptcha') (window as any).hcaptcha?.remove(widgetRef.current)
        } catch { /* ignore */ }
        widgetRef.current = null
      }
    }
  }, [config.enabled, config.provider, config.siteKey, theme, size])

  if (!config.enabled) return null

  return (
    <div className={className}>
      <div ref={containerRef} />
      {loading && <div className="text-sm text-zinc-500 mt-2">Loading captcha...</div>}
      {error && <div className="text-sm text-red-500 mt-2">{error}</div>}
    </div>
  )
}
