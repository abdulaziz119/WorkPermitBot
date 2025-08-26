import * as dotenv from 'dotenv';

dotenv.config();
const DB_PORT = parseInt(process.env.DB_PORT || '5432', 10);
const DB_HOST = process.env.DB_HOST || '';
const DB_USER = process.env.DB_USER || '';
const DB_DB = process.env.DB_NAME || '';
const DB_PASS = process.env.DB_PASSWORD || '';
const DB_SCHEMA = process.env.DB_SCHEMA || '';

const TELEGRAM_BOT_TOKEN = process.env.BOT_TOKEN || '';

const PORT = process.env.PORT || 3000;

const SMTP_USER = process.env.SMTP_USER || '';
const SMTP_PASS = process.env.SMTP_PASS || '';

// Optional reminder schedule (Uzbekistan time default)
const REMINDER_CHECKIN_HH = parseInt(
  process.env.REMINDER_CHECKIN_HH || '8',
  10,
);
const REMINDER_CHECKIN_MM = parseInt(
  process.env.REMINDER_CHECKIN_MM || '0',
  10,
);
const REMINDER_CHECKOUT_HH = parseInt(
  process.env.REMINDER_CHECKOUT_HH || '18',
  10,
);
const REMINDER_CHECKOUT_MM = parseInt(
  process.env.REMINDER_CHECKOUT_MM || '0',
  10,
);
const APP_TIMEZONE = process.env.APP_TIMEZONE || 'Asia/Tashkent';

if (!DB_SCHEMA || !DB_HOST || !DB_USER || !DB_DB || !DB_PASS) {
  throw new Error('Database environment variables are not set');
}

export {
  SMTP_USER,
  SMTP_PASS,
  TELEGRAM_BOT_TOKEN,
  DB_SCHEMA,
  PORT,
  DB_PORT,
  DB_HOST,
  DB_USER,
  DB_DB,
  DB_PASS,
  REMINDER_CHECKIN_HH,
  REMINDER_CHECKIN_MM,
  REMINDER_CHECKOUT_HH,
  REMINDER_CHECKOUT_MM,
  APP_TIMEZONE,
};
