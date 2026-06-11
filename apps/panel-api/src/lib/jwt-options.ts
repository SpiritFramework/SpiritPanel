import type jwt from 'jsonwebtoken';

/** Session and challenge tokens — HS256 only (OWASP JWT hardening). */
export const JWT_HS256_SIGN: jwt.SignOptions = {
  algorithm: 'HS256',
};

export const JWT_HS256_VERIFY: jwt.VerifyOptions = {
  algorithms: ['HS256'],
};
