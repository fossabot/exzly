const request = require('supertest');
const app = require('@exzly-routes');
const { createRoute } = require('@exzly-utils');

describe('Admin Routes (Unauthenticated)', () => {
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
