module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "contracts",
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
        allowNull: false,
      },
      name: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      type: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      value: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      chain_id: {
        type: DataTypes.STRING(65),
        allowNull: false,
      },
      chain_name: {
        type: DataTypes.STRING(45),
        allowNull: false,
      },
      owner: {
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
      tableName: "contracts",
    }
  );
};
