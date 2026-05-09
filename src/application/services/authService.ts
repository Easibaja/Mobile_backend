import { verifyGoogleToken } from '../../infrastructure/external-services/googleAuth';
import { UserRepository } from '../../infrastructure/repositories/userRepository';

const userRepository = new UserRepository();

export async function loginOrSignupWithGoogle(idToken: string) {
  const payload = await verifyGoogleToken(idToken);

  let user = await userRepository.findByEmail(payload.email);
  let isNewUser = false;

  if (!user) {
    user = await userRepository.save({
      id: payload.sub,
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
