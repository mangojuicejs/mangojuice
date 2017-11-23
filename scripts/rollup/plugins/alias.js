const { resolve, join } = require("path");
const alias = require("rollup-plugin-alias");

const ROOT = join(__dirname, "../../../");

module.exports = alias({
  "mangojuice-core": resolve(ROOT, "packages/mangojuice-core/dist/index.es.js"),
  "mangojuice-lazy": resolve(ROOT, "packages/mangojuice-lazy/dist/index.es.js"),
  "mangojuice-inferno": resolve(ROOT, "packages/mangojuice-inferno/dist/index.es.js"),
  "mangojuice-preact": resolve(ROOT, "packages/mangojuice-preact/dist/index.es.js"),
  "mangojuice-react": resolve(ROOT, "packages/mangojuice-react/dist/index.es.js"),
  "mangojuice-react-core": resolve(ROOT, "packages/mangojuice-react-core/dist/index.es.js"),
  "mangojuice-test": resolve(ROOT, "packages/mangojuice-test/dist/index.es.js")
});
