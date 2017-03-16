import {BaseWidget} from './BaseWidget';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {Inputs} from '../helpers/Inputs';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class NotesWidget extends BaseWidget {
	constructor() {
		super('Notes');
	}

	init() {
		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.node.appendChild(this.getPanel());
	}

	getPanel() {
		var c = document.createElement('div');

		var header = document.createElement('div');
		header.style.position = 'fixed';
		header.style.margin = '0.5em';
		c.appendChild(header);

		header.appendChild(Inputs.iconButton('undo', 'Back to Comments', () => uiContext.navigateTo(Widgets.COMMENTS)));

		var content = document.createElement('div');
		content.style.paddingTop = '70px';
		content.innerHTML = '<textarea rows=32 style="width:100%;height:100%"></textarea>';
		c.appendChild(content);

		return c;
	}
}
