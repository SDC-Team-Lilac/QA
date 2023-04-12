// Generated using webpack-cli https://github.com/webpack/webpack-cli

const path = require('path');

const config = {
    entry: './client/src/index.jsx',
    output: {
        path: path.resolve(__dirname, './client/dist'),
        filename: "bundle.js"
    },
    plugins: [
        // Add your plugins here
        // Learn more about plugins from https://webpack.js.org/configuration/plugins/
    ],
    module: {
        rules: [
            {
                test: /\.(js|jsx)$/i,
                loader: 'babel-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/i,
                use: ['style-loader','css-loader'],
            },
            {
                test: /\.(eot|svg|ttf|woff|woff2|png|jpg|gif)$/i,
                type: 'asset',
            },

            // Add your rules for custom modules here
            // Learn more about loaders from https://webpack.js.org/loaders/
        ],
    },
};

module.exports = () => {
    config.mode = 'development';
    return config;
};
