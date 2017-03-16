function write() {
	var str = prompt('hexpairs, quoted string or :assembly');
	if (str != '') {
		switch (str[0]) {
		case ':':
			str = str.substring(1);
			r2.cmd('"wa ' + str + '"', update);
			break;
		case '"':
			str = str.replace(/"/g, '');
			r2.cmd('w ' + str, update);
			break;
		default:
			r2.cmd('wx ' + str, update);
			break;
		}
	}
}

function comment() {
	var addr = prompt('comment');
	if (addr) {
		if (addr === '-') {
			r2.cmd('CC-');
		} else {
			r2.cmd('"CC ' + addr + '"');
		}
		update();
	}
}

function flag() {
	var addr = prompt('flag');
	if (addr) {
		if (addr === '-') {
			r2.cmd('f' + addr);
		} else {
			r2.cmd('f ' + addr);
		}
		update();
	}
}

function block() {
	var size = prompt('block');
	if (size && size.trim()) {
		r2.cmd('b ' + size);
		update();
	}
}

function flagsize() {
	var size = prompt('size');
	if (size && size.trim()) {
		r2.cmd('fl $$ ' + size);
		update();
	}
}