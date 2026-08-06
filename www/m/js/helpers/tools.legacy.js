function E(x) {
	return document.getElementById(x);
}

function encode(r) {
	return r.replace(/[\x26\x0A\<>'"]/g, function(r) { return '&#' + r.charCodeAt(0) + ';';});
}

function clickableOffsets(x) {
	console.error('Using clickableOffsets(str) no longer work');
	console.trace();
	x = x.replace(/0x([a-zA-Z0-9]*)/g,
	'<a href=\'javascript:seek("0x$1")\'>0x$1</a>');
	x = x.replace(/sym\.([\.a-zA-Z0-9_]*)/g,
	'<a href=\'javascript:seek("sym.$1")\'>sym.$1</a>');
	x = x.replace(/fcn\.([\.a-zA-Z0-9_]*)/g,
	'<a href=\'javascript:seek("fcn.$1")\'>fcn.$1</a>');
	x = x.replace(/str\.([\.a-zA-Z0-9_]*)/g,
	'<a href=\'javascript:seek("str.$1")\'>str.$1</a>');
	return x;
}

/* Native-browser replacements for the former FileSaver and dialog polyfill. */
function saveAs(blob, fileName) {
	var url = URL.createObjectURL(blob);
	var link = document.createElement('a');
	link.href = url;
	link.download = fileName;
	link.click();
	setTimeout(function() { URL.revokeObjectURL(url); }, 0);
}

var dialogPolyfill = {
	registerDialog: function(dialog) {
		dialog.showModal = function() { dialog.setAttribute('open', ''); };
		dialog.close = function() { dialog.removeAttribute('open'); };
	}
};
