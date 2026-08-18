import { SUBUSER_GRANTABLE_PERMISSIONS } from './client-server.js';

const ALLOWED = new Set<string>(SUBUSER_GRANTABLE_PERMISSIONS);

export class InvalidSubuserPermissionsError extends Error {
  constructor(message: string) {
    super(message);
    this.name = 'InvalidSubuserPermissionsError';
  }
}

/**
 * Validate subuser grants against the official permission list.
 * Wildcard (*) is never accepted — owners already have full access.
 */
export function validateSubuserPermissions(permissions: string[]): string[] {
  const unique = [...new Set(permissions.map((p) => p.trim()).filter(Boolean))];

  if (unique.length === 0) {
    throw new InvalidSubuserPermissionsError('At least one permission is required');
  }

  if (unique.includes('*')) {
    throw new InvalidSubuserPermissionsError(
      'Wildcard permissions are not allowed for subusers. Use specific permissions instead.',
    );
  }

  const invalid = unique.filter((p) => !ALLOWED.has(p));
  if (invalid.length > 0) {
    throw new InvalidSubuserPermissionsError(`Unknown permissions: ${invalid.join(', ')}`);
  }

  return unique;
}
