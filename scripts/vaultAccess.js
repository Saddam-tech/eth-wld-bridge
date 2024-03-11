const aws = require("aws-sdk");
require("dotenv").config({ path: "../.env" });

const paramName = process.env.AWS_PARAM_NAME;
const region = process.env.AWS_REGION;
aws.config.update({ region });
const ssm = new aws.SSM();

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
