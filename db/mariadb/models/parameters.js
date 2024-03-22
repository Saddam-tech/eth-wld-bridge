module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "parameters",
    {
      id: {
        autoIncrement: true,
        type: DataTypes.INTEGER(11).UNSIGNED,
        allowNull: false,
        primaryKey: true,
      },
      created_at: {
        type: DataTypes.DATE,
        allowNull: false,
        defaultValue: sequelize.fn("current_timestamp"),
      },
      updated_at: {
        type: DataTypes.DATE,
        allowNull: true,
      },
      name: {
        type: DataTypes.STRING(155),
        allowNull: false,
      },
      value: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      active: {
        type: DataTypes.INTEGER(11).UNSIGNED,
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "parameters",
    }
  );
};
