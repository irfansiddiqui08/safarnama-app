// Extends app.json. Adds the Firebase file for Android push notifications only
// once it has been downloaded into this folder, so builds work before that step.
const fs = require("fs");
const path = require("path");

module.exports = ({ config }) => {
  const gs = path.join(__dirname, "google-services.json");
  if (fs.existsSync(gs)) config.android = { ...config.android, googleServicesFile: "./google-services.json" };
  return config;
};
