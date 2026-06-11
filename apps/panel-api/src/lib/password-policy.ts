import { getMinPasswordLength, isWeakPasswordBlockingEnabled } from './panel-settings.js';
import { isCommonPassword } from './secret-validation.js';

export async function getPasswordMinLength(): Promise<number> {
  return getMinPasswordLength();
}

export async function assertPasswordMeetsPolicy(password: string): Promise<void> {
  const min = await getMinPasswordLength();
  if (password.length < min) {
    throw Object.assign(new Error(`Password must be at least ${min} characters`), { statusCode: 422 });
  }
  if (await isWeakPasswordBlockingEnabled()) {
    if (isCommonPassword(password)) {
      throw Object.assign(
        new Error('Password is too common or too weak. Choose a longer, unique password.'),
        { statusCode: 422 },
      );
    }
  }
}
