import { verifyAppleToken } from '../../infrastructure/external-services/appleAuth';
import { verifyGoogleToken } from '../../infrastructure/external-services/googleAuth';
import { UserRepository } from '../../infrastructure/repositories/userRepository';
import { createSessionToken } from './sessionService';

const userRepository = new UserRepository();

type Provider = 'google' | 'apple';

export async function loginOrSignup(provider: string, idToken: string) {
  if (provider !== 'google' && provider !== 'apple') {
    throw new Error('Unsupported provider');
  }

  const result =
    provider === 'google'
      ? await loginOrSignupWithGoogle(idToken)
      : await loginOrSignupWithApple(idToken);

  const sessionToken = await createSessionToken(result.user);

  return {
    ...result,
    sessionToken,
  };
}

async function loginOrSignupWithGoogle(idToken: string) {
  const payload = await verifyGoogleToken(idToken);
  const userId = `google:${payload.sub}`;

  let user = await userRepository.findById(userId);
  let isNewUser = false;

  if (!user) {
    user = await userRepository.save({
      id: userId,
      provider: 'google',
      email: payload.email,
      name: payload.name,
      picture: payload.picture,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    isNewUser = true;
  }

  return {
    user,
    isNewUser,
  };
}

async function loginOrSignupWithApple(idToken: string) {
  const payload = await verifyAppleToken(idToken);
  const userId = `apple:${payload.sub}`;

  let user = await userRepository.findById(userId);
  let isNewUser = false;

  if (!user) {
    user = await userRepository.save({
      id: userId,
      provider: 'apple',
      email: payload.email,
      name: payload.name,
      picture: undefined,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    });
    isNewUser = true;
  }

  return {
    user,
    isNewUser,
  };
}
