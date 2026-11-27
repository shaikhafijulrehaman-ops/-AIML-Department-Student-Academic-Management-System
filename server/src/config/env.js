import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load server/.env relative to this file, then fallback to cwd .env
dotenv.config({ path: path.resolve(__dirname, '../../.env') });
dotenv.config();

export const ENV = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: process.env.PORT || 5000,
  CLIENT_ORIGIN: process.env.CLIENT_ORIGIN || 'http://localhost:5173',
  SUPABASE_URL: process.env.SUPABASE_URL || 'https://kynkutbcdsmkkqdbpzdn.supabase.co',
  SUPABASE_ANON_KEY:
    process.env.SUPABASE_ANON_KEY ||
    process.env.SUPABASE_PUBLISHABLE_KEY ||
    process.env.VITE_SUPABASE_PUBLISHABLE_KEY ||
    'sb_publishable_E7_sM400NF6oGpe9VGQEnQ_Zuov8N9l',
  SUPABASE_SECRET_KEY: 
    process.env.SUPABASE_SERVICE_ROLE_KEY || 
    process.env.SUPABASE_SECRET_KEY || 
    process.env.SUPABASE_SERVICE_KEY || 
    process.env.SUPABASE_ADMIN_KEY || 
    process.env.SERVICE_ROLE_KEY || 
    process.env.SUPABASE_KEY || 
    ''
};

export default ENV;
