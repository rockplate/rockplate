const path = require('path');

const createConfig = (options) => {
  return {
    watch: options.watch === true,
    watchOptions:
      options.watch === true
        ? {
            ignored: ['**/*.js', '**/*.d.ts', 'node_modules/**'],
          }
        : {},
    mode: options.mode,
    devtool: options.devtool || 'source-map',
    entry: './src/index.ts',
    output: {
      path: options.output || path.resolve(__dirname, 'dist/umd'),
      filename: 'rockplate' + (options.mode === 'production' ? '.min' : '') + '.js',
      library: 'rockplate',
      libraryTarget: 'umd',
      globalObject: "typeof self !== 'undefined' ? self : this",
    },
    module: {
      rules: [
        {
          test: /\.tsx?$/,
          exclude: /node_modules/,
          use: {
            loader: 'ts-loader',
            options: {
              configFile: 'tsconfig.umd.json',
            },
          },
        },
      ],
    },
    resolve: {
      extensions: ['.ts', '.tsx', '.js'],
    },
  };
};

module.exports = (env, argv) => {
  const isDebugging = env === 'development';

  const configs = [];

  // configs.push(
  //   createConfig({
  //     mode: 'development',
  //     output: path.resolve(__dirname, 'docs/assets'),
  //     // devtool: isDebugging ? 'cheap-module-eval-source-map' : 'source-map',
  //     devtool: 'cheap-module-eval-source-map',
  //     watch: isDebugging,
  //   }),
  // );

  if (!isDebugging) {
    configs.push(
      createConfig({
        mode: 'production',
      }),
    );
    configs.push(
      createConfig({
        mode: 'development',
      }),
    );
  }

  return configs;
};
