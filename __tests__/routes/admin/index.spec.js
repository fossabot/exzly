const request = require('supertest');
const createHttpError = require('http-errors');
const app = require('@exzly-routes');
const adminErrorHandler = require('@exzly-routes/admin/error');
const { createRoute } = require('@exzly-utils');

let authCookieAdmin, authCookieMember;

beforeAll(async () => {
  const signInAsAdmin = await request(app)
    .post(createRoute('api', '/auth/sign-in'))
    .send({ identity: 'admin', password: 'admin' })
    .expect(200);

  const signInAsMember = await request(app)
    .post(createRoute('api', '/auth/sign-in'))
    .send({ identity: 'member', password: 'member' })
    .expect(200);

  authCookieAdmin = signInAsAdmin.headers['set-cookie'];
  authCookieMember = signInAsMember.headers['set-cookie'];
});

describe('Admin Routes', () => {
  describe('Unauthenticated', () => {
    it(`test 1: should redirect to ${createRoute('admin', '/sign-in')} when accessing admin root without session`, async () => {
      const response = await request(app).get(createRoute('admin')).expect(302);
      expect(response.header.location).toBe(createRoute('admin', '/sign-in'));
    });

    it('test 2: should return 200 for admin sign-in page', async () => {
      await request(app).get(createRoute('admin', '/sign-in')).expect(200);
    });

    it('test 3: should return 200 for admin forgot-password page', async () => {
      await request(app).get(createRoute('admin', '/forgot-password')).expect(200);
    });
  });

  describe('Authenticated as Administrator', () => {
    it('test 1: should return 200 for admin dashboard', async () => {
      await request(app).get(createRoute('admin')).set('Cookie', authCookieAdmin).expect(200);
    });

    it('test 2: should return 200 for user management page (display users data)', async () => {
      await request(app)
        .get(createRoute('admin', '/users'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 3: should return 200 for user management page (display deleted users data)', async () => {
      await request(app)
        .get(createRoute('admin', '/users?in-trash=true'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 4: should return 200 when accessing the add new user page', async () => {
      await request(app)
        .get(createRoute('admin', '/users/add-new'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 5: should return 200 when accessing profile page of existing user', async () => {
      await request(app)
        .get(createRoute('admin', '/users/profile/2'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 6: should return 404 when accessing profile page of non-existent user', async () => {
      await request(app)
        .get(createRoute('admin', '/users/profile/0'))
        .set('Cookie', authCookieAdmin)
        .expect(404);
    });

    it('test 7: should return 200 when accessing edit page of existing user profile', async () => {
      await request(app)
        .get(createRoute('admin', '/users/profile/2/edit'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 8: should return 404 when trying to access edit page of a non-existent user', async () => {
      await request(app)
        .get(createRoute('admin', '/users/profile/0/edit'))
        .set('Cookie', authCookieAdmin)
        .expect(404);
    });

    it('test 9: should return 404 when accessing a non-existent admin page', async () => {
      await request(app)
        .get(createRoute('admin', '/unknown'))
        .set('Cookie', authCookieAdmin)
        .expect(404);
    });

    it(`test 10: should redirect to admin dashboard if admin user visits ${createRoute('admin', '/sign-in')} route`, async () => {
      const response = await request(app)
        .get(createRoute('admin', '/sign-in'))
        .set('Cookie', authCookieAdmin)
        .expect(302);
      expect(response.header.location).toBe(createRoute('admin'));
    });

    it('test 11: should return 200 when accessing account page', async () => {
      await request(app)
        .get(createRoute('admin', '/account'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 12: should return 200 when accessing account settings page', async () => {
      await request(app)
        .get(createRoute('admin', '/account/setting'))
        .set('Cookie', authCookieAdmin)
        .expect(200);
    });

    it('test 13: should redirect to sign-in page after successful logout', async () => {
      const response = await request(app)
        .get(createRoute('admin', '/sign-out'))
        .set('Cookie', authCookieAdmin)
        .expect(302);
      expect(response.header.location).toBe(createRoute('admin', '/sign-in'));
    });
  });

  describe('Authenticated as Member', () => {
    it('test 1: should redirect member user accessing admin route to the web homepage', async () => {
      const response = await request(app)
        .get(createRoute('admin'))
        .set('Cookie', authCookieMember)
        .expect(302);
      expect(response.header.location).toBe(createRoute('web'));
    });

    it(`test 2: should redirect member user accessing ${createRoute('admin', '/sign-in')} route to the web homepage`, async () => {
      const response = await request(app)
        .get(createRoute('admin', '/sign-in'))
        .set('Cookie', authCookieMember)
        .expect(302);
      expect(response.header.location).toBe(createRoute('web'));
    });
  });

  describe('Error pages', () => {
    it(`test 1: should redirect to ${createRoute('web')} when accessing admin error page without session`, async () => {
      const response = await request(app).get(createRoute('admin', '/sign-inx')).expect(302);
      expect(response.header.location).toBe(createRoute('web'));
    });

    it('test 2: should handle generic error (500)', () => {
      const err = createHttpError(500);
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      };
      const next = jest.fn();

      adminErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('admin/errors/default.njk', {
        error: err,
        statusCode: 500,
      });
    });

    it('test 3: should render error page with status 500 if headers have not been sent', () => {
      const err = new Error('Test error');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: false,
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      };
      const next = jest.fn();

      adminErrorHandler(err, req, res, next);
      expect(res.status).toHaveBeenCalledWith(500);
      expect(res.render).toHaveBeenCalledWith('admin/errors/default.njk', {
        error: err,
        statusCode: 500,
      });
    });

    it('test 4: should call next when headers already sent', () => {
      const err = new Error('Test error');
      const req = { user: { id: 1 } };
      const res = {
        headersSent: true,
        status: jest.fn().mockReturnThis(),
        render: jest.fn(),
      };
      const next = jest.fn();

      adminErrorHandler(err, req, res, next);
      expect(next).toHaveBeenCalledWith(err);
      expect(res.status).not.toHaveBeenCalled();
      expect(res.render).not.toHaveBeenCalled();
    });
  });
});
