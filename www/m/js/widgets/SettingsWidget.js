import {r2Settings} from '../core/R2Wrapper';
import {BaseWidget} from './BaseWidget';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class SettingsWidget extends BaseWidget {

	constructor() {
		super('Settings');
	}

	init() {
		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.grid = document.createElement('div');
		this.grid.className = 'mdl-grid';
		this.node.appendChild(this.grid);

		this.addGrid('Platform', (dom) => this.drawPlatform(dom));
		this.addGrid('Disassembly', (dom) => this.drawDisassembly(dom));
		this.addGrid('Core/IO', (dom) => this.drawCoreIO(dom));
		this.addGrid('Analysis', (dom) => this.drawAnalysis(dom));
		this.addGrid('Colors', (dom) => this.drawColors(dom));
		this.addGrid('TTS', (dom) => this.drawTTS(dom));
		this.addGrid('Reset configuration', (dom) => this.drawReset(dom));
		this.addGrid('Emulator', (dom) => this.drawEmulator(dom));

		componentHandler.upgradeDom();
	}

	drawPlatform(dom) {
		var archs = ['x86', 'arm', 'mips', 'java', 'dalvik', '6502', '8051', 'h8300', 'hppa', 'i4004', 'i8008', 'lh5801',
			'lm32', 'm68k', 'malbolge', 'mcs96', 'msp430', 'nios2', 'ppc', 'rar', 'sh', 'snes', 'sparc', 'spc700', 'sysz',
			'tms320', 'v810', 'v850', 'ws', 'xcore', 'prospeller', 'gb', 'z80', 'arc', 'avr', 'bf', 'cr16', 'cris', 'csr',
			'dcpu16', 'ebc'];
		uiSelect(dom, 'Platform', archs, archs.indexOf(r2Settings.getItem(r2Settings.keys.PLATFORM)), function(item) {
			r2Settings.setItem(r2Settings.keys.PLATFORM, item);
		});

		var bits = ['64', '32', '16', '8'];
		uiSelect(dom, 'Bits', bits, bits.indexOf(r2Settings.getItem(r2Settings.keys.BITS)), function(item) {
			r2Settings.setItem(r2Settings.keys.BITS, item);
		});

		var os = ['Linux', 'Windows', 'OSX'];
		uiSelect(dom, 'OS', os, os.indexOf(r2Settings.getItem(r2Settings.keys.OS)), function(item) {
			r2Settings.setItem(r2Settings.keys.OS, item);
		});
	}

	drawDisassembly(dom) {
		var sizes = ['S', 'M', 'L'];
		uiSelect(dom, 'Size', sizes, sizes.indexOf(r2Settings.getItem(r2Settings.keys.SIZE)), function(item) {
			r2Settings.setItem(r2Settings.keys.SIZE, item);
		});
		var decoding = ['Pseudo', 'Opcodes', 'ATT'];
		uiSelect(dom, 'Decoding', decoding, decoding.indexOf(r2Settings.getItem(r2Settings.keys.DECODING)), function(item) {
			r2Settings.setItem(r2Settings.keys.DECODING, item);
		});
		uiSwitch(dom, 'Utf8', r2Settings.getItem(r2Settings.keys.UTF8), function(param, state) {
			r2Settings.setItem(r2Settings.keys.UTF8, state);
		});
		uiSwitch(dom, 'UpperCase', r2Settings.getItem(r2Settings.keys.UCASE), function(param, state) {
			r2Settings.setItem(r2Settings.keys.UCASE, state);
		});
		uiSwitch(dom, 'Show Bytes', r2Settings.getItem(r2Settings.keys.BYTES), function(param, state) {
			r2Settings.setItem(r2Settings.keys.BYTES, state);
		});
		uiSwitch(dom, 'DescribeOps', r2Settings.getItem(r2Settings.keys.DESCRIBE), function(param, state) {
			r2Settings.setItem(r2Settings.keys.DESCRIBE, state);
		});
	}

	drawEmulator(dom){
		uiSwitch(dom, 'Enable ESIL', r2Settings.getItem(r2Settings.keys.ASMEMU), function(param, state) {
			r2Settings.setItem(r2Settings.keys.ASMEMU, state);
		});
		uiSwitch(dom, 'Enable ESIL (Lesser Verbose)', r2Settings.getItem(r2Settings.keys.ASMEMUSTR), function(param, state) {
			r2Settings.setItem(r2Settings.keys.ASMEMUSTR, state);
		});
	}

	drawCoreIO(dom) {
		var mode = ['PA', 'VA', 'PAVA', 'Debug'];
		uiSelect(dom, 'Mode', mode, mode.indexOf(r2Settings.getItem(r2Settings.keys.MODE)), function(item) {
			r2Settings.setItem(r2Settings.keys.MODE, item);
		});
	}

	drawAnalysis(dom) {
		var configAnal = function(param, state, key) {
			r2Settings.setItem(key, state);
		};

		uiSwitch(dom, 'HasNext', r2Settings.getItem(r2Settings.keys.ANAL_HAS_NEXT), function(param, state) {
			return configAnal(param, state, r2Settings.keys.ANAL_HAS_NEXT);
		});
		uiSwitch(dom, 'Skip Nops', r2Settings.getItem(r2Settings.keys.ANAL_SKIP_NOPS), function(param, state) {
			return configAnal(param, state, r2Settings.keys.ANAL_SKIP_NOPS);
		});
		uiSwitch(dom, 'NonCode', r2Settings.getItem(r2Settings.keys.ANAL_NON_CODE), function(param, state) {
			return configAnal(param, state, r2Settings.keys.ANAL_NON_CODE);
		});
	}

	drawColors(dom) {
		var colors;
		r2.cmdj('ecoj', function(data) {
			colors = data;
		});

		uiSwitch(dom, 'Colors', r2Settings.getItem(r2Settings.keys.COLORS), function(param, state) {
			r2Settings.setItem(r2Settings.keys.COLORS, state);
		});

		// Randomize
		uiActionButton(dom, function() {
			r2.cmd('ecr', function() {
				// TODO: tmp, should be replaced by event "color has changed"
				uiContext.widgetContainer.updateManagers.updates.apply();
			});
		}, 'Randomize');

		// Set default
		uiActionButton(dom, function() {
			r2.cmd('ecd', function() {
				// TODO: tmp, should be replaced by event "color has changed"
				uiContext.widgetContainer.updateManagers.updates.apply();
			});
		}, 'Reset colors');

		uiSelect(dom, 'Theme', colors, colors.indexOf(r2Settings.getItem(r2Settings.keys.THEME)), function(theme) {
			r2Settings.setItem(r2Settings.keys.THEME, theme);
		});
	}


	drawTTS(dom) {
		uiSwitch(dom, 'Use TTS', r2Settings.getItem(r2Settings.keys.USE_TTS), function(param, state) {
			r2Settings.setItem(r2Settings.keys.USE_TTS, state);
		});
	}

	drawReset(dom) {
		uiActionButton(dom, function() {
			r2Settings.resetAll();
			// TODO, tmp (+ currently, would update only focused panel -> settings)
			uiContext.widgetContainer.updateManagers.updates.apply();
		}, 'RESET');
	}

	addGrid(name, drawFunc) {
		var div = document.createElement('div');
		div.className = 'mdl-cell mdl-color--white mdl-shadow--2dp mdl-cell--4-col';
		div.style.padding = '10px';
		this.grid.appendChild(div);

		var title = document.createElement('span');
		title.className = 'mdl-layout-title';
		title.innerHTML = name;
		div.appendChild(title);

		var content = document.createElement('div');
		div.appendChild(content);

		drawFunc(content);
	}
}
