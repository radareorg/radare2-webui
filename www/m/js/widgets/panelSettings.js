function getConf(confKey) {
	var local = localStorage.getItem(confKey.name);
	if (local !== null) {
		if (local === 'false') {
			local = false;
		} else if (local === 'true') {
			local = true;
		}
		return local;
	} else {
		return confKey.defVal;
	}
}

function saveConf(confKey, val) {
	localStorage.setItem(confKey.name, val);
	confKey.apply(val);
}

function applyConf(force) {
	force = (typeof force === 'undefined') ? false : force;
	for (var item in R2Conf) {
		var cnf = R2Conf[item];
		if ((!force && getConf(cnf) !== cnf.defVal) || force) {
			cnf.apply(getConf(cnf));
		}
	}
}

function resetConf() {
	for (var item in R2Conf) {
		var cnf = R2Conf[item];
		localStorage.removeItem(cnf.name);
	}
	applyConf(true);
}

var R2Conf = {
	platform: { name: 'platform', defVal: 'x86', apply: function(p) { r2.cmd('e asm.arch=' + p); } },
	bits: { name: 'bits', defVal: '32', apply: function(p) { r2.cmd('e asm.bits=' + p); } },
	os: { name: 'os', defVal: 'Linux', apply: function(p) { console.log('OS is now: ' + p); } }, // missing
	size: { name: 'size', defVal: 'S', apply: function(p) {
			switch (p) {
				case 'S':
					r2.cmd('e asm.bytes=false');
					r2.cmd('e asm.lines=false');
					r2.cmd('e asm.cmtright=false');
					break;
				case 'M':
					r2.cmd('e asm.bytes=false');
					r2.cmd('e asm.lines=true');
					r2.cmd('e asm.lineswidth=8');
					r2.cmd('e asm.cmtright=false');
					break;
				case 'L':
					r2.cmd('e asm.bytes=true');
					r2.cmd('e asm.lines=true');
					r2.cmd('e asm.lineswidth=12');
					r2.cmd('e asm.cmtright=true');
					break;
			};
		}
	},
	decoding: { name: 'decoding', defVal: 'Pseudo', apply: function(p) {
			switch (p) {
				case 'Pseudo':
					r2.cmd('e asm.pseudo=1');
					r2.cmd('e asm.syntax=intel');
					break;
				case 'Opcodes':
					r2.cmd('e asm.pseudo=0');
					r2.cmd('e asm.syntax=intel');
					break;
				case 'ATT':
					r2.cmd('e asm.pseudo=0');
					r2.cmd('e asm.syntax=att');
					break;
			};
		}
	},
	mode: { name: 'mode', defVal: 'PA', apply: function(p) {
			switch (p) {
				case 'PA':
					r2.cmd('e io.va=false');
					break;
				case 'VA':
					r2.cmd('e io.va=true');
					break;
				case 'Debug':
					r2.cmd('e io.va=true');
					r2.cmd('e io.debug=true');
					break;
			};
		}
	},
	analHasNext: { name: 'analHasNext', defVal: true, apply: function(p) { console.log('analHasNext is ' + p); } },
	analSkipNops: { name: 'analSkipNops', defVal: true, apply: function(p) { console.log('analSkipNops is ' + p); } },
	analNonCode: { name: 'analNonCode', defVal: false, apply: function(p) { console.log('analNonCode is ' + p); } },
	colors: { name: 'colors', defVal: true, apply: function(p) { inColor = p; } },
	useTTS: { name: 'tts', defVal: true, apply: function(p) { R2Conf.useTTS.value = p; } },
	theme: { name: 'theme', defVal: 'none', apply: function(p) { r2.cmd('eco ' + p); } } // TODO
};

function panelSettings() {
	var widget = widgetContainer.getWidget('Settings');
	var c = widgetContainer.getWidgetDOMWrapper(widget);
	c.innerHTML = '';
	updates.registerMethod(widget.getOffset(), panelSettings);

	var grid = document.createElement('div');
	grid.className = 'mdl-grid';
	c.appendChild(grid);

	var platform = createGrid(grid, 'Platform');
	drawPlatform(platform);

	var disassembly = createGrid(grid, 'Disassembly');
	drawDisassembly(disassembly);

	var coreio = createGrid(grid, 'Core/IO');
	drawCoreIO(coreio);

	var analysis = createGrid(grid, 'Analysis');
	drawAnalysis(analysis);

	var colors = createGrid(grid, 'Colors');
	drawColors(colors);

	var tts = createGrid(grid, 'TTS');
	drawTTS(tts);

	var reset = createGrid(grid, 'Reset configuration');
	uiActionButton(reset, function() {
		resetConf();
		update();
	}, 'RESET');

	componentHandler.upgradeDom();
}

function savedFromList(list, name, defaultOffset) {
	var value = defaultOffset;
	var saved = localStorage.getItem(name);
	if (saved !== null) {
		value = list.indexOf(saved);
	}
	return value;
}

function drawPlatform(dom) {
	var archs = ['x86', 'arm', 'mips', 'java', 'dalvik', '6502', '8051', 'h8300', 'hppa', 'i4004', 'i8008', 'lh5801',
		'lm32', 'm68k', 'malbolge', 'mcs96', 'msp430', 'nios2', 'ppc', 'rar', 'sh', 'snes', 'sparc', 'spc700', 'sysz',
		'tms320', 'v810', 'v850', 'ws', 'xcore', 'prospeller', 'gb', 'z80', 'arc', 'avr', 'bf', 'cr16', 'cris', 'csr',
		'dcpu16', 'ebc'];
	uiSelect(dom, 'Platform', archs, archs.indexOf(getConf(R2Conf.platform)), function(item) {
		saveConf(R2Conf.platform, item);
	});

	var bits = ['64', '32', '16', '8'];
	uiSelect(dom, 'Bits', bits, bits.indexOf(getConf(R2Conf.bits)), function(item) {
		saveConf(R2Conf.bits, item);
	});

	var os = ['Linux', 'Windows', 'OSX'];
	uiSelect(dom, 'OS', os, os.indexOf(getConf(R2Conf.os)), function(item) {
		saveConf(R2Conf.os, item);
	});
}

function drawDisassembly(dom) {
	var sizes = ['S', 'M', 'L'];
	uiSelect(dom, 'Size', sizes, sizes.indexOf(getConf(R2Conf.size)), function(item) {
		saveConf(R2Conf.size, item);
	});
	var decoding = ['Pseudo', 'Opcodes', 'ATT'];
	uiSelect(dom, 'Decoding', decoding, decoding.indexOf(getConf(R2Conf.decoding)), function(item) {
		saveConf(R2Conf.decoding, item);
	});
}

function drawCoreIO(dom) {
	var mode = ['PA', 'VA', 'Debug'];
	uiSelect(dom, 'Mode', mode, mode.indexOf(getConf(R2Conf.mode)), function(item) {
		saveConf(R2Conf.mode, item);
	});
}

function drawAnalysis(dom) {
	var configAnal = function(param, state, conf) {
		saveConf(conf, state);
	};

	uiSwitch(dom, 'HasNext', getConf(R2Conf.analHasNext), function(param, state) {
		return configAnal(param, state, R2Conf.analHasNext);
	});
	uiSwitch(dom, 'Skip Nops', getConf(R2Conf.analSkipNops), function(param, state) {
		return configAnal(param, state, R2Conf.analSkipNops);
	});
	uiSwitch(dom, 'NonCode', getConf(R2Conf.analNonCode), function(param, state) {
		return configAnal(param, state, R2Conf.analNonCode);
	});
}

function drawColors(dom) {
	var colors;
	r2.cmdj('ecoj', function(data) {
		colors = data;
	});

	uiSwitch(dom, 'Colors', getConf(R2Conf.colors), function(param, state) {
		saveConf(R2Conf.colors, state);
	});

	// Randomize
	uiActionButton(dom, function() {
		r2.cmd('ecr', function() {
			update();
		});
	}, 'Randomize');

	// Set default
	uiActionButton(dom, function() {
		r2.cmd('ecd', function() {
			update();
		});
	}, 'Reset colors');

	uiSelect(dom, 'Theme', colors, colors.indexOf(getConf(R2Conf.theme)), function(theme) {
		saveConf(R2Conf.theme, theme);
	});
}


function drawTTS(dom) {
	uiSwitch(dom, 'Use TTS', getConf(R2Conf.useTTS), function(param, state) {
		saveConf(R2Conf.useTTS, state);
	});
}

function createGrid(dom, name) {
	var div = document.createElement('div');
	div.className = 'mdl-cell mdl-color--white mdl-shadow--2dp mdl-cell--4-col';
	div.style.padding = '10px';
	dom.appendChild(div);

	var title = document.createElement('span');
	title.className = 'mdl-layout-title';
	title.innerHTML = name;
	div.appendChild(title);

	var content = document.createElement('div');
	div.appendChild(content);

	return content;
}
