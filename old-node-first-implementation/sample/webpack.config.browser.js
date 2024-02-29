const HtmlWebpackPlugin = require('html-webpack-plugin')
const path = require('path')

module.exports = {
  // context: path.resolve(__dirname, 'client'),
  devtool: 'inline-source-map',
  // devServer: {
  //   contentBase: path.join(__dirname, 'build/client'),
  //   compress: true,
  //   port: 3000
  // },

  entry: './src/client/index.ts',
  mode: 'development',
  module: {
    rules: [
      {
        test: /\.ts$/,
        use: 'ts-loader',
        // exclude: /node_modules/
      }
    ]
  },
  output: {
    filename: 'client.js',
    path: path.resolve(__dirname, 'build', 'client')
  },
  resolve: {
    extensions: ['.ts', '.js']
  },
  plugins: [new HtmlWebpackPlugin({ template: './src/client/index.html' })]
}
