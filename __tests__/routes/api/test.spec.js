const fs = require('fs');
const path = require('path');
const request = require('supertest');
const { jwtHelper } = require('@exzly-helpers');
const app = require('@exzly-routes');
const { createRoute } = require('@exzly-utils');

const usersToken = {
  adminAccessToken: '',
  adminRefreshToken: '',
  memberAccessToken: '',
  memberRefreshToken: '',
};

const loadSample = (fileName) => path.join(process.cwd(), '__tests__/samples', fileName);

beforeAll(async () => {
  const adminSignIn = await request(app)
    .post(createRoute('api', '/auth/sign-in'))
    .send({ identity: 'admin', password: 'admin' })
    .expect(200);

  // Set authorization token
  usersToken.adminAccessToken = adminSignIn.body.accessToken;
  usersToken.adminRefreshToken = adminSignIn.body.refreshToken;

  const memberSignIn = await request(app)
    .post(createRoute('api', '/auth/sign-in'))
    .send({ identity: 'member', password: 'member' })
    .expect(200);

  // Set authorization token
  usersToken.memberAccessToken = memberSignIn.body.accessToken;
  usersToken.memberRefreshToken = memberSignIn.body.refreshToken;
});

describe('RESTful-API: Test', () => {
  let uploadedDiskStorage;

  describe('Upload file', () => {
    describe('Memory storage', () => {
      it('test 1: should successfully upload a file (single memory storage)', async () => {
        const sample = fs.createReadStream(loadSample('exzly-test-100x100.png'));
        const response = await request(app)
          .post(createRoute('api', '/test/single-memory-storage'))
          .attach('photo', sample, 'exzly-test-100x100.png')
          .expect(200);

        expect(response.body).toHaveProperty('fieldname', 'photo');
        expect(response.body).toHaveProperty('originalname');
        expect(response.body).toHaveProperty('mimetype', 'image/png');
        expect(response.body).toHaveProperty('size');
        expect(response.body).toHaveProperty('ext', 'png');
      });

      it('test 2: should successfully upload multiple files (array memory storage)', async () => {
        const sample1 = fs.createReadStream(loadSample('exzly-test-100x100.png'));
        const sample2 = fs.createReadStream(loadSample('exzly-test-200x200.png'));
        const response = await request(app)
          .post(createRoute('api', '/test/array-memory-storage'))
          .attach('photos', sample1, 'exzly-test-100x100.png')
          .attach('photos', sample2, 'exzly-test-200x200.png')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);

        response.body.forEach((file) => {
          expect(file).toHaveProperty('fieldname', 'photos');
          expect(file).toHaveProperty('originalname');
          expect(file).toHaveProperty('mimetype');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('ext');
        });
      });

      it('test 3: should upload a single file to memory and save it to a dynamically generated disk path', async () => {
        const sample = fs.createReadStream(loadSample('exzly-test-100x100.png'));
        const response = await request(app)
          .post(createRoute('api', '/test/dynamic-path-memory-storage'))
          .attach('photo', sample, 'exzly-test-100x100.png')
          .expect(200);

        expect(response.body).toHaveProperty('fieldname', 'photo');
        expect(response.body).toHaveProperty('originalname');
        expect(response.body).toHaveProperty('mimetype', 'image/png');
        expect(response.body).toHaveProperty('size');
        expect(response.body).toHaveProperty('ext', 'png');
      });
    });

    describe('Disk storage', () => {
      it('test 1: should successfully upload a file', async () => {
        const sample = fs.createReadStream(loadSample('exzly-test-100x100.png'));
        const response = await request(app)
          .post(createRoute('api', '/test/single-disk-storage'))
          .attach('photo', sample, 'exzly-test-100x100.png')
          .expect(200);

        expect(response.body).toHaveProperty('fieldname', 'photo');
        expect(response.body).toHaveProperty('originalname');
        expect(response.body).toHaveProperty('encoding');
        expect(response.body).toHaveProperty('mimetype', 'image/png');
        expect(response.body).toHaveProperty('destination');
        expect(response.body).toHaveProperty('filename');
        expect(response.body).toHaveProperty('path');
        expect(response.body).toHaveProperty('size');
        expect(response.body).toHaveProperty('ext', 'png');

        uploadedDiskStorage = response.body.filename;
      });

      it('test 2: should successfully upload multiple files (array disk storage)', async () => {
        const sample1 = fs.createReadStream(loadSample('exzly-test-100x100.png'));
        const sample2 = fs.createReadStream(loadSample('exzly-test-200x200.png'));
        const response = await request(app)
          .post(createRoute('api', '/test/array-disk-storage'))
          .attach('photos', sample1, 'exzly-test-100x100.png')
          .attach('photos', sample2, 'exzly-test-200x200.png')
          .expect(200);

        expect(Array.isArray(response.body)).toBe(true);
        expect(response.body.length).toBe(2);

        response.body.forEach((file) => {
          expect(file).toHaveProperty('fieldname', 'photos');
          expect(file).toHaveProperty('originalname');
          expect(file).toHaveProperty('encoding');
          expect(file).toHaveProperty('mimetype');
          expect(file).toHaveProperty('destination');
          expect(file).toHaveProperty('filename');
          expect(file).toHaveProperty('path');
          expect(file).toHaveProperty('size');
          expect(file).toHaveProperty('ext');
        });
      });

      it('test 3: should successfully upload a single file with dynamic disk storage path', async () => {
        const sample = loadSample('exzly-test-100x100.png');
        const file = fs.createReadStream(sample);

        const response = await request(app)
          .post(createRoute('api', '/test/dynamic-path-disk-storage'))
          .attach('photo', file, 'exzly-test-100x100.png')
          .expect(200);

        expect(response.body).toHaveProperty('fieldname', 'photo');
        expect(response.body).toHaveProperty('originalname');
        expect(response.body).toHaveProperty('mimetype', 'image/png');
        expect(response.body).toHaveProperty('size');
        expect(response.body).toHaveProperty('ext', 'png');
      });

      it('test 4: should return 400 when uploading an invalid file type (single upload)', async () => {
        const sample = fs.createReadStream(loadSample('file.txt'));
        await request(app)
          .post(createRoute('api', '/test/single-disk-storage'))
          .attach('photo', sample, 'file.txt')
          .expect(400);
      });

      it('test 5: should return 207 when uploading multiple files including some invalid ones', async () => {
        const sample1 = fs.createReadStream(loadSample('exzly-test-100x100.png'));
        const sample2 = fs.createReadStream(loadSample('exzly-test-200x200.png'));
        const sample3 = fs.createReadStream(loadSample('file.txt'));
        const sample4 = fs.createReadStream(loadSample('file.txt'));

        await request(app)
          .post(createRoute('api', '/test/array-disk-storage'))
          .attach('photos', sample1, 'exzly-test-100x100.png')
          .attach('photos', sample3, 'file.txt')
          .attach('photos', sample2, 'exzly-test-200x200.png')
          .attach('photos', sample4, 'file.txt')
          .expect(207);
      });
    });
  });

  describe('File preview & Image resize', () => {
    it('test 1: should successfully upload a file exist', async () => {
      await request(app)
        .get(createRoute('web', `/storage/${uploadedDiskStorage}`))
        .expect(200);
    });

    it('test 2: should return 200 and resize image when valid width and height parameters are provided', async () => {
      await request(app)
        .get(createRoute('web', `/storage/${uploadedDiskStorage}`))
        .query({ height: 200, width: 200 })
        .expect(200);
    });

    it('test 3: should return 200 when resized image is requested', async () => {
      await request(app)
        .get(createRoute('web', `/storage/${uploadedDiskStorage}`))
        .query({ height: 200, width: 200 })
        .expect(200);
    });

    it('test 4: should return 404 when the image does not exist', async () => {
      await request(app)
        .get(createRoute('web', '/storage/not-exist.png'))
        .query({ height: 200, width: 200 })
        .expect(404);
    });
  });

  describe('Access token', () => {
    it('test 1: should return 401 when an invalid access token is provided', async () => {
      await request(app)
        .get(createRoute('api', '/test/access-token'))
        .set('Authorization', 'unknown token')
        .expect(401);
    });

    it('test 2: should return 401 when an invalid token type is provided', async () => {
      await request(app)
        .get(createRoute('api', '/test/access-token'))
        .set('Authorization', `Bearer ${usersToken.adminRefreshToken}`)
        .expect(401);
    });

    it('test 3: should return 401 when no user id is present in the payload', async () => {
      await request(app)
        .get(createRoute('api', '/test/access-token'))
        .set('Authorization', `Bearer ${jwtHelper.createPasswordResetToken(1337)}`)
        .expect(401);
    });

    it('test 4: should return 401 when valid token does not exist in the database', async () => {
      await request(app)
        .get(createRoute('api', '/test/access-token'))
        .set('Authorization', `Bearer ${jwtHelper.createUserToken('access-token', 99999)}`)
        .expect(401);
    });

    it('test 5: should return 200 when valid token is provided', async () => {
      await request(app)
        .get(createRoute('api', '/test/access-token'))
        .set('Authorization', `Bearer ${usersToken.adminAccessToken}`)
        .expect(200);
    });

    it('test 6: should return 200 when sign out request is made to revoke the token', async () => {
      await request(app)
        .post(createRoute('api', '/auth/sign-out'))
        .send({ refreshToken: usersToken.memberRefreshToken })
        .set('Authorization', `Bearer ${usersToken.memberAccessToken}`)
        .expect(200);
    });

    it('test 7: should return 401 when using a revoked token', async () => {
      await request(app)
        .get(createRoute('api', '/test/access-token'))
        .set('Authorization', `Bearer ${usersToken.memberAccessToken}`)
        .expect(401);
    });
  });
});
