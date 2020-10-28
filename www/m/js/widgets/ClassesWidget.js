import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';
import {Table} from '../helpers/Table';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';
import {Widgets} from '../widgets/Widgets';

export class ClassesWidget extends BaseWidget {
	constructor() {
		super('Classes');
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

		header.appendChild(Inputs.button('Refresh', () => {
			statusMessage('Analyzing symbols...');
			r2.cmd('aa', () => {
				statusMessage('done');
				this.draw();
			});
		}));

		var content = document.createElement('div');
		content.style.paddingTop = '70px';
		c.appendChild(content);

		r2.cmd('ic', function(d) {
			var table = new Table(
				['+Address', 'Type', 'Name'],
				[false, true, false],
				'classesTable',
				null,
				Widgets.CLASSES);

			var lines = d.split(/\n/); //clickable offsets (d).split (/\n/);
			for (var i in lines) {
				var items = lines[i].match(/^(0x[0-9a-f]+)\s+([0-9]+)\s+([0-9]+(\s+\-&gt;\s+[0-9]+)?)\s+(.+)$/);
				if (items !== null) {
					table.addRow([items[1], items[5], items[2]]);
				}
			}
			table.insertInto(content);
		});

		return c;
	}
}
