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
		this.node.innerHTML = '';
		this.node.appendChild(this.getPanel());
	}

	getPanel() {
		var c = document.createElement('div');

		c.appendChild(Inputs.toolbar(
			Inputs.iconButton('undo', 'Back to Comments', () => uiContext.navigateTo(Widgets.COMMENTS))));

		var content = document.createElement('div');
		content.style.margin = '0.5em';

		const textarea = document.createElement('textarea');
		textarea.rows = 32;
		textarea.style.width = '100%';
		textarea.style.boxSizing = 'border-box';
		textarea.placeholder = 'Write your notes here, they are saved automatically.';
		textarea.value = localStorage.getItem('notes') || '';
		textarea.addEventListener('input', () => {
			localStorage.setItem('notes', textarea.value);
		});
		content.appendChild(textarea);
		c.appendChild(content);

		return c;
	}
}
