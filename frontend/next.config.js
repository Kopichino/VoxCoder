/** @type {import('next').NextConfig} */
const nextConfig = {
  // For server-side SQLite
  serverExternalPackages: ['better-sqlite3'],
  
  // Environment variable for Flask API
  env: {
    NEXT_PUBLIC_FLASK_URL: process.env.NEXT_PUBLIC_FLASK_URL || 'http://localhost:5000',
  },
};

module.exports = nextConfig;
