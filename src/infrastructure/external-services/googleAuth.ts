import axios from 'axios';

export type GooglePayload = {
  sub: string;
  email: string;
  email_verified: string | boolean;
  name?: string;
  picture?: string;
  aud: string;
};

const GOOGLE_TOKENINFO_URL = 'https://oauth2.googleapis.com/tokeninfo';
const GOOGLE_VERIFY_TIMEOUT_MS = 8000;

function httpError(message: string, status: number): Error {
  const err = new Error(message) as Error & { status: number };
  err.status = status;
  return err;
}

export async function verifyGoogleToken(idToken: string): Promise<GooglePayload> {
  if (!process.env.GOOGLE_CLIENT_ID) {
    throw httpError('GOOGLE_CLIENT_ID is not defined in environment', 500);
  }

  let payload: GooglePayload;

  try {
    const response = await axios.get<GooglePayload>(GOOGLE_TOKENINFO_URL, {
      params: { id_token: idToken },
      timeout: GOOGLE_VERIFY_TIMEOUT_MS,
    });
    payload = response.data;
  } catch (error) {
    if (axios.isAxiosError(error)) {
      const code = error.code ?? '';
      const status = error.response?.status;

      if (status === 400 || status === 401) {
        throw httpError('Invalid Google token', 401);
      }

      if (
        code === 'ETIMEDOUT' ||
        code === 'ECONNABORTED' ||
        code === 'ENOTFOUND' ||
        code === 'EAI_AGAIN'
      ) {
        throw httpError('Google authentication is temporarily unavailable. Please try again.', 503);
      }

      if (typeof status === 'number' && status >= 500) {
        throw httpError('Google authentication is temporarily unavailable. Please try again.', 503);
      }
    }

    throw httpError('Failed to verify Google token', 502);
  }

  if (payload.aud !== process.env.GOOGLE_CLIENT_ID) {
    throw httpError('Invalid Google client ID', 401);
  }

  if (payload.email_verified !== 'true' && payload.email_verified !== true) {
    throw httpError('Google email is not verified', 401);
  }

  return payload;
}
