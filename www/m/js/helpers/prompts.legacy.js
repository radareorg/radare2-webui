function write(done) {
	var str = prompt('hexpairs, quoted string or :assembly') || '';
	var cmd;
	if (str[0] === ':') {
		cmd = r2Quoted('wa ' + str.substring(1), 'assembly');
	} else {
		var hex = (str[0] === '"') ? r2StrToHex(str.replace(/"/g, '')) : r2Hex(str, 'hexpairs');
		cmd = hex && 'wx ' + hex;
	}
	cmd && r2.cmd(cmd, done);
}
