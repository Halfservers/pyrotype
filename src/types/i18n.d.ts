import 'i18next'

import type common from '@/i18n/locales/en/common.json'
import type auth from '@/i18n/locales/en/auth.json'
import type server from '@/i18n/locales/en/server.json'
import type files from '@/i18n/locales/en/files.json'
import type backups from '@/i18n/locales/en/backups.json'
import type databases from '@/i18n/locales/en/databases.json'
import type schedules from '@/i18n/locales/en/schedules.json'
import type users from '@/i18n/locales/en/users.json'
import type startup from '@/i18n/locales/en/startup.json'
import type settings from '@/i18n/locales/en/settings.json'
import type admin from '@/i18n/locales/en/admin.json'
import type errors from '@/i18n/locales/en/errors.json'

declare module 'i18next' {
  interface CustomTypeOptions {
    defaultNS: 'common'
    resources: {
      common: typeof common
      auth: typeof auth
      server: typeof server
      files: typeof files
      backups: typeof backups
      databases: typeof databases
      schedules: typeof schedules
      users: typeof users
      startup: typeof startup
      settings: typeof settings
      admin: typeof admin
      errors: typeof errors
    }
  }
}
