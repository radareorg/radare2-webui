import {SettingsManager} from './SettingsManager';
import {uiContext} from './UIContext';

/**
 * Group of actions to listen to some events (seek, analyze...)
 * @class R2Actions
 */
export const R2Actions = {
	SEEK: 'seek'
}

class R2Wrapper {

	constructor() {
		this.listeners = [];

		Object.keys(R2Actions).forEach((action, index) => {
			this.listeners[R2Actions[action]] = [];
		});
	}

	/**
	 * Seek the value provided.
	 * If widget is set, will navigate to it.
	 * Notify all registered observers about seek action. 
	 * @param {any} value The value to seek
	 * @param {any} [widget=null] Optional widget for navigation
	 */
	seek(value, widget = null) {
		// TODO fetch s++ / s-- cmd
		// TODO keep track of current offset
		let addr = value;
		if (typeof value === 'undefined') {
			addr = prompt('address');
		} else if (typeof value === 'number') {
			addr = '0x' + value.toString(16);
		}

		if (!addr || addr.trim() === '') {
			return;
		}

		r2.cmd('s ' + addr, () => {
			widget && uiContext.navigateTo(widget);
			this.notifyAction(R2Actions.SEEK);
		});
	}

	/**
	 * Add a listener to a specific action.
	 * @param {R2Actions} action 
	 * @param {any} fn 
	 */
	registerListener(action, fn) {
		this.listeners[action].push(fn);
	}

	/**
	 * Trigger all listeners for specified action
	 * @param {R2Actions} action 
	 */
	notifyAction(action) {
		this.listeners[action].forEach(fn => fn());
	}
}

export const r2Wrapper = new R2Wrapper();

const SettingItems = {
	PLATFORM: 'platform',
	BITS: 'bits',
	UTF8: 'utf8',
	UCASE: 'ucase',
	DESCRIBE: 'describe',
	BYTES: 'bytes',
	OS: 'os',
	SIZE: 'size',
	DECODING: 'decoding',
	MODE: 'mode',
	ANAL_HAS_NEXT: 'analHasNext',
	ANAL_SKIP_NOPS: 'analSkipNops',
	ANAL_NON_CODE: 'analNonCode',
	COLORS: 'colors',
	USE_TTS: 'useTTS',
	THEME: 'theme',
	ASMEMU: 'asmemu',
	ASMEMUSTR: 'asmemustr'
};



let r2Conf = {};
r2Conf[SettingItems.PLATFORM] = { name: 'platform', defVal: 'x86', apply: function(p) { r2.cmd('e asm.arch=' + p); } };
r2Conf[SettingItems.BITS] = { name: 'bits', defVal: '32', apply: function(p) { r2.cmd('e asm.bits=' + p); } };
r2Conf[SettingItems.UTF8] = { name: 'utf8', defVal: 'true', apply: function(p) { r2.cmd('e scr.utf8=' + p); } };
r2Conf[SettingItems.UCASE] = { name: 'ucase', defVal: 'false', apply: function(p) { r2.cmd('e asm.ucase=' + p); } };
r2Conf[SettingItems.DESCRIBE] = { name: 'describe', defVal: 'false', apply: function(p) { r2.cmd('e asm.describe=' + p); } };
r2Conf[SettingItems.BYTES] = { name: 'bytes', defVal: 'false', apply: function(p) { r2.cmd('e asm.bytes=' + p); } };
r2Conf[SettingItems.OS] = { name: 'os', defVal: 'Linux', apply: function(p) { console.log('OS is now: ' + p); } }; // missing
r2Conf[SettingItems.ASMEMU] = { name: 'asmemu', defVal: 'false', apply: function(p) {  r2.cmd('e asm.emu=' + p); } };
r2Conf[SettingItems.ASMEMUSTR] = { name: 'asmemustr', defVal: 'false', apply: function(p) { r2.cmd('e asm.emustr=' + p); } };
r2Conf[SettingItems.SIZE] = { name: 'size', defVal: 'S', apply: function(p) {
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
}};
r2Conf[SettingItems.DECODING] = { name: 'decoding', defVal: 'Pseudo', apply: function(p) {
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
}};
r2Conf[SettingItems.MODE] = { name: 'mode', defVal: 'PA', apply: function(p) {
	switch (p) {
	case 'PA':
		r2.cmd('e io.va=false');
		r2.cmd('e io.pava=false');
		break;
	case 'VA':
		r2.cmd('e io.va=true');
		r2.cmd('e io.pava=false');
		break;
	case 'PAVA':
		r2.cmd('e io.pava=true');
		break;
	case 'Debug':
		r2.cmd('e io.va=true');
		r2.cmd('e io.debug=true');
		r2.cmd('e io.pava=false');
		break;
	};
}};
r2Conf[SettingItems.ANAL_HAS_NEXT] = { name: 'analHasNext', defVal: true, apply: function(p) { console.log('analHasNext is ' + p); } };
r2Conf[SettingItems.ANAL_SKIP_NOPS] = { name: 'analSkipNops', defVal: true, apply: function(p) { console.log('analSkipNops is ' + p); } };
r2Conf[SettingItems.ANAL_NON_CODE] = { name: 'analNonCode', defVal: false, apply: function(p) { console.log('analNonCode is ' + p); } };
r2Conf[SettingItems.COLORS] = { name: 'colors', defVal: true, apply: function(p) { inColor = p; r2.cmd('e scr.color=' + p);} };
r2Conf[SettingItems.THEME] = { name: 'theme', defVal: 'none', apply: function(p) { r2.cmd('eco ' + p); } }; // TODO
r2Conf[SettingItems.USE_TTS] = { name: 'tts', defVal: true, apply: () => { } }; // TODO: not a r2Lib conf, should be externalized in an UI settings set

export const r2Settings = new SettingsManager(SettingItems, r2Conf);
