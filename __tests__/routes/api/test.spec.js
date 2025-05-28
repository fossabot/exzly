const fs = require('fs');
const path = require('path');
const request = require('supertest');
const app = require('@exzly-routes');
const { createRoute } = require('@exzly-utils');

describe('RESTful-API: Test', () => {
  let uploadedDiskStorage;

  describe('Upload file', () => {
    describe('Memory storage', () => {
      it('test 1: should successfully upload a file (single memory storage)', async () => {
        const filePath = path.join(__dirname, '100x100.png');
        const file = fs.createReadStream(filePath);

        const response = await request(app)
          .post(createRoute('api', '/test/single-memory-storage'))
          .attach('photo', file, '100x100.png')
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
        const filePath = path.join(__dirname, '100x100.png');
        const file = fs.createReadStream(filePath);

        const response = await request(app)
          .post(createRoute('api', '/test/single-disk-storage'))
          .attach('photo', file, '100x100.png')
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

      it('test 2: should successfully upload a file exist', async () => {
        await request(app)
          .get(createRoute('web', `/storage/${uploadedDiskStorage}`))
          .expect(200);
      });
    });
  });
});
