
module.exports = [
  {
    test: /\.(js|jsx)$/, exclude: /node_modules/, use: {
      loader: 'babel-loader',
      options: {
        presets: ['@babel/preset-env']
      }
    }
  },
  {
    test: /\.html$/,
    exclude: /node_modules/,
    loader: 'html-loader'
  },
  {
    test: /\.css$/,
    use: ['style-loader', 'css-loader'],
  },
  {
    test: /\.woff(2)?(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'url-loader',
    options: {
      limit: 10000,
      mimetype: 'application/font-woff'
    }
  },
  {
    test: /\.(ttf|eot|png)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'file-loader',
  },
  {
    test: /\.scss$/, exclude: /node_modules/,
    use: ['style-loader', 'css-loader', 'sass-loader'],
  },
  {
    test: /\.svg$/,
    use: ['svg-inline-loader'],
  }
]