const request = require('supertest');
const createHttpError = require('http-errors');
const { MulterError } = require('multer');
const { BaseError } = require('sequelize');
const app = require('@exzly-routes');
const apiErrorHandler = require('@exzly-routes/api/error');
const { createRoute } = require('@exzly-utils');

describe('RESTful-API', () => {
  describe('Common system and Configuration', () => {
    it('should return 200 and provide version and timezone info', async () => {
      const response = await request(app).get(createRoute('api')).expect(200);
      expect(response.body).toHaveProperty('version');
      expect(response.body).toHaveProperty('timezone');
    });
  });

  describe('Error handler', () => {
    it('test 1: should handle generic HTTP error (500)', () => {
      const err = createHttpError(500);
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: err.message }));
    });

    it('test 2: should handle generic Error instance', () => {
      const err = new Error('Generic error');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(expect.objectContaining({ message: err.message }));
    });

    it('test 3: should call next when headers already sent', () => {
      const err = new Error('Already sent');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
    });

    it('test 4: should handle MulterError', () => {
      const err = new MulterError('LIMIT_UNEXPECTED_FILE');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Unexpected file',
        }),
      );
    });

    it('test 5: should handle Sequelize BaseError in production', () => {
      process.env.NODE_ENV = 'production';

      const err = new BaseError('Database down');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: 'Database error',
        }),
      );

      process.env.NODE_ENV = 'test';
    });

    it('test 6: should fallback to parent.message if err.message is undefined', () => {
      const err = new BaseError();
      err.message = undefined;
      err.parent = { message: 'Detailed DB error' };

      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: expect.stringContaining('Detailed DB error'),
        }),
      );
    });

    it('test 7: should detect invalid JSON body (syntax error)', () => {
      const err = createHttpError(400, 'Unexpected token x in JSON at position 10');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        json: jest.fn(),
      };
      const next = jest.fn();

      apiErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(400);
      expect(res.json).toHaveBeenCalledWith(
        expect.objectContaining({
          message: err.message,
        }),
      );
    });
  });
});
