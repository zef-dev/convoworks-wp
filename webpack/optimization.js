
module.exports =  {
    splitChunks: {
        cacheGroups: {
            vendor: {
                test: /node_modules/,
                chunks: 'initial',
                name: 'vendor',
                enforce: true
            },
        }
    }
}