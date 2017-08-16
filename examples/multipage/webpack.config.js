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
    new webpack.HotModuleReplacementPlugin(),
    new webpack.LoaderOptionsPlugin({
      splitBlocks: true
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
        loader: require.resolve('babel-loader'),
        include: [ SOURCE_DIR ],
        exclude: [ /node_modules/ ],
        query: {
          presets: [
            [require.resolve('babel-preset-es2015'), { modules: false }],
            require.resolve('babel-preset-stage-0'),
            require.resolve('babel-preset-react')
          ],
          plugins: [
            require.resolve('babel-plugin-transform-decorators-legacy'),
            require.resolve('mangojuice-lazy/proxy')
          ]
        }
      }
    ]
  },

  resolve: {
    modules: [
      path.join(path.resolve(__dirname), "node_modules"),
      path.resolve(__dirname),
      path.join(__dirname, '..', '..', 'node_modules')
    ]
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
