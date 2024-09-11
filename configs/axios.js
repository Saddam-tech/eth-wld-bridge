const axios = require("axios");

const baseURL = process.env.API_SERVER;

const provider = axios.create({ baseURL });

async function makeAPICall(token, param, payload) {
  try {
    axios.defaults.headers.common["Authorization"] = `Bearer ${token}`;
    const req = await provider.post(
      `/transactions/processed/${param}`,
      payload
    );
    console.log({ req });
  } catch (err) {
    console.log(err);
  }
}

module.exports = { makeAPICall };
