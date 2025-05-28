const express = require('express');
const _ = require('lodash');
const httpErrors = require('http-errors');
const { matchedData } = require('express-validator');
const { securityConfig } = require('@exzly-config');
const { UserModel } = require('@exzly-models');
const { storageMiddleware, authMiddleware } = require('@exzly-middlewares');
const { commonValidator, userValidator } = require('@exzly-validators');

const app = express.Router();

/**
 * Get users
 */
app.get(
  '/',
  authMiddleware.rejectUnauthorized,
  authMiddleware.rejectNonAdmin,
  [commonValidator.dataQuery, commonValidator.dataTablesQuery],
  async (req, res, next) => {
    try {
      const reqQuery = matchedData(req, { locations: ['query'] });
      const { order, where } = UserModel.dataTablesQuery(req);

      /** @type {import('sequelize').FindAndCountOptions} */
      const queryOptions = {
        where,
        order,
        paranoid: !reqQuery['in-trash'],
        limit: reqQuery['size'],
        offset: reqQuery['skip'],
      };
      const { count, rows } = await UserModel.findAndCountAll(queryOptions);
      const hasNext = queryOptions.offset + rows.length < count;

      // send response
      return res
        .setHeader('X-Total-Count', await UserModel.count({ paranoid: !reqQuery['in-trash'] }))
        .setHeader('X-Filtered-Count', count)
        .json({ data: rows, hasNext });
    } catch (error) {
      // send error
      return next(error);
    }
  },
);

/**
 * Create user
 */
app.post(
  '/',
  authMiddleware.rejectUnauthorized,
  authMiddleware.rejectNonAdmin,
  [userValidator.createNew],
  async (req, res, next) => {
    try {
      const reqBody = matchedData(req, { locations: ['body'], includeOptionals: true });
      const user = await UserModel.create({
        email: reqBody.email,
        username: reqBody.username,
        password: reqBody.password,
        isAdmin: reqBody.isAdmin,
        gender: reqBody.gender,
        fullName: reqBody.fullName,
      });

      // send response
      return res.status(201).json(_.omit(user.toJSON(), ['password']));
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * View profile
 */
app.get('/profile/:userId?', async (req, res, next) => {
  try {
    const user = await UserModel.findByPk(req.params.userId || req.userId);

    if (!user) {
      // send error : not found
      return next(httpErrors.NotFound('User not found'));
    }

    const fieldsToOmit = ['createdAt', 'updatedAt', 'deletedAt'];

    if (!req.user.isAdmin) {
      if (req.userId !== user.id) {
        fieldsToOmit.push('email');
      }
    }

    // send response
    return res.json(_.omit(user.toJSON(), fieldsToOmit));
  } catch (error) {
    return next(error);
  }
});

/**
 * Update profile
 */
app.put(
  '/profile/:userId?',
  authMiddleware.rejectUnauthorized,
  [userValidator.updateProfile],
  async (req, res, next) => {
    try {
      const user = await UserModel.findByPk(req.params.userId || req.user.id);
      const { fullName, gender } = matchedData(req, { locations: ['body'] });

      if (!user) {
        // send error : not found
        return next(httpErrors.NotFound('User not found'));
      }

      if (user.id !== req.userId && !req.user.isAdmin) {
        // send error : permission denied
        return next(httpErrors.Forbidden('Permission denied'));
      }

      await user.update({ fullName, gender });

      // send response
      return res.json(user);
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * Delete account
 */
app.delete(
  '/profile/:userId',
  authMiddleware.rejectUnauthorized,
  [commonValidator.dataQuery],
  async (req, res, next) => {
    try {
      const user = await UserModel.findByPk(req.params.userId, {
        paranoid: !req.query['in-trash'],
      });

      if (!user) {
        // send error : not found
        return next(httpErrors.NotFound('User not found'));
      }

      if (user.id === req.userId && req.user.isAdmin) {
        // send error : bad request
        return next(httpErrors.BadRequest('Unable to delete'));
      }

      if (user.id !== req.userId && !req.user.isAdmin) {
        // send error : forbidden
        return next(httpErrors.Forbidden("Oops! You don't have permission to do that"));
      }

      await user.destroy({ force: req.query['in-trash'] });

      // send response
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * Restore account
 */
app.patch(
  '/profile/:userId',
  authMiddleware.rejectUnauthorized,
  authMiddleware.rejectNonAdmin,
  async (req, res, next) => {
    try {
      const user = await UserModel.findByPk(req.params.userId, {
        paranoid: false,
      });

      if (!user) {
        // send error : not found
        return next(httpErrors.NotFound('User not found'));
      }

      await user.restore();

      // send response
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * Change or remove photo profile
 */
app.put(
  '/profile/:userId/photo',
  authMiddleware.rejectUnauthorized,
  storageMiddleware.diskStorage('user-photos').single('photo'),
  storageMiddleware.validateFileMimes(securityConfig.allowedImageMimeTypes),
  async (req, res, next) => {
    try {
      if (!req.file && !req.query.remove) {
        // send error : photo profile or remove is required
        return next(httpErrors.BadRequest('Profile photo is required'));
      }

      const user = await UserModel.findByPk(req.params.userId);

      if (!user) {
        // send error : not found
        return next(httpErrors.NotFound('User not found'));
      }

      if (user.id !== req.userId && !req.user.isAdmin) {
        // send error : permission denied
        return next(httpErrors.Forbidden('Permission denied'));
      }

      if (req.file) {
        await user.update({ photoProfile: req.file.path });
      }

      if (req.query.remove === 'true') {
        await user.update({ photo_profile: null });
      }

      if (req.file) {
        // send response
        return res.json({ photoProfile: req.file.path });
      }

      // send response
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  },
);

/**
 * Update user credentials
 */
app.put(
  '/credentials/:userId',
  authMiddleware.rejectUnauthorized,
  [userValidator.updateCredentials],
  async (req, res, next) => {
    try {
      const user = await UserModel.findByPk(req.params.userId);
      const { email, username, newPassword } = matchedData(req, {
        locations: ['body'],
      });

      if (!user) {
        // send error : not found
        return next(httpErrors.NotFound('User not found'));
      }

      if (user.id !== req.userId && !req.user.isAdmin) {
        // send error : permission denied
        return next(httpErrors.Forbidden('Permission denied'));
      }

      if (email && email !== user.email) {
        // todo : confirm new email address
      }

      await user.update({ email, username, password: newPassword });

      // send response
      return res.json({ success: true });
    } catch (error) {
      return next(error);
    }
  },
);

module.exports = app;
