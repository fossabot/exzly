const { securityConfig } = require('@exzly-config');
const { jwtSignIn } = require('@exzly-utils');

/**
 * Create user token
 *
 * @param {'access-token'|'refresh-token'} type
 * @param {number} userId
 * @returns {string}
 */
const createUserToken = (type, userId) => {
  const expires = type === 'refresh-token' ? securityConfig.refreshTokenExpires : undefined;
  return jwtSignIn({ type, userId }, expires);
};

/**
 * Reset password
 *
 * @param {number|string} code
 * @returns {string}
 */
const createPasswordResetToken = (code) => {
  return jwtSignIn({ code }, securityConfig.passwordResetExpires);
};

module.exports = { createUserToken, createPasswordResetToken };
