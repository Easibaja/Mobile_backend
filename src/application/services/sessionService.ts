import { SignJWT } from 'jose';

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not defined in environment');
}

const encoder = new TextEncoder();

export async function createSessionToken(user: {
  id: string;
  email?: string;
  provider: string;
}) {
  return await new SignJWT({
    sub: user.id,
    email: user.email,
    provider: user.provider,
  })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(encoder.encode(sessionSecret));
}
