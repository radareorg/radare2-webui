function hexPairToASCII(pair) {
	var chr = parseInt(pair, 16);
	if (chr >= 33 && chr <= 126) {
		return String.fromCharCode(chr);
	}

	return '.';
};

function ASCIIToHexpair(ascii) {
	var hex = ascii.charCodeAt(0).toString(16);
	if (hex.length < 2) {
		hex = '0' + hex;
	}

	return hex;
};

function isAsciiVisible(offset) {
	return (offset >= 33 && offset <= 126);
}

function basename(path) {
	return path.split(/[\\/]/).pop();
}

function int2fixedHex(nb, length) {
	var hex = nb.toString(16);
	while (hex.length < length) {
		hex = '0' + hex;
	}
	return '0x' + hex;
}
