import { getMinPasswordLength } from './panel-settings.js';

export async function getPasswordMinLength(): Promise<number> {
  return getMinPasswordLength();
}

export async function assertPasswordMeetsPolicy(password: string): Promise<void> {
  const min = await getMinPasswordLength();
  if (password.length < min) {
    throw Object.assign(new Error(`Password must be at least ${min} characters`), { statusCode: 422 });
  }
}
