export type CaptchaProvider = 'hcaptcha' | 'turnstile';

export interface CaptchaData {
  enabled: boolean;
  provider: CaptchaProvider;
  siteKey: string;
}
