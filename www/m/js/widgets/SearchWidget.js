import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';
import {formatOffsets} from '../helpers/Format';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

function searchResults(d) {
	const node = document.getElementById('search_output');
	node.innerHTML = "";
	node.appendChild(formatOffsets(d));
}

export class SearchWidget extends BaseWidget {
	constructor() {
		super('Search');
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
		const c = document.createElement('div');

		const form = document.createElement('input');
		form.id = 'search_input';
		form.className = 'table-filter';
		form.type = 'search';
		form.placeholder = 'Hex pairs, "string" or expression...';
		form.setAttribute('aria-label', 'Search query');
		form.addEventListener('keypress', (e) => this.searchKey(e.keyCode));

		const header = Inputs.toolbar(
			form,
			Inputs.button('Hex', () => this.runSearch()),
			Inputs.button('String', () => this.runSearchString()),
			Inputs.button('Code', () => this.runSearchCode()),
			Inputs.button('ROP', () => this.runSearchROP()),
			Inputs.button('Magic', () => this.runSearchMagic()));
		c.appendChild(header);

		const content = document.createElement('div');
		content.id = 'search_output';
		content.style.margin = '0.5em';
		content.style.color = 'black';
		content.className = 'pre';
		c.appendChild(content);

		return c;
	}

	searchKey(keyCode) {
		if (keyCode === 13) {
			this.runSearch();
		}
	}

	runSearchMagic() {
		r2.cmd('/m', searchResults);
	}

	runSearchCode(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		r2.cmd('"/c ' + text + '"', searchResults);
	}

	runSearchString(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		r2.cmd('/ ' + text, searchResults);
	}

	runSearchROP(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		r2.cmd('"/R ' + text + '"', searchResults);
	}

	runSearch(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		if (text.startsWith('"') && text.endsWith('"')) {
			const a = text.replace(/"/g, '');
			r2.cmd('/ ' + a, searchResults);
		} else {
			r2.cmd('"/x ' + text + '"', searchResults);
		}
	}
}
