import { createRemoteJWKSet, jwtVerify } from 'jose';
import { URL } from 'url';

const appleIssuer = 'https://appleid.apple.com';
const appleClientId = process.env.APPLE_CLIENT_ID;

//TODO: Apple Sign In is currently disabled because it requires additional setup in the Apple Developer portal and testing on a real iOS device. We can re-enable it once we have that setup in place.

/*if (!appleClientId) {
  throw new Error('APPLE_CLIENT_ID is not defined in environment');
}*/

const appleAuthKeys = createRemoteJWKSet(new URL('https://appleid.apple.com/auth/keys'));

export type ApplePayload = {
  sub: string;
  iss: string;
  aud: string;
  email?: string;
  email_verified?: string | boolean;
  name?: string;
};

export async function verifyAppleToken(idToken: string): Promise<ApplePayload> {
  const { payload } = await jwtVerify(idToken, appleAuthKeys, {
    issuer: appleIssuer,
    audience: appleClientId,
  });

  if (!payload.sub) {
    throw new Error('Apple token missing subject');
  }

  return payload as ApplePayload;
}
