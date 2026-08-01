const { createProxyMiddleware } = require('http-proxy-middleware');

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target: 'https://localhost:44396',
      changeOrigin: true,
      secure: false,
      pathFilter: '/api',
    })
  );
};

