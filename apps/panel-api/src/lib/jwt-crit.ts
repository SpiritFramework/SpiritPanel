import jwt from 'jsonwebtoken';

const JWS_REGISTERED_HEADERS = new Set([
  'alg',
  'jku',
  'jwk',
  'kid',
  'x5u',
  'x5c',
  'x5t',
  'x5t#S256',
  'typ',
  'cty',
  'crit',
]);

/** Critical header extensions this application understands (RFC 7515 §4.1.11). */
const ALLOWED_CRIT_HEADERS = new Set<string>();

function critError(message: string): jwt.JsonWebTokenError {
  return new jwt.JsonWebTokenError(message);
}

/** Validate JWS crit header before signature verification. */
export function assertJwtCritHeaderSupported(header: jwt.JwtHeader | undefined): void {
  const crit = header?.crit;
  if (crit === undefined || crit === null) return;

  if (!Array.isArray(crit) || crit.length === 0) {
    throw critError('crit must be a non-empty array');
  }

  const seen = new Set<string>();
  const headerRecord = header as unknown as Record<string, unknown>;

  for (const ext of crit) {
    if (typeof ext !== 'string' || ext.length === 0) {
      throw critError('crit entries must be non-empty strings');
    }
    if (seen.has(ext)) {
      throw critError(`Duplicate crit entry: ${ext}`);
    }
    seen.add(ext);
    if (JWS_REGISTERED_HEADERS.has(ext)) {
      throw critError(`crit must not contain standard header parameter "${ext}"`);
    }
    if (!ALLOWED_CRIT_HEADERS.has(ext)) {
      throw critError(`Unsupported critical extension: ${ext}`);
    }
    if (!(ext in headerRecord)) {
      throw critError(`Critical extension ${ext} not present in header`);
    }
  }
}

export function assertTokenCritHeaderSupported(token: string): void {
  const decoded = jwt.decode(token, { complete: true });
  if (!decoded || typeof decoded === 'string') {
    throw critError('invalid token');
  }
  assertJwtCritHeaderSupported(decoded.header);
}
