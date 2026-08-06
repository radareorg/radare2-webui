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

		var header = Inputs.toolbar(
			Inputs.button('Refresh', () => {
				statusMessage('Analyzing symbols...');
				r2.cmd('aa', () => {
					statusMessage('done');
					this.draw();
				});
			}));
		c.appendChild(header);

		var content = document.createElement('div');
		c.appendChild(content);

		r2.cmd('icj', function(d) {
			var data = [];
			try {
				data = JSON.parse(d);
			} catch (e) {
				console.error('classes: unexpected output', e);
			}
			var table = new Table(
				['+Address', 'Name', 'Methods'],
				[false, true, false],
				'classesTable',
				null,
				Widgets.DISASSEMBLY);

			data.forEach(x => {
				table.addRow([
					'0x' + (x.addr || 0).toString(16),
					x.classname || x.name,
					(x.methods || []).length
				]);
			});
			table.insertInto(content, header);
		});

		return c;
	}
}
