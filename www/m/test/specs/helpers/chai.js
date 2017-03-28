var chai = require('chai'),
    sinonChai = require('sinon-chai');
 
global.sinon = require('sinon');
global.expect = chai.expect;
global.Assert = chai.assert;
global.sAssert = sinon.assert;

chai.use(sinonChai);

require('jsdom-global')();

require('../../../../../dev/m/app.js');
