import { SignJWT, jwtVerify } from 'jose';

const sessionSecret = process.env.SESSION_SECRET;

if (!sessionSecret) {
  throw new Error('SESSION_SECRET is not defined in environment');
}

const encoder = new TextEncoder();
const secret = encoder.encode(sessionSecret); // encode once, reuse

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
    .sign(secret);
}

export async function verifySessionToken(token: string): Promise<{
  sub: string;
  email?: string;
  provider: string;
}> {
  const { payload } = await jwtVerify(token, secret, {
    algorithms: ['HS256'],
  });

  return payload as { sub: string; email?: string; provider: string };
}