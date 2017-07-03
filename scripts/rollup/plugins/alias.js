const { resolve, join } = require("path");
const alias = require("rollup-plugin-alias");

const ROOT = join(__dirname, "../../../");

module.exports = alias({
  "mangojuice-core": resolve(ROOT, "packages/mangojuice-core/dist/index.es.js"),
  "mangojuice-data": resolve(ROOT, "packages/mangojuice-data/dist/index.es.js"),
  "mangojuice-form": resolve(ROOT, "packages/mangojuice-form/dist/index.es.js"),
  "mangojuice-intl": resolve(ROOT, "packages/mangojuice-intl/dist/index.es.js"),
  "mangojuice-lazy": resolve(ROOT, "packages/mangojuice-lazy/dist/index.es.js"),
  "mangojuice-react": resolve(
    ROOT,
    "packages/mangojuice-react/dist/index.es.js"
  ),
  "mangojuice-react-core": resolve(
    ROOT,
    "packages/mangojuice-react-core/dist/index.es.js"
  ),
  "mangojuice-router": resolve(
    ROOT,
    "packages/mangojuice-router/dist/index.es.js"
  ),
  "mangojuice-dom": resolve(ROOT, "packages/mangojuice-dom/dist/index.es.js")
});
