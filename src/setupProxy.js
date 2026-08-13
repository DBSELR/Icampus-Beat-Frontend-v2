const { createProxyMiddleware } = require('http-proxy-middleware');

// Backend URL options (match whichever profile you run in Visual Studio):
//   IIS Express (HTTPS) : https://localhost:44396
//   dotnet run (https)  : https://localhost:7011
//   dotnet run (http)   : http://localhost:5127
const BACKEND_URL = process.env.REACT_APP_BACKEND_URL || 'https://localhost:44396';

module.exports = function (app) {
  app.use(
    createProxyMiddleware({
      target: BACKEND_URL,
      changeOrigin: true,
      secure: false,
      pathFilter: '/api',
    })
  );
};
