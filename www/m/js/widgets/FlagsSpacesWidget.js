import {BaseWidget} from './BaseWidget';

import {uiContext} from '../core/UIContext';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';
import {Widgets} from './Widgets';
import {Table} from '../helpers/Table';
import {Inputs} from '../helpers/Inputs';

export class FlagsSpacesWidget extends BaseWidget {
	constructor() {
		super('Flag Spaces');
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
		this.current = null;
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

		header.appendChild(Inputs.iconButton('undo', 'Back to flags', () => uiContext.navigateTo(Widgets.FLAGS)));
		header.appendChild(Inputs.button('Deselect', () => { this.current = null; r2.cmd('fs *', () => this.draw()); } ));
		header.appendChild(Inputs.button('Add', () => this.setFlagspace()));
		header.appendChild(Inputs.button('Delete', () => this.delFlagspace()));
		header.appendChild(Inputs.button('Rename', () => this.renameFlagspace()));

		var content = document.createElement('div');
		content.appendChild(document.createTextNode('Click on a row to select it.'));
		content.style.paddingTop = '70px';
		c.appendChild(content);

		r2.cmd('fs', (d) => {
			const table = new Table(
				['+Flags', 'Flagspace'],
				[true, false],
				'flagspaceTable');

			var lines = d.split(/\n/);
			for (var i in lines) {
				var line = lines[i].split(/ +/);
				if (line.length >= 4) {
					const content = line[3];
					const selected = line[2].indexOf('.') === -1;
					const a = document.createElement('a');
					a.innerHTML = content;
					if (selected) a.style.color = 'red';

					a.addEventListener('click', () => {
						r2.cmd('fs ' + content);
						this.draw();
					});

					const row = table.addRow([line[1], a]);
					row.addEventListener('click', () => {
						table.getRows().forEach((curRow) => {
							curRow.classList.remove('active');
						});
						row.classList.add('active');
						this.current = content;
					})
				}
			}

			table.insertInto(content);
		});

		return c;
	}

	setFlagspace() {
		let fs = this.current;
		if (!fs) {
			fs = prompt('name');
		}
		if (!fs) {
			return;
		}
		r2.cmd('fs ' + fs, () => {
			this.draw();
		});
	}

	renameFlagspace() {
		let fs = this.current;
		if (!fs) {
			fs = prompt('name');
		}
		if (!fs) {
			return;
		}
		r2.cmd('fsr ' + fs, () => {
			this.draw();
		});
	}


	delFlagspace() {
		let fs = this.current;
		if (!fs) {
			fs = '.';
		}
		if (!fs) {
			return;
		}
		r2.cmd('fs-' + fs, () => {
			this.draw();
		});
	}
}
