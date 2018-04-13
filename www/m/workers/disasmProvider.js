'use strict';

const m_root = self.location.pathname.split('/').slice(0, -1).join('/');
importScripts(m_root + '/r2.js');

function extractOffset(str) {
	var res = str.match(/(0x[a-fA-F0-9]+)/);
	if (res === null) {
		return null;
	}
	return res[1];
};

function extractFct(str) {
	var withoutHTML = str.replace(/<[^>]*>/g, '');
	var res = withoutHTML.match(/\(fcn\) ([\S^]+)/);
	if (res === null) {
		return null;
	}
	return res[1];
}

function extractVar(str) {
	var withoutHTML = str.replace(/<[^>]*>/g, '');
	var res = withoutHTML.match(/; var ([a-zA-Z0-9]+) ([\S^]+)/);
	if (res === null) {
		return null;
	}
	return res[2];
}

// TODO dirty 
function prepareClickableOffsets(x) {
	x = x.replace(/0x([a-zA-Z0-9]*)/g,
	'<a class=\'r2seek\'>0x$1</a>');
	x = x.replace(/sym\.([\.a-zA-Z0-9_]*)/g,
	'<a class=\'r2seek\'>sym.$1</a>');
	x = x.replace(/fcn\.([\.a-zA-Z0-9_]*)/g,
	'<a class=\'r2seek\'>fcn.$1</a>');
	x = x.replace(/str\.([\.a-zA-Z0-9_]*)/g,
	'<a class=\'r2seek\'>str.$1</a>');
	return x;
}

function getChunk(where, howManyLines) {
	var raw;

	// Line retrieved from the current offset
	r2.cmd('pD ' + howManyLines + '@' + where + '|H', function(d) {
		raw = d;
	});

	raw = prepareClickableOffsets(raw);
	var lines = raw.split('\n');
	for (var i = 0 ; i < lines.length ; i++) {

		var fct = extractFct(lines[i]);
		if (fct !== null) {
			lines[i] = '<span class=\'fcn\' id=\'' + fct + '\'>' + lines[i] + '</span>';
		}

		var variable = extractVar(lines[i]);
		if (variable !== null) {
			lines[i] = '<span class=\'var\' id=\'' + variable + '\'>' + lines[i] + '</span>';
		}

		var offset = extractOffset(lines[i]);
		if (offset !== null) {
			lines[i] = '<span class=\'offset\' id=\'' + parseInt(offset, 16) + '\'>' + lines[i] + '</span>';
		}
	}

	var withContext = lines.join('\n');

	return '<pre style="border-bottom:1px dashed white;" title="' + where + '" id="block' + where + '">' + withContext + '</pre>';
}

self.onmessage = function(e) {
	if (e.data.offset < 0) {
		self.postMessage({
			offset: 0,
			data: 'before 0x00'
		});
	} else {
		var chunk = {
			offset: e.data.offset,
			size: e.data.size,
			data: getChunk(e.data.offset, e.data.size)
		};

		// Sending the data from r2
		self.postMessage(chunk);
	}
};
