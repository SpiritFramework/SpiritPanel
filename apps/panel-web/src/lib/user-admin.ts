import type { CreateAdminUserInput } from './api';

export type UserCreateFormState = {
  email: string;
  username: string;
  password: string;
  role: NonNullable<CreateAdminUserInput['role']>;
  firstName: string;
  lastName: string;
};

export const DEFAULT_USER_CREATE_FORM: UserCreateFormState = {
  email: '',
  username: '',
  password: '',
  role: 'user',
  firstName: '',
  lastName: '',
};

export const USER_ROLE_META: Record<
  UserCreateFormState['role'],
  { label: string; summary: string }
> = {
  user: {
    label: 'User',
    summary: 'Own servers and profile only',
  },
  staff: {
    label: 'Staff',
    summary: 'Tickets, suspend, read-only infra',
  },
  admin: {
    label: 'Admin',
    summary: 'Full admin panel access',
  },
};

export function userCreateProgress(form: UserCreateFormState) {
  const emailOk = Boolean(form.email.trim() && form.email.includes('@'));
  const usernameOk = Boolean(form.username.trim());
  const passwordOk = form.password.length >= 8;
  const roleOk = Boolean(form.role);

  const steps = [
    { id: 'profile', label: 'Profile', done: emailOk && usernameOk },
    { id: 'security', label: 'Password', done: passwordOk },
    { id: 'access', label: 'Access role', done: roleOk },
  ];

  const ready = emailOk && usernameOk && passwordOk && roleOk;

  return { steps, ready, done: steps.filter((s) => s.done).length, total: steps.length };
}

export function userCreatePayload(form: UserCreateFormState): CreateAdminUserInput {
  return {
    email: form.email.trim(),
    username: form.username.trim(),
    password: form.password,
    role: form.role,
    firstName: form.firstName.trim() || undefined,
    lastName: form.lastName.trim() || undefined,
  };
}
