
module.exports = [
   {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
            loader: 'babel-loader',
            options: {
              presets: ['@babel/preset-env']
            }
        }
    },
  {
        test: /\.(js|jsx)$/,
        exclude: /node_modules/,
        use: {
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
    test: /\.(ttf|eot|png|woff|woff2)(\?v=[0-9]\.[0-9]\.[0-9])?$/,
    loader: 'url-loader',
    options: {
        esModule: false
    }
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