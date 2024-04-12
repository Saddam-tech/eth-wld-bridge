module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "fee_archive",
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
      chain_id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      fee_rate: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      gasPrice: {
        type: DataTypes.STRING(155),
        allowNull: false,
      },
      networkFee: {
        type: DataTypes.STRING(155),
        allowNull: false,
      },
      contractUnitCount: {
        type: DataTypes.STRING(60),
        allowNull: false,
      },
      signer: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      contract_address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "fee_archive",
    }
  );
};
