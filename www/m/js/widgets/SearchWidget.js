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
		const cmd = r2Quoted('/c ' + text);
		if (cmd === null) {
			return r2Invalid('search');
		}
		r2.cmd(cmd, searchResults);
	}

	runSearchString(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		if (text) {
			r2.cmd('/x ' + r2StrToHex(text), searchResults);
		}
	}

	runSearchROP(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		const cmd = r2Quoted('/R ' + text);
		if (cmd === null) {
			return r2Invalid('search');
		}
		r2.cmd(cmd, searchResults);
	}

	runSearch(text) {
		if (!text) {
			text = document.getElementById('search_input').value;
		}
		if (text.length > 1 && text.startsWith('"') && text.endsWith('"')) {
			r2.cmd('/x ' + r2StrToHex(text.slice(1, -1)), searchResults);
		} else {
			const hex = r2Hex(text);
			if (hex === null) {
				return r2Invalid('hexpairs');
			}
			r2.cmd('/x ' + hex, searchResults);
		}
	}
}
