import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {formatOffsets} from '../helpers/Format';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class DisassemblyDecompileWidget extends BaseWidget {
	constructor() {
		super('Decompile', 'dark');
	}

	init() {
		this.decompilers = ['pdc'];
		this.currentDecompiler = 'pdc';
		this.listFetched = false;

		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.node.innerHTML = '';

		if (this.listFetched) {
			this.drawPanel();
		} else {
			// Available decompilers, same list as `e cmd.pdc=?` (pdc is builtin)
			r2.cmd('e cmd.pdc=?', (d) => {
				const list = d.trim().split(/\n/).map(x => x.trim()).filter(x => x.length > 0);
				if (list.length > 0) {
					this.decompilers = list.includes('pdc') ? list : ['pdc'].concat(list);
				}
				this.listFetched = true;
				this.drawPanel();
			});
		}
	}

	drawPanel() {
		const toolbar = Inputs.toolbar(
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)),
			Inputs.select('Decompiler', this.decompilers, (choice) => {
				this.currentDecompiler = choice;
				this.refreshOutput();
			}, this.currentDecompiler));

		this.output = document.createElement('pre');
		this.output.style.margin = '0.5em';

		this.node.appendChild(toolbar);
		this.node.appendChild(this.output);
		this.refreshOutput();
	}

	refreshOutput() {
		this.output.innerHTML = 'Decompiling...';
		r2.cmd('e cmd.pdc=' + this.currentDecompiler, () => {
			r2.cmd('pdc|H', (d) => {
				this.output.innerHTML = '';
				if (d.trim().length === 0) {
					this.drawEmptyHint();
				} else {
					this.output.appendChild(formatOffsets(d));
				}
			});
		});
	}

	/** No output usually means there is no function analyzed here */
	drawEmptyHint() {
		const hint = document.createElement('div');
		const msg = document.createElement('p');
		msg.textContent = 'Nothing to decompile at the current offset. Analyzing the function may help.';
		hint.appendChild(msg);
		hint.appendChild(Inputs.button('Analyze function', () => {
			r2.cmd('af', () => this.refreshOutput());
		}));
		this.output.appendChild(hint);
	}
}
