const request = require('supertest');
const { faker } = require('@faker-js/faker');
const app = require('@exzly-routes');
const { createRoute } = require('@exzly-utils');

/**
 * Generate username
 *
 * @param {string} firstName
 * @param {string} lastName
 * @returns {string}
 */
const generateUsername = (firstName, lastName) => {
  let username = '';
  const regex = /^[a-zA-Z0-9](?!.*?[._]{2})[a-zA-Z0-9._]{0,28}[a-zA-Z0-9]$/u;

  do {
    const separator = faker.helpers.arrayElement(['.', '_']);
    const number = faker.helpers.arrayElement([null, faker.number.int({ min: 1, max: 99 })]);

    const cleanFirstName = firstName.replace(/[^a-zA-Z0-9]/g, '');
    const cleanLastName = lastName.replace(/[^a-zA-Z0-9]/g, '');

    username = `${cleanFirstName}${separator}${cleanLastName}`;

    if (number) {
      username = `${username}${number}`;
    }

    username = username.substring(0, 30).toLowerCase();
  } while (!regex.test(username));

  return username;
};

describe('RESTful-API: Authentication', () => {
  let accessToken, refreshToken;

  describe('Sign up test', () => {
    it('test 1: should return 400 when no data is sent', async () => {
      await request(app).post(createRoute('api', '/auth/sign-up')).expect(400);
    });

    it('test 2: should return 400 when username is already taken', async () => {
      const sexType = faker.person.sexType();
      const firstName = faker.person.firstName(sexType);
      const lastName = faker.person.lastName(sexType);
      const fullName = faker.person.fullName({
        firstName,
        lastName,
        sex: sexType,
      });
      const email = faker.internet.email({ firstName, lastName }).toLowerCase();

      await request(app)
        .post(createRoute('api', '/auth/sign-up'))
        .send({
          email,
          username: 'admin',
          password: 'password',
          fullName,
        })
        .expect(400);
    });

    it('test 3: should return 201 when valid registration data is provided', async () => {
      const sexType = faker.person.sexType();
      const firstName = faker.person.firstName(sexType);
      const lastName = faker.person.lastName(sexType);
      const fullName = faker.person.fullName({
        firstName,
        lastName,
        sex: sexType,
      });
      const email = faker.internet.email({ firstName, lastName }).toLowerCase();
      const username = generateUsername(firstName, lastName);

      const response = await request(app)
        .post(createRoute('api', '/auth/sign-up'))
        .send({
          email,
          username,
          password: 'password',
          fullName,
        })
        .expect(201);

      // Verify properties of the response
      expect(response.body).toHaveProperty('user');

      // Verify properties of the user object
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('isAdmin');
      expect(response.body.user).toHaveProperty('fullName');

      // Verify the value of isAdmin, it should be false on sign-up
      expect(response.body.user.isAdmin).toBe(false);
    });
  });

  describe('Sign in test', () => {
    it('test 1: should return 401 when password is incorrect', async () => {
      await request(app)
        .post(createRoute('api', '/auth/sign-in'))
        .send({ identity: 'admin', password: 'test' })
        .expect(401);
    });

    it('test 2: should return 401 when username does not exist', async () => {
      await request(app)
        .post(createRoute('api', '/auth/sign-in'))
        .send({ identity: 'test', password: 'admin' })
        .expect(401);
    });

    it('test 3: should return 200 when credentials are valid', async () => {
      const response = await request(app)
        .post(createRoute('api', '/auth/sign-in'))
        .send({ identity: 'admin', password: 'admin' })
        .expect(200);

      accessToken = response.body.accessToken;
      refreshToken = response.body.refreshToken;

      // Verify properties of the response
      expect(response.body).toHaveProperty('user');
      expect(response.body).toHaveProperty('accessToken');
      expect(response.body).toHaveProperty('refreshToken');

      // Verify properties of the user object
      expect(response.body.user).toHaveProperty('id');
      expect(response.body.user).toHaveProperty('email');
      expect(response.body.user).toHaveProperty('username');
      expect(response.body.user).toHaveProperty('isAdmin');
      expect(response.body.user).toHaveProperty('fullName');
    });
  });

  describe('Refresh token test', () => {
    it('test 1: should return 400 when no refresh token is sent', async () => {
      await request(app).post(createRoute('api', '/auth/refresh-token')).expect(400);
    });

    it('test 2: should return 400 when refresh token is invalid', async () => {
      await request(app)
        .post(createRoute('api', '/auth/refresh-token'))
        .send({ refreshToken: accessToken })
        .expect(400);
    });

    it('test 3: should return 200 when refresh token is valid', async () => {
      await request(app)
        .post(createRoute('api', '/auth/refresh-token'))
        .send({ refreshToken })
        .expect(200);
    });
  });

  describe('Forgot password test', () => {
    it('test 1: should return 404 when identity is unknown', async () => {
      await request(app)
        .post(createRoute('api', '/auth/forgot-password'))
        .send({ identity: 'unknown' })
        .expect(404);
    });

    it('test 2: should return 200 when identity is valid', async () => {
      await request(app)
        .post(createRoute('api', '/auth/forgot-password'))
        .send({ identity: 'admin' })
        .expect(200);
    });
  });

  describe('Sign out test', () => {
    it('test 1: should return 400 when no refresh token is sent', async () => {
      await request(app).post(createRoute('api', '/auth/sign-out')).expect(400);
    });

    it('test 2: should return 400 when refresh token is invalid', async () => {
      await request(app)
        .post(createRoute('api', '/auth/sign-out'))
        .send({ refreshToken: accessToken })
        .expect(400);
    });

    it('test 3: should return 401 when authorization header is not provided', async () => {
      await request(app)
        .post(createRoute('api', '/auth/sign-out'))
        .send({ refreshToken })
        .expect(401);
    });

    it('test 4: should return 200 when user is authenticated and refresh token is valid', async () => {
      await request(app)
        .post(createRoute('api', '/auth/sign-out'))
        .set('Authorization', `Bearer ${accessToken}`)
        .send({ refreshToken })
        .expect(200);
    });
  });
});
