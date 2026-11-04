/**
 * Validate untrusted input (prompts, names from the binary) before using it
 * in r2 commands, so it can not inject others (; | @ > ` ~ ! ...).
 * Return the value, or null if empty (cancelled prompt) or unsafe, alerting
 * in the later case when `what` is given.
 */
function r2Check(regex, str, what) {
	str = (typeof str === 'number') ? '' + str : (typeof str === 'string') ? str.trim() : '';
	if (str === '' || regex.test(str)) {
		return str || null;
	}
	if (what) {
		alert('Invalid ' + what);
	}
	return null;
}

/** Flag, function, variable or flagspace name */
function r2Name(str, what) { return r2Check(/^[\w.:-]+$/, str, what); }

/** Address, size or math expression (0x100, sym.main+4, $$...) */
function r2Expr(str, what) { return r2Check(/^[\w.$+\-*/%()&: ]+$/, str, what); }

/** Hexpairs, allowing the '.' wildcard and ':' mask used by /x */
function r2Hex(str, what) { return r2Check(/^[0-9a-fA-F.:]+$/, str && str.replace(/\s+/g, ''), what); }

/** Whole command wrapped in double quotes, so r2 does not parse ; | @ > ... */
function r2Quoted(cmd, what) { return r2Check(/^[^"\r\n]+$/, cmd, what) && '"' + cmd + '"'; }

/** Arbitrary text as UTF-8 hexpairs (for wx, /x) or base64 (for base64: args) */
function r2StrToHex(str) { return Array.from(new TextEncoder().encode(str), (b) => b.toString(16).padStart(2, '0')).join(''); }
function r2StrToBase64(str) { return window.btoa(String.fromCharCode(...new TextEncoder().encode(str))); }
