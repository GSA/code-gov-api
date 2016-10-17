var CONFIG;

if (process.env.NODE_ENV === "prod") {
  CONFIG = require("./prod/index.json");
} else {
  CONFIG = require("./dev/index.json");
}

module.exports = CONFIG;
