import {BaseWidget} from './BaseWidget';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {Inputs} from '../helpers/Inputs';
import {Table} from '../helpers/Table';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class CommentsWidget extends BaseWidget {
	constructor() {
		super('Comments');
	}

	init() {
		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.node.innerHTML = '';
		this.node.appendChild(this.getPanel());
	}

	getPanel() {
		var c = document.createElement('div');

		var header = document.createElement('div');
		header.style.position = 'fixed';
		header.style.margin = '0.5em';
		c.appendChild(header);

		header.appendChild(Inputs.button('Notes', () => uiContext.navigateTo(Widgets.NOTES)));

		var content = document.createElement('div');
		content.style.paddingTop = '70px';
		c.appendChild(content);

		r2.cmd('CC', (d) => {
			var table = new Table(
				['+Offset', '~Comment'],
				[true, false],
				'commentsTable',
				(row, newVal) => {
					var offset = row[0];

					// remove
					r2.cmd('CC- @ ' + offset);

					// add new
					r2.cmd('CCu base64:' + window.btoa(newVal) + ' @ ' + offset);

					this.draw();
				},
				Widgets.HEXDUMP);

			var lines = d.split(/\n/); //clickable offsets (d).split (/\n/);
			for (var i in lines) {
				var line = lines[i].split(/ (.+)?/);
				if (line.length >= 2) {
					table.addRow([line[0], line[1]]);
				}
			}
			table.insertInto(content);
		});

		return c;
	}
}
