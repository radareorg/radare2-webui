import {BaseWidget} from './BaseWidget';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {Inputs} from '../helpers/Inputs';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class ScriptWidget extends BaseWidget {
	constructor() {
		super('Script');
	}

	init() {
		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.toggleFoo = '';
		this.node.appendChild(this.getPanel());
	}

	getPanel() {
		var c = document.createElement('div');

		c.appendChild(Inputs.button('Run', () => this.runScript()));
		c.appendChild(Inputs.button('Indent', () => this.indentScript()));
		c.appendChild(Inputs.button('Output', () => this.toggleScriptOutput()));
		// c.appendChild(Inputs.button('Console', () => uiContext.navigateTo(Widgets.CONSOLE)));

		c.appendChild(document.createElement('br'));

		const textarea = document.createElement('textarea');
		textarea.id = 'script';
		textarea.className = 'pre';
		textarea.style.width = '100%';
		c.appendChild(textarea);

		c.appendChild(document.createElement('br'));

		const output = document.createElement('div');
		output.id = 'scriptOutput';
		output.className = 'output';
		c.appendChild(output);
		
		var localScript = localStorage.getItem('script');
		if (!localScript) {
			localScript = 'r2.cmd("?V", log);';
		}
		textarea.value = localScript;

		return c;
	}

	toggleScriptOutput() {
		var o = document.getElementById('scriptOutput');
		if (o) {
			if (this.toggleFoo === '') {
				this.toggleFoo = o.innerHTML;
				o.innerHTML = '';
			} else {
				o.innerHTML = this.toggleFoo;
				this.toggleFoo = '';
			}
		}
	}

	indentScript() {
		var str = document.getElementById('script').value;
		var indented = /* NOT DEFINED js_beautify*/ (str);
		document.getElementById('script').value = indented;
		localStorage.script = indented;
	}

	runScript() {
		var str = document.getElementById('script').value;
		localStorage.script = str;
		document.getElementById('scriptOutput').innerHTML = '';
		try {
			var msg = '"use strict";' +
			'function log(x) { var a = ' +
			'document.getElementById(\'scriptOutput\'); ' +
			'if (a) a.innerHTML += x + \'\\n\'; }\n';
			// CSP violation here
			eval(msg + str);
		} catch (e) {
			alert(e);
		}
	}
}
