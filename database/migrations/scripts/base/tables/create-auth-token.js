/** @type {import('sequelize-cli').Migration} */
module.exports = {
  async up(queryInterface, Sequelize) {
    await queryInterface.createTable(
      'auth_token',
      {
        id: {
          allowNull: false,
          primaryKey: true,
          autoIncrement: true,
          type: Sequelize.INTEGER,
        },
        type: {
          type: Sequelize.ENUM('access-token', 'refresh-token'),
          allowNull: false,
        },
        token: {
          type: Sequelize.TEXT,
          allowNull: false,
        },
        is_revoked: {
          type: Sequelize.BOOLEAN,
          allowNull: false,
          defaultValue: false,
        },
        created_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
        updated_at: {
          allowNull: false,
          type: Sequelize.DATE,
        },
      },
      {
        charset: 'utf8mb4',
        collate: 'utf8mb4_unicode_ci',
      },
    );
  },
  async down(queryInterface) {
    if (await queryInterface.tableExists('auth_token')) {
      await queryInterface.dropTable('auth_token');
    }
  },
};
