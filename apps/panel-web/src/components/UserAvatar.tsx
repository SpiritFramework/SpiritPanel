import { getUserTheme } from './UserCard';

export type UserAvatarUser = {
  username: string;
  avatarUrl?: string | null;
  role?: string;
  rootAdmin?: boolean;
  suspended?: boolean;
};

const SIZE_CLASS = {
  xs: 'user-avatar--xs',
  sm: 'user-avatar--sm',
  md: 'user-avatar--md',
  lg: 'user-avatar--lg',
  xl: 'user-avatar--xl',
} as const;

export function UserAvatar({
  user,
  size = 'md',
  className = '',
  ring = false,
}: {
  user: UserAvatarUser;
  size?: keyof typeof SIZE_CLASS;
  className?: string;
  ring?: boolean;
}) {
  const initial = user.username.charAt(0).toUpperCase();
  const classes = ['user-avatar', SIZE_CLASS[size], ring ? 'user-avatar--ring' : '', className]
    .filter(Boolean)
    .join(' ');

  if (user.avatarUrl) {
    return <img src={user.avatarUrl} alt="" className={`${classes} user-avatar--photo`} />;
  }

  const theme =
    user.role != null
      ? getUserTheme({
          role: user.role,
          rootAdmin: user.rootAdmin ?? false,
          suspended: user.suspended ?? false,
        })
      : null;

  return (
    <span
      className={`${classes} user-avatar--initial`}
      style={theme ? { background: theme.gradient } : undefined}
      aria-hidden
    >
      {initial}
    </span>
  );
}
