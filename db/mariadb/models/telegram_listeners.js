module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "telegram_listeners",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER(11).UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: true,
        defaultValue: sequelize.fn("current_timestamp"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      chat_id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      username: {
        type: DataTypes.STRING(65),
        allowNull: true,
      },
      firstname: {
        type: DataTypes.STRING(65),
        allowNull: true,
      },
      lastname: {
        type: DataTypes.STRING(65),
        allowNull: true,
      },
      active: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "telegram_listeners",
    }
  );
};
