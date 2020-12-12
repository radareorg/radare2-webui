const httpProxy = require('http-proxy');
const proxy = httpProxy.createServer({ target: 'http://localhost:9090' });

module.exports = {
  experiments: {
    routes: [
      {
        src: '/cmd/.*',
        dest: (req, res) => proxy.web(req, res),
      },
    ],
  },
};
