import * as chai from 'chai';
import sinonChai from 'sinon-chai';
import sinon from 'sinon';
import jsdomGlobal from 'jsdom-global';
import { InfiniteScrolling } from '../../../js/helpers/InfiniteScrolling.js';

global.sinon = sinon;
global.expect = chai.expect;
global.Assert = chai.assert;
global.sAssert = sinon.assert;
global.InfiniteScrolling = InfiniteScrolling;

chai.use(sinonChai);

jsdomGlobal();
