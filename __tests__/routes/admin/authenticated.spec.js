const request = require('supertest');
const app = require('@exzly-routes');
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

describe('Admin Routes (Authenticated as Administrator)', () => {
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

  it('test 4: should return 200 when accessing profile page of existing user', async () => {
    await request(app)
      .get(createRoute('admin', '/users/profile/2'))
      .set('Cookie', authCookieAdmin)
      .expect(200);
  });

  it('test 5: should return 404 when accessing profile page of non-existent user', async () => {
    await request(app)
      .get(createRoute('admin', '/users/profile/0'))
      .set('Cookie', authCookieAdmin)
      .expect(404);
  });

  it('test 6: should return 200 when accessing edit page of existing user profile', async () => {
    await request(app)
      .get(createRoute('admin', '/users/profile/2/edit'))
      .set('Cookie', authCookieAdmin)
      .expect(200);
  });

  it('test 7: should return 404 when accessing a non-existent admin page', async () => {
    await request(app)
      .get(createRoute('admin', '/unknown'))
      .set('Cookie', authCookieAdmin)
      .expect(404);
  });

  it(`test 8: should redirect to admin dashboard if admin user visits ${createRoute('admin', '/sign-in')} route`, async () => {
    const response = await request(app)
      .get(createRoute('admin', '/sign-in'))
      .set('Cookie', authCookieAdmin)
      .expect(302);
    expect(response.header.location).toBe(createRoute('admin'));
  });

  it('test 9: should return 200 when accessing account page', async () => {
    await request(app)
      .get(createRoute('admin', '/account'))
      .set('Cookie', authCookieAdmin)
      .expect(200);
  });

  it('test 10: should return 200 when accessing account settings page', async () => {
    await request(app)
      .get(createRoute('admin', '/account/setting'))
      .set('Cookie', authCookieAdmin)
      .expect(200);
  });
});

describe('Admin Routes (Authenticated as Member)', () => {
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
