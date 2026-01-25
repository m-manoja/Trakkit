export const config = {
    JWT_SECRET: process.env.JWT_SECRET || 'your-secret-key',
    JWT_EXPIRE: '30d', // 30 days
    NODE_ENV: process.env.NODE_ENV || 'development',
    PORT: process.env.PORT || 5000
};
