import * as dotenv from 'dotenv';

// Load environment variables from .env file
dotenv.config();

if (!process.env.SUPABASE_URL || !process.env.SUPABASE_ANON_KEY || !process.env.SUPABASE_SERVICE_ROLE_KEY) {
    throw new Error('Missing required Supabase environment variables');
}

interface Config {
    port: string | number;
    nodeEnv: string;
    jwt: {
        secret: string;
        expiresIn: string;
    };
    supabase: {
        url: string;
        anonKey: string;
        serviceRoleKey: string;
    };
    textlk: {
        apiToken?: string;
        senderId?: string;
    };
    payhere: {
        merchantId: string;
        merchantSecret: string;
    };
}

const config: Config = {
    // Server configuration
    port: process.env.PORT || 5000,
    nodeEnv: process.env.NODE_ENV || 'development',

    // JWT configuration
    jwt: {
        secret: process.env.JWT_SECRET || 'your-secret-key',
        expiresIn: process.env.JWT_EXPIRES_IN || '30d',
    },

    // Supabase configuration
    supabase: {
        url: process.env.SUPABASE_URL,
        anonKey: process.env.SUPABASE_ANON_KEY,
        serviceRoleKey: process.env.SUPABASE_SERVICE_ROLE_KEY,
    },

    // TextLK configuration
    textlk: {
        apiToken: process.env.TEXTLK_API_TOKEN,
        senderId: process.env.TEXTLK_SENDER_ID,
    },

    // PayHere configuration
    payhere: {
        merchantId: process.env.PAYHERE_MERCHANT_ID || '',
        merchantSecret: process.env.PAYHERE_MERCHANT_SECRET || '',
    },
};

export default config;
