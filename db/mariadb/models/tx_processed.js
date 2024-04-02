module.exports = function (sequelize, DataTypes) {
  return sequelize.define(
    "tx_processed",
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
      from_address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      to_address: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      amount: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      token: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      timestamp: {
        type: DataTypes.STRING(255),
        allowNull: true,
      },
      nonce: {
        type: DataTypes.STRING(100),
        allowNull: false,
      },
      processed: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      from_chain: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      to_chain: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      from_chain_id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      to_chain_id: {
        type: DataTypes.INTEGER(11),
        allowNull: false,
      },
      function_type: {
        type: DataTypes.STRING(30),
        allowNull: false,
      },
      tx_hash_c1: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
      tx_hash_c2: {
        type: DataTypes.STRING(255),
        allowNull: false,
      },
    },
    {
      sequelize,
      tableName: "tx_processed",
    }
  );
};
