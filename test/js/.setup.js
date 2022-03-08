const path = require('path');
const chai = require('chai');
const {expect} = chai;

global.SRC_DIR_PATH = path.join(__dirname, '../../src/js');
global.CONFIG_DIR_PATH = path.join(__dirname, '../../src/config');
global.chai = chai;
global.expect = expect;
