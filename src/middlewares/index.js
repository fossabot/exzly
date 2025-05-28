/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {(req: Request, res: Response, next: NextFunction) => void} ExpressMiddleware
 */

const ms = require('ms');
const session = require('express-session');
const httpErrors = require('http-errors');
const FileStore = require('session-file-store')(session);
const { validationResult } = require('express-validator');
const { exzlyDebugMiddleware } = require('@exzly-utils');
const authMiddleware = require('./auth');
const storageMiddleware = require('./storage');
const fileLoaderMiddleware = require('./file-loader');
const viewEngineMiddleware = require('./view-engine');

/**
 * Run validation
 *
 * @type {ExpressMiddleware}
 */
const runValidation = (req, res, next) => {
  exzlyDebugMiddleware('run validation request');
  if (!validationResult(req).isEmpty()) {
    return next(httpErrors.BadRequest('validation'));
  }

  return next();
};

/**
 * Session init
 */
const sessionMiddleware = session({
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: true,
  store: new FileStore(),
  cookie: {
    path: '/',
    maxAge: ms(process.env.SESSION_EXPIRATION),
    sameSite: 'lax',
    httpOnly: false,
    secure: false,
  },
});

module.exports = {
  runValidation,
  authMiddleware,
  sessionMiddleware,
  fileLoaderMiddleware,
  viewEngineMiddleware,
  storageMiddleware,
};
