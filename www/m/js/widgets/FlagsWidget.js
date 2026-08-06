import {BaseWidget} from './BaseWidget';

import {uiContext} from '../core/UIContext';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';
import {Widgets} from './Widgets';
import {Table} from '../helpers/Table';
import {Inputs} from '../helpers/Inputs';

export class FlagsWidget extends BaseWidget {
	constructor() {
		super('Flags');
	}

	init() {
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

		var toolbar = Inputs.toolbar(
			Inputs.button('Spaces', () => uiContext.navigateTo(Widgets.FLAGS_SPACE)),
			Inputs.button('Delete All', () => {
				if (confirm('Delete all flags?')) {
					r2.cmd('f-*', () => this.draw());
				}
			}));
		c.appendChild(toolbar);

		var content = document.createElement('div');
		c.appendChild(content);

		r2.cmd('fj', (d) => {
			let data = [];
			try {
				data = JSON.parse(d);
			} catch (e) {
				console.error('flags: unexpected output', e);
			}
			var table = new Table(
				['+Address', 'Size', 'Name'],
				[true, true, false],
				'flagsTable',
				null,
				Widgets.HEXDUMP);

			data.map(x => {
				const addr = (typeof x.addr !== 'undefined') ? x.addr : x.offset;
				table.addRow(['0x'+addr.toString(16), x.size, x.name])
			});
			table.insertInto(content, toolbar);
		});

		return c;
	}
}
