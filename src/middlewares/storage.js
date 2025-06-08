/**
 * @typedef {import('express').Request} Request
 * @typedef {import('express').Response} Response
 * @typedef {import('express').NextFunction} NextFunction
 * @typedef {(req: Request, res: Response, next: NextFunction) => void} ExpressMiddleware
 */

const fs = require('fs');
const path = require('path');
const mime = require('mime');
const uuid = require('uuid');
const multer = require('multer');
const httpErrors = require('http-errors');

/**
 * Memory storage
 *
 * @returns {multer.Multer}
 */
const memoryStorage = multer({ storage: multer.memoryStorage() });

/**
 * Disk storage
 *
 * @param {string} destination
 * @param {string} fileName
 * @returns {multer.Multer}
 */
const diskStorage = (destination = '/', fileName) => {
  let cleanDestination = path.posix.normalize(destination);

  if (!cleanDestination.startsWith('/')) {
    cleanDestination = '/' + cleanDestination;
  }

  if (cleanDestination.length > 1 && cleanDestination.endsWith('/')) {
    cleanDestination = cleanDestination.slice(0, -1);
  }

  return multer({
    storage: multer.diskStorage({
      destination: (req, file, cb) => {
        const target = path.join(process.env.STORAGE_PATH, destination);

        if (!fs.existsSync(target)) {
          fs.mkdirSync(target, { recursive: true });
        }

        cb(null, target);
      },
      filename: (req, file, cb) => {
        const ext = mime.getExtension(file.mimetype);
        const name = typeof fileName !== 'undefined' ? fileName : uuid.v4();

        cb(null, `${name}.${ext}`);
      },
    }),
  });
};

/**
 * Save to disk
 *
 * @param {string} destination
 * @returns {ExpressMiddleware}
 */
const saveToDisk = (destination = '/') => {
  return async (req, res, next) => {
    let cleanDestination = path.posix.normalize(destination);

    if (!cleanDestination.startsWith('/')) {
      cleanDestination = '/' + cleanDestination;
    }

    if (cleanDestination.length > 1 && cleanDestination.endsWith('/')) {
      cleanDestination = cleanDestination.slice(0, -1);
    }

    const target = path.join(process.env.STORAGE_PATH, cleanDestination);

    if (!fs.existsSync(target)) {
      fs.mkdirSync(target, { recursive: true });
    }

    if (req.files) {
      const fileSavePromises = req.files.map(async (file, index) => {
        const filename = `${uuid.v4()}.${file.ext}`;
        const newFilePath = path.join(target, filename);

        await fs.promises.writeFile(newFilePath, file.buffer);
        req.files[index].path = newFilePath.replace(/\\/g, '/');
      });

      await Promise.all(fileSavePromises);
    } else if (req.file) {
      const filename = `${uuid.v4()}.${req.file.ext}`;
      const newFile = `${target}/${filename}`;

      await fs.promises.writeFile(newFile, req.file.buffer);
      req.file.path = '/' + newFile.replace(/\\/g, '/');
    }

    return next();
  };
};

/**
 * Validate file mime
 *
 * @param {Express.Multer.File} file
 * @param {string[]} allowedMimes
 * @returns {Promise<boolean>}
 */
const validateFileMime = async (file, allowedMimes) => {
  const { fileTypeFromBuffer, fileTypeFromFile } = await import('file-type');
  let fileType;

  if (file.buffer) {
    fileType = await fileTypeFromBuffer(file.buffer);
  } else if (file.path) {
    fileType = await fileTypeFromFile(file.path);
  }

  if (!fileType || !allowedMimes.includes(fileType.mime)) {
    if (file.path) {
      fs.rmSync(file.path);
    }

    return false;
  }

  file.ext = fileType.ext;

  if (file.path) {
    file.path = '/' + file.path.replace(/\\/g, '/');
  }

  return true;
};

/**
 * Validate file mimes
 *
 * @param {string[]} allowedMimes
 * @returns {ExpressMiddleware}
 */
const validateFileMimes = (allowedMimes = []) => {
  return async (req, res, next) => {
    if (req.file) {
      const isValid = await validateFileMime(req.file, allowedMimes);

      if (!isValid) {
        return next(httpErrors.BadRequest('Invalid file mime'));
      }
    }

    if (req.files) {
      const fileValidations = req.files.map((file) => validateFileMime(file, allowedMimes));
      const validatedFiles = await Promise.all(fileValidations);

      validatedFiles.map((isValid, i) => {
        if (!isValid) {
          req.files[i] = {
            message: 'Invalid file mime',
          };
        }
      });
    }

    return next();
  };
};

module.exports = { memoryStorage, diskStorage, saveToDisk, validateFileMimes };
