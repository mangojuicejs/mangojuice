var path = require("path");
var webpack = require("webpack");
var HtmlWebpackPlugin = require("html-webpack-plugin");

var SOURCE_DIR = path.resolve(__dirname + "/src");

module.exports = {
  devtool: "source-map",
  entry: {
    app: [
      `webpack-dev-server/client?/`,
      "webpack/hot/only-dev-server",
      "regenerator-runtime/runtime",
      "./src/client.js"
    ]
  },

  output: {
    publicPath: "/",
    path: path.resolve(__dirname + "/dist"),
    filename: "[name].js"
  },

  plugins: [
    // new webpack.optimize.UglifyJsPlugin({
    //   compress: { warnings: false },
    //   sourceMap: true
    // }),
    new webpack.HotModuleReplacementPlugin(),
    new webpack.LoaderOptionsPlugin({
      splitBlocks: false
    }),
    new HtmlWebpackPlugin({
      filename: "index.html",
      template: "src/index.html"
    })
  ],

  module: {
    rules: [
      {
        test: /\.js$/,
        loader: "babel-loader",
        include: [SOURCE_DIR],
        exclude: [/node_modules/],
        query: {
          presets: ["es2015", "stage-0", "react"],
          plugins: [
            "transform-decorators-legacy",
            "@mangojuice/core/babel/proxy"
          ]
        }
      }
    ]
  },

  resolve: {
    modules: ["node_modules", path.resolve(__dirname)]
    // alias: {
    //   'react': 'preact-compat/dist/preact-compat',
    //   'react-dom': 'preact-compat/dist/preact-compat'
    // }
  },

  devServer: {
    hot: true,
    publicPath: "/",
    inline: false,
    lazy: false,
    quiet: true,
    noInfo: true,
    headers: { "Access-Control-Allow-Origin": "*" },
    stats: { colors: true },
    historyApiFallback: {
      disableDotRule: true
    }
  }
};
