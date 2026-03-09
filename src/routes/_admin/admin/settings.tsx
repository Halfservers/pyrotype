import { createFileRoute } from '@tanstack/react-router'
import { useEffect, useState } from 'react'
import { toast } from 'sonner'
import { Plus, Pencil, Trash2, Globe, Loader2, CheckCircle2, XCircle } from 'lucide-react'
import {
  getSettings,
  updateSettings,
  sendTestMail,
  getDomains,
  createDomain,
  updateDomain,
  deleteDomain,
  testDnsConnection,
  getDnsProviderSchema,
  type AdminDomain,
} from '@/lib/api/admin'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Switch } from '@/components/ui/switch'
import { Skeleton } from '@/components/ui/skeleton'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { motion, fadeUp, staggerContainer, staggerItem } from '@/components/motion'

export const Route = createFileRoute('/_admin/admin/settings' as any)({
  component: AdminSettingsPage,
})

interface SettingsForm {
  'app:name': string
  'app:url': string
  'app:locale': string
  'app:maintenance_mode': string
  'pterodactyl:auth:2fa_required': string
  'mail:mailers:smtp:host': string
  'mail:mailers:smtp:port': string
  'mail:mailers:smtp:encryption': string
  'mail:mailers:smtp:username': string
  'mail:mailers:smtp:password': string
  'mail:from:address': string
  'mail:from:name': string
  'pterodactyl:captcha:provider': string
  'pterodactyl:captcha:turnstile:site_key': string
  'pterodactyl:captcha:turnstile:secret_key': string
  'pterodactyl:captcha:hcaptcha:site_key': string
  'pterodactyl:captcha:hcaptcha:secret_key': string
  'pterodactyl:captcha:recaptcha:site_key': string
  'pterodactyl:captcha:recaptcha:secret_key': string
  'pterodactyl:guzzle:timeout': string
  'pterodactyl:guzzle:connect_timeout': string
  'pterodactyl:client_features:allocations:enabled': string
  'pterodactyl:client_features:allocations:range_start': string
  'pterodactyl:client_features:allocations:range_end': string
}

const emptyForm: SettingsForm = {
  'app:name': '',
  'app:url': '',
  'app:locale': 'en',
  'app:maintenance_mode': '0',
  'pterodactyl:auth:2fa_required': '0',
  'mail:mailers:smtp:host': '',
  'mail:mailers:smtp:port': '',
  'mail:mailers:smtp:encryption': '',
  'mail:mailers:smtp:username': '',
  'mail:mailers:smtp:password': '',
  'mail:from:address': '',
  'mail:from:name': '',
  'pterodactyl:captcha:provider': 'none',
  'pterodactyl:captcha:turnstile:site_key': '',
  'pterodactyl:captcha:turnstile:secret_key': '',
  'pterodactyl:captcha:hcaptcha:site_key': '',
  'pterodactyl:captcha:hcaptcha:secret_key': '',
  'pterodactyl:captcha:recaptcha:site_key': '',
  'pterodactyl:captcha:recaptcha:secret_key': '',
  'pterodactyl:guzzle:timeout': '30',
  'pterodactyl:guzzle:connect_timeout': '5',
  'pterodactyl:client_features:allocations:enabled': '0',
  'pterodactyl:client_features:allocations:range_start': '',
  'pterodactyl:client_features:allocations:range_end': '',
}

function RadioGroup({
  options,
  value,
  onChange,
}: {
  options: { label: string; value: string }[]
  value: string
  onChange: (value: string) => void
}) {
  return (
    <div className="flex gap-0">
      {options.map((opt, i) => (
        <button
          key={opt.value}
          type="button"
          onClick={() => onChange(opt.value)}
          className={`px-3 py-1.5 text-sm font-medium border transition-colors ${
            value === opt.value
              ? 'bg-white/10 text-white border-white/20'
              : 'text-zinc-400 border-white/[0.08] hover:text-zinc-300'
          } ${i === 0 ? 'rounded-l-md' : ''} ${i === options.length - 1 ? 'rounded-r-md' : ''} ${i > 0 ? '-ml-px' : ''}`}
        >
          {opt.label}
        </button>
      ))}
    </div>
  )
}

function SettingsSkeleton() {
  return (
    <div className="grid gap-6 max-w-2xl">
      {[...Array(4)].map((_, i) => (
        <div key={i} className="grid gap-2">
          <Skeleton className="h-4 w-28" />
          <Skeleton className="h-10 w-full" />
        </div>
      ))}
      <div className="flex items-center justify-between">
        <Skeleton className="h-4 w-32" />
        <Skeleton className="h-6 w-11 rounded-full" />
      </div>
      <Skeleton className="h-10 w-32" />
    </div>
  )
}

function AdminSettingsPage() {
  const [form, setForm] = useState<SettingsForm>(emptyForm)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)

  const set = <K extends keyof SettingsForm>(key: K, value: SettingsForm[K]) =>
    setForm((f) => ({ ...f, [key]: value }))

  useEffect(() => {
    getSettings()
      .then((res) => {
        const items = Array.isArray(res) ? res : (res as any).data ?? []
        const settings: Record<string, string> = {}
        for (const item of items) {
          const attr = item.attributes ?? item
          settings[attr.key] = attr.value
        }
        const merged = { ...emptyForm }
        for (const key of Object.keys(merged) as (keyof SettingsForm)[]) {
          if (settings[key] !== undefined) {
            merged[key] = settings[key]
          }
        }
        setForm(merged)
      })
      .catch(() => toast.error('Failed to load settings'))
      .finally(() => setLoading(false))
  }, [])

  const handleSave = async () => {
    setSaving(true)
    try {
      const payload = { ...form }
      if (!payload['mail:mailers:smtp:password']) {
        delete (payload as Partial<SettingsForm>)['mail:mailers:smtp:password']
      }
      await updateSettings(payload)
      toast.success('Settings saved')
    } catch {
      toast.error('Failed to save settings')
    } finally {
      setSaving(false)
    }
  }

  const captchaProvider = form['pterodactyl:captcha:provider']
  const allocationsEnabled = form['pterodactyl:client_features:allocations:enabled'] === '1'

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Settings</h1>
          <p className="text-sm text-zinc-400 mt-1">Manage your panel configuration.</p>
        </div>
        <Button onClick={handleSave} disabled={saving || loading}>
          {saving ? 'Saving...' : 'Save Changes'}
        </Button>
      </div>

      {loading ? (
        <SettingsSkeleton />
      ) : (
        <Tabs defaultValue="basic">
          <TabsList variant="line">
            <TabsTrigger value="basic">Basic</TabsTrigger>
            <TabsTrigger value="mail">Mail</TabsTrigger>
            <TabsTrigger value="captcha">Captcha</TabsTrigger>
            <TabsTrigger value="advanced">Advanced</TabsTrigger>
            <TabsTrigger value="domains">Domains</TabsTrigger>
          </TabsList>

          <TabsContent value="basic">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="bg-[#ffffff06] border border-white/5 rounded-xl p-6 max-w-2xl"
            >
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <Label htmlFor="app-name">Company Name</Label>
                  <Input
                    id="app-name"
                    value={form['app:name']}
                    onChange={(e) => set('app:name', e.target.value)}
                    placeholder="My Company"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="app-url">Panel URL</Label>
                  <Input
                    id="app-url"
                    value={form['app:url']}
                    onChange={(e) => set('app:url', e.target.value)}
                    placeholder="https://panel.example.com"
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="app-locale">Default Language</Label>
                  <Input
                    id="app-locale"
                    value={form['app:locale']}
                    onChange={(e) => set('app:locale', e.target.value)}
                    placeholder="en"
                  />
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">Two-Factor Authentication</h3>
                  <RadioGroup
                    value={form['pterodactyl:auth:2fa_required']}
                    onChange={(v) => set('pterodactyl:auth:2fa_required', v)}
                    options={[
                      { label: 'Not Required', value: '0' },
                      { label: 'Admin Only', value: '1' },
                      { label: 'All Users', value: '2' },
                    ]}
                  />
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <Label htmlFor="maintenance-mode">Maintenance Mode</Label>
                      <p className="text-xs text-zinc-500 mt-0.5">
                        When enabled, users will see a maintenance page.
                      </p>
                    </div>
                    <Switch
                      id="maintenance-mode"
                      checked={form['app:maintenance_mode'] === '1'}
                      onCheckedChange={(checked: boolean) =>
                        set('app:maintenance_mode', checked ? '1' : '0')
                      }
                    />
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="mail">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="bg-[#ffffff06] border border-white/5 rounded-xl p-6 max-w-2xl"
            >
              <div className="grid gap-6">
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="smtp-host">SMTP Host</Label>
                    <Input
                      id="smtp-host"
                      value={form['mail:mailers:smtp:host']}
                      onChange={(e) => set('mail:mailers:smtp:host', e.target.value)}
                      placeholder="smtp.example.com"
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="smtp-port">SMTP Port</Label>
                    <Input
                      id="smtp-port"
                      value={form['mail:mailers:smtp:port']}
                      onChange={(e) => set('mail:mailers:smtp:port', e.target.value)}
                      placeholder="587"
                    />
                  </div>
                </div>

                <div className="grid gap-2">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">Encryption</h3>
                  <RadioGroup
                    value={form['mail:mailers:smtp:encryption']}
                    onChange={(v) => set('mail:mailers:smtp:encryption', v)}
                    options={[
                      { label: 'None', value: '' },
                      { label: 'TLS', value: 'tls' },
                      { label: 'SSL', value: 'ssl' },
                    ]}
                  />
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="smtp-user">Username</Label>
                      <Input
                        id="smtp-user"
                        value={form['mail:mailers:smtp:username']}
                        onChange={(e) => set('mail:mailers:smtp:username', e.target.value)}
                        placeholder="user@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="smtp-pass">Password</Label>
                      <Input
                        id="smtp-pass"
                        type="password"
                        value={form['mail:mailers:smtp:password']}
                        onChange={(e) => set('mail:mailers:smtp:password', e.target.value)}
                        placeholder="Leave blank to keep current"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="grid gap-2">
                      <Label htmlFor="from-address">From Address</Label>
                      <Input
                        id="from-address"
                        value={form['mail:from:address']}
                        onChange={(e) => set('mail:from:address', e.target.value)}
                        placeholder="noreply@example.com"
                      />
                    </div>
                    <div className="grid gap-2">
                      <Label htmlFor="from-name">From Name</Label>
                      <Input
                        id="from-name"
                        value={form['mail:from:name']}
                        onChange={(e) => set('mail:from:name', e.target.value)}
                        placeholder="Panel Mailer"
                      />
                    </div>
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <Button
                    variant="secondary"
                    onClick={async () => {
                      try {
                        await sendTestMail()
                        toast.success('Test email sent successfully!')
                      } catch (err: any) {
                        toast.error(err?.message || 'Failed to send test email')
                      }
                    }}
                  >
                    Send Test Mail
                  </Button>
                </div>
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="captcha">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="bg-[#ffffff06] border border-white/5 rounded-xl p-6 max-w-2xl"
            >
              <div className="grid gap-6">
                <div className="grid gap-2">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">Provider</h3>
                  <RadioGroup
                    value={captchaProvider}
                    onChange={(v) => set('pterodactyl:captcha:provider', v)}
                    options={[
                      { label: 'Disabled', value: 'none' },
                      { label: 'Turnstile', value: 'turnstile' },
                      { label: 'hCaptcha', value: 'hcaptcha' },
                      { label: 'reCAPTCHA', value: 'recaptcha' },
                    ]}
                  />
                </div>

                {captchaProvider === 'turnstile' && (
                  <div className="border-t border-white/[0.08] pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="turnstile-site">Turnstile Site Key</Label>
                        <Input
                          id="turnstile-site"
                          value={form['pterodactyl:captcha:turnstile:site_key']}
                          onChange={(e) =>
                            set('pterodactyl:captcha:turnstile:site_key', e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="turnstile-secret">Turnstile Secret Key</Label>
                        <Input
                          id="turnstile-secret"
                          value={form['pterodactyl:captcha:turnstile:secret_key']}
                          onChange={(e) =>
                            set('pterodactyl:captcha:turnstile:secret_key', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {captchaProvider === 'hcaptcha' && (
                  <div className="border-t border-white/[0.08] pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="hcaptcha-site">hCaptcha Site Key</Label>
                        <Input
                          id="hcaptcha-site"
                          value={form['pterodactyl:captcha:hcaptcha:site_key']}
                          onChange={(e) =>
                            set('pterodactyl:captcha:hcaptcha:site_key', e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="hcaptcha-secret">hCaptcha Secret Key</Label>
                        <Input
                          id="hcaptcha-secret"
                          value={form['pterodactyl:captcha:hcaptcha:secret_key']}
                          onChange={(e) =>
                            set('pterodactyl:captcha:hcaptcha:secret_key', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}

                {captchaProvider === 'recaptcha' && (
                  <div className="border-t border-white/[0.08] pt-6">
                    <div className="grid grid-cols-2 gap-4">
                      <div className="grid gap-2">
                        <Label htmlFor="recaptcha-site">reCAPTCHA Site Key</Label>
                        <Input
                          id="recaptcha-site"
                          value={form['pterodactyl:captcha:recaptcha:site_key']}
                          onChange={(e) =>
                            set('pterodactyl:captcha:recaptcha:site_key', e.target.value)
                          }
                        />
                      </div>
                      <div className="grid gap-2">
                        <Label htmlFor="recaptcha-secret">reCAPTCHA Secret Key</Label>
                        <Input
                          id="recaptcha-secret"
                          value={form['pterodactyl:captcha:recaptcha:secret_key']}
                          onChange={(e) =>
                            set('pterodactyl:captcha:recaptcha:secret_key', e.target.value)
                          }
                        />
                      </div>
                    </div>
                  </div>
                )}
              </div>
            </motion.div>
          </TabsContent>

          <TabsContent value="advanced">
            <motion.div
              variants={fadeUp}
              initial="hidden"
              animate="show"
              className="bg-[#ffffff06] border border-white/5 rounded-xl p-6 max-w-2xl"
            >
              <div className="grid gap-6">
                <h3 className="text-sm font-medium text-zinc-300 mb-3">HTTP Timeouts</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="grid gap-2">
                    <Label htmlFor="connect-timeout">Connection Timeout (seconds)</Label>
                    <Input
                      id="connect-timeout"
                      type="number"
                      value={form['pterodactyl:guzzle:connect_timeout']}
                      onChange={(e) => set('pterodactyl:guzzle:connect_timeout', e.target.value)}
                    />
                  </div>
                  <div className="grid gap-2">
                    <Label htmlFor="request-timeout">Request Timeout (seconds)</Label>
                    <Input
                      id="request-timeout"
                      type="number"
                      value={form['pterodactyl:guzzle:timeout']}
                      onChange={(e) => set('pterodactyl:guzzle:timeout', e.target.value)}
                    />
                  </div>
                </div>

                <div className="border-t border-white/[0.08] pt-6">
                  <h3 className="text-sm font-medium text-zinc-300 mb-3">Auto Allocation</h3>
                  <div className="grid gap-6">
                    <div className="flex items-center justify-between">
                      <div>
                        <Label htmlFor="alloc-enabled">Enabled</Label>
                        <p className="text-xs text-zinc-500 mt-0.5">
                          Allow users to auto-create allocations within a defined port range.
                        </p>
                      </div>
                      <Switch
                        id="alloc-enabled"
                        checked={allocationsEnabled}
                        onCheckedChange={(checked: boolean) =>
                          set('pterodactyl:client_features:allocations:enabled', checked ? '1' : '0')
                        }
                      />
                    </div>

                    {allocationsEnabled && (
                      <div className="grid grid-cols-2 gap-4">
                        <div className="grid gap-2">
                          <Label htmlFor="alloc-start">Starting Port</Label>
                          <Input
                            id="alloc-start"
                            type="number"
                            value={form['pterodactyl:client_features:allocations:range_start']}
                            onChange={(e) =>
                              set(
                                'pterodactyl:client_features:allocations:range_start',
                                e.target.value,
                              )
                            }
                            placeholder="1024"
                          />
                        </div>
                        <div className="grid gap-2">
                          <Label htmlFor="alloc-end">Ending Port</Label>
                          <Input
                            id="alloc-end"
                            type="number"
                            value={form['pterodactyl:client_features:allocations:range_end']}
                            onChange={(e) =>
                              set(
                                'pterodactyl:client_features:allocations:range_end',
                                e.target.value,
                              )
                            }
                            placeholder="65535"
                          />
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </motion.div>
          </TabsContent>
          <TabsContent value="domains">
            <DomainsTab />
          </TabsContent>
        </Tabs>
      )}
    </div>
  )
}

// ── Domains Tab ──────────────────────────────────────────────────────────────

const DNS_PROVIDERS = [
  { value: 'cloudflare', label: 'Cloudflare' },
  { value: 'hetzner', label: 'Hetzner DNS' },
  { value: 'route53', label: 'AWS Route 53' },
]

interface DomainFormData {
  name: string
  dns_provider: string
  dns_config: Record<string, string>
  is_active: boolean
  is_default: boolean
}

const emptyDomainForm: DomainFormData = {
  name: '',
  dns_provider: 'cloudflare',
  dns_config: {},
  is_active: true,
  is_default: false,
}

interface ProviderField {
  key: string
  label: string
  type: string
  required: boolean
}

function DomainsTab() {
  const [domains, setDomains] = useState<AdminDomain[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingDomain, setEditingDomain] = useState<AdminDomain | null>(null)
  const [form, setForm] = useState<DomainFormData>(emptyDomainForm)
  const [submitting, setSubmitting] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminDomain | null>(null)
  const [deleting, setDeleting] = useState(false)
  const [providerFields, setProviderFields] = useState<ProviderField[]>([])
  const [loadingSchema, setLoadingSchema] = useState(false)
  const [testingConnection, setTestingConnection] = useState(false)
  const [testResult, setTestResult] = useState<{ success: boolean; message?: string; error?: string } | null>(null)

  const loadDomains = () => {
    setLoading(true)
    getDomains(1)
      .then((res) => setDomains(res.data.map((d) => d.attributes)))
      .catch(() => toast.error('Failed to load domains'))
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    loadDomains()
  }, [])

  const loadProviderSchema = (provider: string) => {
    setLoadingSchema(true)
    getDnsProviderSchema(provider)
      .then((res) => setProviderFields(res.fields))
      .catch(() => setProviderFields([]))
      .finally(() => setLoadingSchema(false))
  }

  const openCreate = () => {
    setForm(emptyDomainForm)
    setEditingDomain(null)
    setTestResult(null)
    setDialogOpen(true)
    loadProviderSchema('cloudflare')
  }

  const openEdit = (domain: AdminDomain) => {
    setForm({
      name: domain.name,
      dns_provider: domain.dns_provider,
      dns_config: (domain.dns_config as Record<string, string>) || {},
      is_active: domain.is_active,
      is_default: domain.is_default,
    })
    setEditingDomain(domain)
    setTestResult(null)
    setDialogOpen(true)
    loadProviderSchema(domain.dns_provider)
  }

  const handleProviderChange = (provider: string) => {
    setForm((f) => ({ ...f, dns_provider: provider, dns_config: {} }))
    setTestResult(null)
    loadProviderSchema(provider)
  }

  const handleConfigField = (key: string, value: string) => {
    setForm((f) => ({ ...f, dns_config: { ...f.dns_config, [key]: value } }))
    setTestResult(null)
  }

  const handleTestConnection = async () => {
    setTestingConnection(true)
    setTestResult(null)
    try {
      const result = await testDnsConnection({
        dns_provider: form.dns_provider,
        dns_config: form.dns_config,
      })
      setTestResult(result)
    } catch {
      setTestResult({ success: false, error: 'Request failed' })
    } finally {
      setTestingConnection(false)
    }
  }

  const handleSubmit = async () => {
    setSubmitting(true)
    try {
      if (editingDomain) {
        await updateDomain(editingDomain.id, {
          name: form.name,
          dns_provider: form.dns_provider,
          dns_config: form.dns_config,
          is_active: form.is_active,
          is_default: form.is_default,
        })
        toast.success('Domain updated')
      } else {
        await createDomain({
          name: form.name,
          dns_provider: form.dns_provider,
          dns_config: form.dns_config,
          is_active: form.is_active,
          is_default: form.is_default,
        })
        toast.success('Domain created')
      }
      setDialogOpen(false)
      loadDomains()
    } catch {
      toast.error(editingDomain ? 'Failed to update domain' : 'Failed to create domain')
    } finally {
      setSubmitting(false)
    }
  }

  const handleDelete = async () => {
    if (!deleteTarget) return
    setDeleting(true)
    try {
      await deleteDomain(deleteTarget.id)
      toast.success('Domain deleted')
      setDeleteTarget(null)
      loadDomains()
    } catch {
      toast.error('Failed to delete domain')
    } finally {
      setDeleting(false)
    }
  }

  return (
    <motion.div variants={fadeUp} initial="hidden" animate="show">
      <div className="flex items-center justify-between mb-4">
        <div>
          <p className="text-sm text-zinc-400">Manage DNS domains for server subdomains.</p>
        </div>
        <Button size="sm" onClick={openCreate}>
          <Plus className="w-3.5 h-3.5 mr-1.5" />
          Add Domain
        </Button>
      </div>

      {loading ? (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-zinc-500 text-xs">Domain</TableHead>
                <TableHead className="text-zinc-500 text-xs">Provider</TableHead>
                <TableHead className="text-zinc-500 text-xs">Active</TableHead>
                <TableHead className="text-zinc-500 text-xs">Default</TableHead>
                <TableHead className="text-zinc-500 text-xs">Subdomains</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {Array.from({ length: 3 }).map((_, i) => (
                <TableRow key={i} className="border-white/[0.08]">
                  <TableCell><Skeleton className="h-4 w-36" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-20 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-5 w-14 rounded-full" /></TableCell>
                  <TableCell><Skeleton className="h-4 w-8" /></TableCell>
                  <TableCell className="text-right"><Skeleton className="h-7 w-16 ml-auto" /></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      ) : domains.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-16 border border-white/[0.06] rounded-xl">
          <Globe className="w-10 h-10 text-zinc-700 mb-3" />
          <p className="text-sm text-zinc-500">No domains configured yet.</p>
          <Button size="sm" variant="outline" className="mt-4" onClick={openCreate}>
            Add your first domain
          </Button>
        </div>
      ) : (
        <div className="border border-white/[0.08] rounded-xl overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow className="border-white/[0.08] hover:bg-transparent">
                <TableHead className="text-zinc-500 text-xs">Domain</TableHead>
                <TableHead className="text-zinc-500 text-xs">Provider</TableHead>
                <TableHead className="text-zinc-500 text-xs">Active</TableHead>
                <TableHead className="text-zinc-500 text-xs">Default</TableHead>
                <TableHead className="text-zinc-500 text-xs">Subdomains</TableHead>
                <TableHead className="text-zinc-500 text-xs text-right">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <motion.tbody variants={staggerContainer} initial="hidden" animate="show">
              {domains.map((domain, i) => (
                <motion.tr
                  key={domain.id}
                  variants={staggerItem}
                  custom={i}
                  className="border-b border-white/[0.06] last:border-0 hover:bg-white/[0.02] transition-colors"
                >
                  <TableCell className="font-medium text-white text-sm">{domain.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline" className="text-xs capitalize">
                      {DNS_PROVIDERS.find((p) => p.value === domain.dns_provider)?.label ?? domain.dns_provider}
                    </Badge>
                  </TableCell>
                  <TableCell>
                    {domain.is_active ? (
                      <Badge className="text-xs bg-green-500/15 text-green-400 border-green-500/20">Active</Badge>
                    ) : (
                      <Badge variant="outline" className="text-xs text-zinc-500">Inactive</Badge>
                    )}
                  </TableCell>
                  <TableCell>
                    {domain.is_default ? (
                      <Badge className="text-xs bg-blue-500/15 text-blue-400 border-blue-500/20">Default</Badge>
                    ) : (
                      <span className="text-zinc-600 text-xs">-</span>
                    )}
                  </TableCell>
                  <TableCell className="text-zinc-400 text-sm">{domain.subdomain_count}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex items-center justify-end gap-1">
                      <Button variant="ghost" size="xs" onClick={() => openEdit(domain)}>
                        <Pencil className="w-3 h-3" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="xs"
                        className="text-red-400 hover:text-red-300"
                        onClick={() => setDeleteTarget(domain)}
                      >
                        <Trash2 className="w-3 h-3" />
                      </Button>
                    </div>
                  </TableCell>
                </motion.tr>
              ))}
            </motion.tbody>
          </Table>
        </div>
      )}

      {/* Create / Edit Domain Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08] max-w-lg">
          <DialogHeader>
            <DialogTitle>{editingDomain ? 'Edit Domain' : 'Add Domain'}</DialogTitle>
            <DialogDescription>
              {editingDomain ? 'Update this domain and its DNS configuration.' : 'Add a new domain with DNS provider settings.'}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="space-y-1">
              <Label>Domain Name</Label>
              <Input
                value={form.name}
                onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                placeholder="game.example.com"
              />
            </div>

            <div className="space-y-1">
              <Label>DNS Provider</Label>
              <Select value={form.dns_provider} onValueChange={handleProviderChange}>
                <SelectTrigger>
                  <SelectValue placeholder="Select provider" />
                </SelectTrigger>
                <SelectContent>
                  {DNS_PROVIDERS.map((p) => (
                    <SelectItem key={p.value} value={p.value}>{p.label}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {loadingSchema ? (
              <div className="flex items-center gap-2 py-2 text-xs text-zinc-500">
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                Loading provider fields...
              </div>
            ) : providerFields.length > 0 ? (
              <div className="space-y-3 border border-white/[0.06] rounded-lg p-3">
                <p className="text-xs font-medium text-zinc-400 uppercase tracking-wider">Provider Configuration</p>
                {providerFields.map((field) => (
                  <div key={field.key} className="space-y-1">
                    <Label className="text-xs">
                      {field.label}
                      {field.required && <span className="text-red-400 ml-1">*</span>}
                    </Label>
                    <Input
                      type={field.type === 'password' ? 'password' : 'text'}
                      value={(form.dns_config[field.key] as string) || ''}
                      onChange={(e) => handleConfigField(field.key, e.target.value)}
                      placeholder={field.type === 'password' ? '••••••••' : field.label}
                    />
                  </div>
                ))}
              </div>
            ) : null}

            {testResult && (
              <div className={`flex items-center gap-2 rounded-lg px-3 py-2 text-sm ${testResult.success ? 'bg-green-500/10 text-green-400' : 'bg-red-500/10 text-red-400'}`}>
                {testResult.success
                  ? <CheckCircle2 className="w-4 h-4 shrink-0" />
                  : <XCircle className="w-4 h-4 shrink-0" />
                }
                <span>{testResult.success ? testResult.message : testResult.error}</span>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4 pt-1">
              <div className="flex items-center justify-between border border-white/[0.06] rounded-lg px-3 py-2.5">
                <div>
                  <Label className="text-xs">Active</Label>
                  <p className="text-xs text-zinc-600 mt-0.5">Enable this domain</p>
                </div>
                <Switch
                  checked={form.is_active}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_active: checked }))}
                />
              </div>
              <div className="flex items-center justify-between border border-white/[0.06] rounded-lg px-3 py-2.5">
                <div>
                  <Label className="text-xs">Default</Label>
                  <p className="text-xs text-zinc-600 mt-0.5">Use as default</p>
                </div>
                <Switch
                  checked={form.is_default}
                  onCheckedChange={(checked) => setForm((f) => ({ ...f, is_default: checked }))}
                />
              </div>
            </div>
          </div>

          <DialogFooter className="flex-wrap gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={handleTestConnection}
              disabled={testingConnection || !form.dns_provider}
            >
              {testingConnection ? (
                <><Loader2 className="w-3 h-3 mr-1.5 animate-spin" />Testing...</>
              ) : (
                'Test Connection'
              )}
            </Button>
            <div className="flex gap-2 ml-auto">
              <Button variant="outline" onClick={() => setDialogOpen(false)}>Cancel</Button>
              <Button
                onClick={handleSubmit}
                disabled={submitting || !form.name || !form.dns_provider}
              >
                {submitting ? 'Saving...' : editingDomain ? 'Save Changes' : 'Create'}
              </Button>
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Delete Confirmation Dialog */}
      <Dialog open={!!deleteTarget} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <DialogContent className="bg-[#0a0a0a] border-white/[0.08]">
          <DialogHeader>
            <DialogTitle>Delete Domain</DialogTitle>
          </DialogHeader>
          <p className="text-sm text-zinc-400">
            Are you sure you want to delete{' '}
            <span className="text-white font-medium">{deleteTarget?.name}</span>?
            {(deleteTarget?.subdomain_count ?? 0) > 0 && (
              <span className="text-red-400"> This domain has {deleteTarget?.subdomain_count} active subdomains and cannot be deleted.</span>
            )}
            {(deleteTarget?.subdomain_count ?? 0) === 0 && ' This action cannot be undone.'}
          </p>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>Cancel</Button>
            <Button
              variant="destructive"
              onClick={handleDelete}
              disabled={deleting || (deleteTarget?.subdomain_count ?? 0) > 0}
            >
              {deleting ? 'Deleting...' : 'Delete'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </motion.div>
  )
}
