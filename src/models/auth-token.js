const { Model } = require('sequelize');

/**
 * @param {import('sequelize').Sequelize} sequelize
 * @param {import('sequelize').DataTypes} DataTypes
 */
module.exports = (sequelize, DataTypes) => {
  class AuthTokenModel extends Model {}

  AuthTokenModel.init(
    {
      type: {
        type: DataTypes.ENUM('access-token', 'refresh-token'),
        allowNull: false,
      },
      token: {
        type: DataTypes.TEXT,
        allowNull: false,
      },
      isRevoked: {
        type: DataTypes.BOOLEAN,
        allowNull: false,
        defaultValue: false,
      },
    },
    {
      sequelize,
      modelName: 'AuthTokenModel',
      tableName: 'auth_token',
    },
  );

  return AuthTokenModel;
};
