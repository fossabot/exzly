const request = require('supertest');
const app = require('@exzly-routes');
const { createRoute } = require('@exzly-utils');

let adminAuthCookie, memberAuthCookie;

beforeAll(async () => {
  const signInAsAdmin = await request(app)
    .post(createRoute('api', '/auth/sign-in'))
    .send({ identity: 'admin', password: 'admin' });

  const signInAsMember = await request(app)
    .post(createRoute('api', '/auth/sign-in'))
    .send({ identity: 'member', password: 'member' });

  adminAuthCookie = signInAsAdmin.headers['set-cookie'];
  memberAuthCookie = signInAsMember.headers['set-cookie'];
});

describe('Web Routes', () => {
  describe('Authentication page', () => {
    it('test 1: should return 200 when accessing home page', async () => {
      await request(app).get(createRoute('web')).expect(200);
    });

    it('test 2: should return 200 when accessing sign-up page', async () => {
      await request(app).get(createRoute('web', 'sign-up')).expect(200);
    });

    it('test 3: should return 200 when accessing sign-in page', async () => {
      await request(app).get(createRoute('web', 'sign-in')).expect(200);
    });

    it('test 4: should return 200 when accessing forgot-password page', async () => {
      await request(app).get(createRoute('web', 'forgot-password')).expect(200);
    });
  });

  describe('Authenticated pages', () => {
    it('test 1: should return 200 when member accesses account overview page', async () => {
      await request(app)
        .get(createRoute('web', 'account'))
        .set('Cookie', memberAuthCookie)
        .expect(200);
    });

    it('test 2: should return 200 when member accesses account settings page', async () => {
      await request(app)
        .get(createRoute('web', 'account/setting'))
        .set('Cookie', memberAuthCookie)
        .expect(200);
    });
  });

  describe('Error and redirect pages', () => {
    it('test 1: should return 404 when accessing unknown route', async () => {
      await request(app).get(createRoute('web', 'unknown')).expect(404);
    });

    it('test 2: should return 404 when accessing reset-password page without session', async () => {
      await request(app).get(createRoute('web', 'reset-password')).expect(404);
    });

    it('test 3: should redirect to sign-in when accessing account overview without session', async () => {
      const response = await request(app).get(createRoute('web', 'account')).expect(302);
      expect(response.header.location).toBe(createRoute('web', 'sign-in'));
    });

    it('test 4: should redirect to sign-in when accessing account setting without session', async () => {
      const response = await request(app).get(createRoute('web', 'account/setting')).expect(302);
      expect(response.header.location).toBe(createRoute('web', 'sign-in'));
    });

    it('test 5: should redirect to home page when accessing sign-in with active session', async () => {
      const response = await request(app)
        .get(createRoute('web', 'sign-in'))
        .set('Cookie', adminAuthCookie)
        .expect(302);
      expect(response.header.location).toBe(createRoute('web'));
    });

    it('test 6: should redirect to home page after signing out with active session', async () => {
      const response = await request(app)
        .get(createRoute('web', 'sign-out'))
        .set('Cookie', adminAuthCookie)
        .expect(302);
      expect(response.header.location).toBe(createRoute('web'));
    });
  });
});
