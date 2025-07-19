# NextAuth Setup Guide

## Environment Variables

Create a `.env.local` file in the `pickleglass_web` directory with the following variables:

```env
# NextAuth Configuration
NEXTAUTH_URL=http://localhost:3000
NEXTAUTH_SECRET=your-nextauth-secret-key-here

# Google OAuth Credentials
GOOGLE_CLIENT_ID=your-google-client-id-here
GOOGLE_CLIENT_SECRET=your-google-client-secret-here

# Firebase Configuration (for Firestore access during transition)
NEXT_PUBLIC_FIREBASE_API_KEY=AIzaSyBsfdf718XTD-mzVJck-llwnO6nWtvntHg
NEXT_PUBLIC_FIREBASE_AUTH_DOMAIN=glass-16d5b.firebaseapp.com
NEXT_PUBLIC_FIREBASE_PROJECT_ID=glass-16d5b
NEXT_PUBLIC_FIREBASE_STORAGE_BUCKET=glass-16d5b.firebasestorage.app
NEXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID=1008700581149
NEXT_PUBLIC_FIREBASE_APP_ID=1:1008700581149:web:cc2d81873e5b5d677eedf4
NEXT_PUBLIC_FIREBASE_MEASUREMENT_ID=G-89T6F1FZRT
```

## Google OAuth Setup

1. Go to the [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project or select an existing one
3. Enable the Google+ API
4. Go to "Credentials" and create an "OAuth 2.0 Client ID"
5. Set the authorized redirect URI to: `http://localhost:3000/api/auth/callback/google`
6. Copy the Client ID and Client Secret to your `.env.local` file

## NextAuth Secret

Generate a secure random string for `NEXTAUTH_SECRET`:

```bash
openssl rand -base64 32
```

## Installation

Run the following commands to install dependencies:

```bash
cd pickleglass_web
npm install
```

## Testing

Start the development server:

```bash
npm run dev
```

Visit `http://localhost:3000/login` to test the Google sign-in flow. 