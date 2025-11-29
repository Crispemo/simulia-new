const path = require('path');

module.exports = {
  resolve: {
    extensions: ['.js', '.jsx', '.json', '.mjs'],
    fullySpecified: false,
    fallback: {
      "path": require.resolve("path-browserify"),
      "crypto": require.resolve("crypto-browserify"),
      "stream": require.resolve("stream-browserify"),
      "zlib": require.resolve("browserify-zlib"),
      "querystring": require.resolve("querystring-es3"),
      "url": require.resolve("url"),
      "buffer": require.resolve("buffer"),
      "http": require.resolve("stream-http"),
    }
  },
  // Aquí añades otras configuraciones como entradas y salidas según tu proyecto
};

