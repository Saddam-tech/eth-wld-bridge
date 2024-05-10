const jwt = require("jsonwebtoken");
const SECRET = process.env.JWT_SECRET;

function generateAccessToken() {
  const payload = { id: process.env.SERVER_ID, role: "slave" };
  jwt.sign(payload, SECRET, { expiresIn: process.env.TOKEN_EXPIRY });
}

module.exports = { generateAccessToken };
