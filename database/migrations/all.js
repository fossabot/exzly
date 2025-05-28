const fs = require('fs');
const path = require('path');

const migrationFilesForTables = fs
  .readdirSync(`${__dirname}/scripts`)
  .map((migrationModule) => {
    const migrationTables = fs.readdirSync(`${__dirname}/scripts/${migrationModule}`);
    if (migrationTables.indexOf('tables') !== -1) {
      return fs
        .readdirSync(`${__dirname}/scripts/${migrationModule}/tables`)
        .filter((file) => file.indexOf('.') !== 0 && file.slice(-3) === '.js')
        .map((migrationFile) => `${migrationModule}/${migrationFile}`);
    }
    return [];
  })
  .filter((migrationFiles) => migrationFiles.length > 0)
  .map((migrationFiles) => {
    return migrationFiles.flat().map((migrationFile) => {
      const [moduleName, fileName] = migrationFile.split('/');
      return require(path.join(__dirname, `/scripts/${moduleName}/tables`, fileName));
    });
  });

const migrationFilesForAssociations = fs
  .readdirSync(`${__dirname}/scripts`)
  .map((migrationModule) => {
    const migrationAssociations = fs.readdirSync(`${__dirname}/scripts/${migrationModule}`);
    if (migrationAssociations.indexOf('associations') !== -1) {
      return fs
        .readdirSync(`${__dirname}/scripts/${migrationModule}/associations`)
        .filter((file) => file.indexOf('.') !== 0 && file.slice(-3) === '.js')
        .map((migrationFile) => `${migrationModule}/${migrationFile}`);
    }
    return [];
  })
  .filter((migrationFiles) => migrationFiles.length > 0)
  .map((migrationFiles) => {
    return migrationFiles.flat().map((migrationFile) => {
      const [moduleName, fileName] = migrationFile.split('/');
      return require(path.join(__dirname, `/scripts/${moduleName}/associations`, fileName));
    });
  });

/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    // tables
    await Promise.all(
      migrationFilesForTables.flat().map((migration) => migration.up(queryInterface, Sequelize)),
    );
    // associations
    await Promise.all(
      migrationFilesForAssociations
        .flat()
        .map((migration) => migration.up(queryInterface, Sequelize)),
    );
  },
  async down(queryInterface, Sequelize) {
    // associations
    await Promise.all(
      migrationFilesForAssociations
        .flat()
        .map((migration) => migration.down(queryInterface, Sequelize)),
    );
    // tables
    await Promise.all(
      migrationFilesForTables.flat().map((migration) => migration.down(queryInterface, Sequelize)),
    );
  },
};
