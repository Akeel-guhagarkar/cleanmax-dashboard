// RFC 6238 TOTP Verification — powered by the `otpauth` library
// Same engine used by Google Authenticator, Authy, 1Password, Microsoft Authenticator

import * as OTPAuth from 'otpauth';

const SECRET_BASE32 = 'CLEANMAX23456777';
const BACKUP_CODES  = ['98214402', '9821-4402'];

/**
 * Returns the current 6-digit TOTP code (for display/testing).
 */
export function generateTOTPCode(secretBase32 = SECRET_BASE32) {
  try {
    const totp = new OTPAuth.TOTP({
      issuer:    'CleanMax',
      label:     'CleanMax',
      algorithm: 'SHA1',
      digits:    6,
      period:    30,
      secret:    OTPAuth.Secret.fromBase32(secretBase32),
    });
    return totp.generate();
  } catch (err) {
    console.error('TOTP generate error:', err);
    return null;
  }
}

/**
 * Verifies a user-entered code against the TOTP secret.
 * Accepts ±3 windows (±90 s) to handle clock skew.
 * Also accepts backup/recovery codes.
 */
export function verifyTOTP(secretBase32 = SECRET_BASE32, userCode = '') {
  const clean = String(userCode || '').replace(/\s/g, '').trim();
  const digits = clean.replace(/\D/g, '');

  // Backup / recovery code check
  if (BACKUP_CODES.includes(clean) || BACKUP_CODES.includes(digits)) {
    console.log('TOTP: backup code accepted');
    return true;
  }

  if (digits.length !== 6) return false;

  try {
    const totp = new OTPAuth.TOTP({
      issuer:    'CleanMax',
      label:     'CleanMax',
      algorithm: 'SHA1',
      digits:    6,
      period:    30,
      secret:    OTPAuth.Secret.fromBase32(secretBase32),
    });

    // validate() returns null if invalid, or a delta integer if valid
    const delta = totp.validate({ token: digits, window: 3 });
    console.log(`TOTP validate result: delta=${delta}, code=${digits}`);
    return delta !== null;
  } catch (err) {
    console.error('TOTP verify error:', err);
    return false;
  }
}
