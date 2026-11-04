function write() {
	var str = prompt('hexpairs, quoted string or :assembly');
	if (str) {
		var cmd;
		switch (str[0]) {
		case ':':
			cmd = r2Quoted('wa ' + str.substring(1));
			break;
		case '"':
			cmd = 'wx ' + r2StrToHex(str.replace(/"/g, ''));
			break;
		default:
			var hex = r2Hex(str);
			cmd = hex && 'wx ' + hex;
			break;
		}
		if (!cmd) {
			return r2Invalid('input');
		}
		r2.cmd(cmd, update);
	}
}

function comment() {
	var addr = prompt('comment');
	if (addr) {
		if (addr === '-') {
			r2.cmd('CC-');
		} else {
			r2.cmd('CC base64:' + r2StrToBase64(addr));
		}
		update();
	}
}

function flag() {
	var addr = prompt('flag');
	if (addr) {
		if (addr === '-') {
			r2.cmd('f-');
		} else {
			var name = r2Name(addr);
			if (name === null) {
				return r2Invalid('flag name');
			}
			r2.cmd('f ' + name);
		}
		update();
	}
}

function block() {
	var size = prompt('block');
	if (size && size.trim()) {
		size = r2Expr(size);
		if (size === null) {
			return r2Invalid('size');
		}
		r2.cmd('b ' + size);
		update();
	}
}

function flagsize() {
	var size = prompt('size');
	if (size && size.trim()) {
		size = r2Expr(size);
		if (size === null) {
			return r2Invalid('size');
		}
		r2.cmd('fl $$ ' + size);
		update();
	}
}