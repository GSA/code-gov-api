/* eslint-disable */
let CONFIG;

if (process.env.NODE_ENV === "prod" || process.env.NODE_ENV === "production") {
  CONFIG = require("./prod/index.json");
} else {
  CONFIG = require("./dev/index.json");
}

module.exports = CONFIG;
/* eslint-enable */
