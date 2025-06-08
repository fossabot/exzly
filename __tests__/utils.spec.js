const { createURL, randomInt } = require('@exzly-utils');

describe('Utils', () => {
  describe('createURL', () => {
    const req = {
      protocol: 'https',
      get: jest.fn().mockReturnValue('example.com'),
    };

    beforeEach(() => {
      process.env.WEB_ROUTE = '/web';
      process.env.API_ROUTE = '/api';
      process.env.ADMIN_ROUTE = '/admin';
    });

    it('should generate correct web URL', () => {
      const url = createURL(req, 'web', '/dashboard');
      expect(url).toBe('https:/example.com/web/dashboard');
    });

    it('should generate correct api URL', () => {
      const url = createURL(req, 'api', '/users');
      expect(url).toBe('https:/example.com/api/users');
    });

    it('should generate correct admin URL', () => {
      const url = createURL(req, 'admin', '/panel');
      expect(url).toBe('https:/example.com/admin/panel');
    });

    it('should return base URL if unknown name is passed', () => {
      const url = createURL(req, 'unknown');
      expect(url).toBe('https:/example.com');
    });
  });

  describe('randomInt', () => {
    it('should return a random number between min and max when length is false', () => {
      const value = randomInt(5, 15);
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(5);
      expect(value).toBeLessThanOrEqual(15);
    });

    it('should return a string of digits when length is given', () => {
      const code = randomInt(5, 10, 6);
      expect(typeof code).toBe('string');
      expect(code).toHaveLength(6);
      expect(/^\d+$/.test(code)).toBe(true);
    });

    it('should default to min=1 and max=10 when not specified', () => {
      const value = randomInt();
      expect(typeof value).toBe('number');
      expect(value).toBeGreaterThanOrEqual(1);
      expect(value).toBeLessThanOrEqual(10);
    });
  });
});
