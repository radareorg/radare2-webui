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
		if (this.inColor) {
			c.style.backgroundColor = '#202020';
		}

		var header = document.createElement('div');
		header.style.position = 'fixed';
		header.style.margin = '0.5em';
		c.appendChild(header);


		header.appendChild(Inputs.button('Spaces', () => uiContext.navigateTo(Widgets.FLAGS_SPACE)));
		header.appendChild(Inputs.button('Delete All', () => r2.cmd('f-*', () => this.draw())));

		var content = document.createElement('div');
		content.style.paddingTop = '50px';
		c.appendChild(content);

		r2.cmd('fj', function(d) {
			let data = JSON.parse(d);
			var table = new Table(
				['+Offset', 'Size', 'Name'],
				[true, true, false],
				'flagsTable',
				null,
				Widgets.HEXDUMP);

			data.map(x => {
				table.addRow(['0x'+x.offset.toString(16), x.size, x.name])
				//table.addRow(Object.values(x))
			});
			table.insertInto(content);
		});

		return c;
	}
}
