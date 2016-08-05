'use strict';
importScripts('/m/r2.js');
importScripts('/m/tools.js');

var howManyLines;
var configurationDone = false;

function getChunk(where, howManyLines) {
	var raw;

	console.log('pd ' + howManyLines + '@e:scr.color=1,scr.html=1 @' + where);
	// Line retrieved from the current offset
	r2.cmd('pd ' + howManyLines + '@e:scr.color=1,scr.html=1 @' + where, function(d) {
		raw = '<pre style="color:grey" id="block' + where + '">' + clickableOffsets(d) + '</pre>';
	});

	return raw;
}

self.onmessage = function(e) {
	if (!configurationDone) {
		// Providing block size (how many lines to retrieve)
		howManyLines = e.data;
		configurationDone = true;
	} else {
		if (e.data.offset < 0) {
			self.postMessage({
				dir: e.data.dir,
				offset: 0,
				domId: null,
				raw: 'before 0x00'
			});
		} else {
			var length = howManyLines;
			if (typeof e.data.substract !== 'undefined') {
				// 1 line = 2
				// length is accepted as number of line
				length -= e.data.substract / 2;
			}

			console.log(e.data.offset);
			var chunk = {
				dir: e.data.dir,
				offset: e.data.offset,
				domId: 'block' + e.data.offset,
				raw: getChunk(e.data.offset, length)
			};

			// Sending the data from r2
			self.postMessage(chunk);
		}
	}
};
