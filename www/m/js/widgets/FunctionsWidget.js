import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';
import {Table} from '../helpers/Table';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';
import {Widgets} from '../widgets/Widgets';

export class FunctionsWidget extends BaseWidget {
	constructor() {
		super('Functions');
	}

	init() {
		this.inColor = true; // TODO
		r2.cmd('e scr.utf8=false');

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

		var header = document.createElement('div');
		header.style.position = 'fixed';
		header.style.margin = '0.5em';
		c.appendChild(header);

		header.appendChild(Inputs.button('Symbols', () => {
			statusMessage('Analyzing symbols...');
			r2.cmd('aa', () => {
				statusMessage('done');
				this.draw();
			});
		}));

		header.appendChild(Inputs.button('Calls', () => {
			statusMessage('Analyzing calls...');
			r2.cmd('aac', () => {
				statusMessage('done');
				this.draw();
			});
		}));

		header.appendChild(Inputs.button('Function', () => {
			statusMessage('Analyzing function...');
			r2.cmd('af', () => {
				statusMessage('done');
				this.draw();
			});
		}));

		header.appendChild(Inputs.button('Refs', () => {
			statusMessage('Analyzing references...');
			r2.cmd('aar', () => {
				statusMessage('done');
				this.draw();
			});
		}));

		header.appendChild(Inputs.button('AutoName', () => {
			statusMessage('Analyzing names...');
			r2.cmd('.afna @@ fcn.*', () => {
				statusMessage('done');
				this.draw();
			});
		}));

		var content = document.createElement('div');
		content.style.paddingTop = '70px';
		c.appendChild(content);

		r2.cmd('afl', function(d) {
			var table = new Table(
				['+Address', 'Name', 'Size', 'CC'],
				[false, true, false, false],
				'functionTable',
				null,
				Widgets.DISASSEMBLY);

			var lines = d.split(/\n/); //clickable offsets (d).split (/\n/);
			for (var i in lines) {
				var items = lines[i].match(/^(0x[0-9a-f]+)\s+([0-9]+)\s+([0-9]+(\s+\-&gt;\s+[0-9]+)?)\s+(.+)$/);
				if (items !== null) {
					table.addRow([items[1], items[5], items[2], items[3]]);
				}
			}
			table.insertInto(content);
		});

		return c;
	}
}
