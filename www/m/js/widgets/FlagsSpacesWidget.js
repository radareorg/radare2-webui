import {BaseWidget} from './BaseWidget';

import {uiContext} from '../core/UIContext';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';
import {Widgets} from './Widgets';
import {Table} from '../helpers/Table';
import {Inputs} from '../helpers/Inputs';

export class FlagsSpacesWidget extends BaseWidget {
	activeEls = [];
	
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

		r2.cmd('fsj', (d) => {
			const data = JSON.parse(d);
			const table = new Table(
				['+Flags', 'Flagspace'],
				[true, false],
				'flagspaceTable');

			this.activeEls = this.activeEls.filter(e => {
				e.classList.remove(['active']);
				return false;
			});

			data.map( x => {
				const a = document.createElement('a');
				a.textContent = x.name;
				if (x.selected){
					a.classList.add(['active']);
					this.activeEls.push(a);
				}

				a.addEventListener('click', (e) => {
					console.log(x.name, e);
					r2.cmd('fs ' + x.name, (h)=>{
						this.activeEls = this.activeEls.filter(e => {
							e.classList.remove(['active']);
							return false;
						});
						a.classList.add(['active']);
						this.activeEls.push(a);
					});
					this.draw();
				});

				const row = table.addRow([x.count, a]);
				row.addEventListener('click', () => {
					table.getRows().forEach((curRow) => {
						curRow.classList.remove('active');
					});
					row.classList.add('active');
					this.current = x.name;
				});
			});
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
