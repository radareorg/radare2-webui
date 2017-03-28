import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';
import {formatOffsets} from '../helpers/Format';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class DebuggerWidget extends BaseWidget {
	constructor() {
		super('Debugger', 'dark');
	}

	init() {
		this.inColor = true; // TODO
		this.nativeDebugger = false;
		r2.cmd('e cfg.debug', (x) => {
			this.nativeDebugger = (x.trim() === 'true');
		});

		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (!this.displayed) {
				return;
			}
			this.draw();
		});
	}

	draw() {
		this.node.innerHTML = '';
		this.node.scrollTop = 0;
		this.node.appendChild(this.getPanel());
	}

	getPanel() {
		var c = document.createElement('div');
		if (this.inColor) {
			c.style.backgroundColor = '#202020';
		}

		var header = document.createElement('div');
		header.style.position = 'fixed';
		header.style.margin = '0.5em';
		c.appendChild(header);

		header.appendChild(Inputs.iconButton('keyboard_arrow_up', 'UP', () => r2.cmd('s--', () => this.draw())));
		header.appendChild(Inputs.iconButton('keyboard_arrow_down', 'DOWN', () => r2.cmd('s++', () => this.draw())));

		header.appendChild(Inputs.button('PC', () => r2.cmd('sr pc', () => this.draw())));
		header.appendChild(Inputs.button('Step', () => r2.cmd(this.nativeDebugger ? 'ds' : 'aes', () => this.draw())));
		header.appendChild(Inputs.button('Cont', () => r2.cmd(this.nativeDebugger ? 'dc' : 'aec', () => this.draw())));
		header.appendChild(Inputs.button('BP', () => r2.cmd('db $$', () => this.draw())));
		header.appendChild(Inputs.button('REG', () => {
			var expr = prompt('register=value');
			if (this.nativeDebugger) {
				r2.cmd('dr ' + expr + ';.dr*', () => this.draw());
			} else {
				r2.cmd('aer ' + expr + ';.ar*', () => this.draw());
			}
		}));

		var content = document.createElement('div');
		content.style.paddingTop = '50px';
		c.appendChild(content);

		// stack
		const rcmd = (this.nativeDebugger) ? 'dr' : 'ar';
		r2.cmd('f cur;.' + rcmd + '*;sr sp;px 64', function(d) {
			const pre = document.createElement('pre');
			pre.style.margin = '10px';
			pre.style.color = 'grey';
			pre.appendChild(formatOffsets(d));
			content.appendChild(pre);			
		});
		r2.cmd(rcmd + '=;s cur;f-cur;pd 128' + (this.inColor ? '|H' : ''), function(d) {
			const pre = document.createElement('pre');
			pre.style.color = 'grey';
			pre.appendChild(formatOffsets(d));
			content.appendChild(pre);	
		});

		return c;
	}
}
