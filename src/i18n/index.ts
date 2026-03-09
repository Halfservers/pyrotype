import i18n from 'i18next'
import { initReactI18next } from 'react-i18next'
import LanguageDetector from 'i18next-browser-languagedetector'

import common from '@/i18n/locales/en/common.json'
import auth from '@/i18n/locales/en/auth.json'
import server from '@/i18n/locales/en/server.json'
import files from '@/i18n/locales/en/files.json'
import backups from '@/i18n/locales/en/backups.json'
import databases from '@/i18n/locales/en/databases.json'
import schedules from '@/i18n/locales/en/schedules.json'
import users from '@/i18n/locales/en/users.json'
import startup from '@/i18n/locales/en/startup.json'
import settings from '@/i18n/locales/en/settings.json'
import admin from '@/i18n/locales/en/admin.json'
import errors from '@/i18n/locales/en/errors.json'

i18n
  .use(LanguageDetector)
  .use(initReactI18next)
  .init({
    resources: {
      en: {
        common,
        auth,
        server,
        files,
        backups,
        databases,
        schedules,
        users,
        startup,
        settings,
        admin,
        errors,
      },
    },
    detection: {
      order: ['navigator', 'htmlTag'],
    },
    fallbackLng: 'en',
    defaultNS: 'common',
    ns: [
      'common',
      'auth',
      'server',
      'files',
      'backups',
      'databases',
      'schedules',
      'users',
      'startup',
      'settings',
      'admin',
      'errors',
    ],
    interpolation: {
      escapeValue: false,
    },
  })

export default i18n
