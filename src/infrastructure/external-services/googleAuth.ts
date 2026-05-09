import axios from 'axios';

export type GooglePayload = {
  sub: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  picture?: string;
  aud: string;
};

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
  const response = await axios.get<GooglePayload>(
    `https://oauth2.googleapis.com/tokeninfo?id_token=${encodeURIComponent(idToken)}`,
  );

  const payload = response.data;

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw new Error('Invalid Google client ID');
  }

  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw new Error('Google email is not verified');
  }

  return payload;
}
