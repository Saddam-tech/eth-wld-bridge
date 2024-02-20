const aws = require("aws-sdk");
require("dotenv").config();

aws.config.update({ region: "us-west-2" });
const ssm = new aws.SSM();
const paramName = process.env.AWS_PARAM_NAME;

const params = {
  Name: paramName,
  WithDecryption: true,
};

async function getParameterFromAWS() {
  return new Promise((resolve, reject) => {
    ssm.getParameter(params, (err, data) => {
      if (err) {
        console.log("Error", err);
        reject(err);
      } else {
        resolve(data.Parameter.Value);
      }
    });
  });
}

module.exports = { getParameterFromAWS };
