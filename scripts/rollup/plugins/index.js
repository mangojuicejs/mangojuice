const fs = require('fs');
const path = require('path');
const babelPlugin = require("rollup-plugin-babel");
const commonjs = require("rollup-plugin-commonjs");
const nodeResolve = require("rollup-plugin-node-resolve");
const replacePlugin = require("rollup-plugin-replace");
const uglify = require("rollup-plugin-uglify");

const aliasPlugin = require("./alias");
const optJSPlugin = require("./optimize");
const babelrc = JSON.parse(fs.readFileSync(path.join(__dirname, '..', '..', '..', '.babelrc')));

module.exports = function(version, options) {
  const plugins = [
    aliasPlugin,
    nodeResolve({
      extensions: [".ts", ".js", ".json"],
      jsnext: true
    }),
    commonjs({
      include: "node_modules/**"
    }),
    babelPlugin({
      babelrc: false,
      presets: [['es2015', {'modules': false}]].concat(babelrc.presets.slice(1)),
      plugins: ['external-helpers'].concat(babelrc.plugins)
    })
  ];

  const replaceValues = {
    "process.env.MANGOJUICE_VERSION": JSON.stringify(options.version)
  };

  if (options.replace) {
    replaceValues["process.env.NODE_ENV"] = JSON.stringify(options.env);
  }

  if (options.uglify) {
    plugins.push(
      uglify({
        compress: {
          // compress options
          booleans: true,
          dead_code: true,
          drop_debugger: true,
          unused: true
        },
        ie8: false,
        parse: {
          // parse options
          html5_comments: false,
          shebang: false
        },
        sourceMap: false,
        toplevel: false,
        warnings: false
      })
    );
  }

  plugins.push(replacePlugin(replaceValues));

  if (options.optimize) {
    plugins.push(optJSPlugin);
  }

  return plugins;
};
