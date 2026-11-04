/**
 * Helpers to build r2 commands from untrusted input (prompts, names coming
 * from the binary...) without allowing command injection (; | @ > ` ~ ! etc)
 * Each function returns null when the value is not safe to use.
 */

/** Single word argument: flag, function, variable or flagspace name */
function r2Name(str) {
	if (typeof str !== 'string') {
		return null;
	}
	str = str.trim();
	return /^[\w.:\-]+$/.test(str) ? str : null;
}

/** Numeric expression: address, size, math (0x100, sym.main+4, $$...) */
function r2Expr(str) {
	if (typeof str === 'number') {
		return '' + str;
	}
	if (typeof str !== 'string') {
		return null;
	}
	str = str.trim();
	return /^[\w.$+\-*/%()&: ]+$/.test(str) ? str : null;
}

/** Hexpairs, allowing the '.' wildcard and ':' mask used by /x */
function r2Hex(str) {
	if (typeof str !== 'string') {
		return null;
	}
	str = str.replace(/\s+/g, '');
	return /^[0-9a-fA-F.:]+$/.test(str) ? str : null;
}

/** Wraps a whole command in double quotes so r2 does not parse ; | @ > ... */
function r2Quoted(cmd) {
	if (typeof cmd !== 'string' || /["\r\n]/.test(cmd)) {
		return null;
	}
	return '"' + cmd + '"';
}

/** Encodes text as UTF-8 hexpairs, used to write or search arbitrary strings */
function r2StrToHex(str) {
	return Array.from(new TextEncoder().encode(str))
		.map((b) => b.toString(16).padStart(2, '0'))
		.join('');
}

/** Encodes text as UTF-8 base64 for commands accepting the base64: prefix */
function r2StrToBase64(str) {
	let bin = '';
	for (const b of new TextEncoder().encode(str)) {
		bin += String.fromCharCode(b);
	}
	return window.btoa(bin);
}

function r2Invalid(what) {
	alert('Invalid ' + what);
	return null;
}
