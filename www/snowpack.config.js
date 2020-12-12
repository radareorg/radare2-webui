const httpProxy = require('http-proxy');
const proxy = httpProxy.createServer({ target: 'http://localhost:9090' });

module.exports = {
  mount: {
    '/': {
      url: '/'
    },
    enyo: {
      url: '/enyo',
      static: true
    },
    m: {
      url: '/m',
      static: true
    },
    old: {
      url: '/old',
      static: true
    },
    p: {
      url: '/p',
      static: true
    },
    t: {
      url: '/t',
      static: true
    },
  },
  experiments: {
    routes: [
      {
        src: '/cmd/.*',
        dest: (req, res) => proxy.web(req, res),
      },
    ],
  },
};
