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

		var toolbar = Inputs.toolbar(
			Inputs.button('Notes', () => uiContext.navigateTo(Widgets.NOTES)));
		c.appendChild(toolbar);

		var content = document.createElement('div');
		c.appendChild(content);

		r2.cmd('CC', (d) => {
			var table = new Table(
				['+Address', '~Comment'],
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
				Widgets.DISASSEMBLY);

			var lines = d.split(/\n/); //clickable offsets (d).split (/\n/);
			for (var i in lines) {
				var line = lines[i].split(/ (.+)?/);
				if (line.length >= 2) {
					table.addRow([line[0], line[1]]);
				}
			}
			table.insertInto(content, toolbar);
		});

		return c;
	}
}
