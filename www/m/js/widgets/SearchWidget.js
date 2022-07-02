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
		this.node.appendChild(this.getPanel());
	}

	getPanel() {
		const c = document.createElement('div');
		var header = document.createElement('div');
		header.style.margin = '0.5em';
		c.appendChild(header);

		const form = document.createElement('input');
		form.id = 'search_input';
		form.className = 'mdl-card--expand mdl-textfield__input';
		form.style.backgroundColor = 'white';
		form.style.paddingLeft = '10px';
		form.style.top = '3.5em';
		form.style.height = '1.8em';
		form.addEventListener('keypress', (e) => this.searchKey(e.keyCode));

		header.appendChild(form);
		header.appendChild(document.createElement('br'));

		header.appendChild(Inputs.button('Hex', () => this.runSearch()));
		header.appendChild(Inputs.button('String', () => this.runSearchString()));
		header.appendChild(Inputs.button('Code', () => this.runSearchCode()));
		header.appendChild(Inputs.button('ROP', () => this.runSearchROP()));
		header.appendChild(Inputs.button('Magic', () => this.runSearchMagic()));

		const content = document.createElement('div');
		content.id = 'search_output';
		content.style.paddingTop = '50px';
		content.style.color = 'black';
		content.className = 'pre';
		c.appendChild(content);

		return c;
	}

	searchKey(keyCode) {
		var inp = document.getElementById('search_input');
		if (keyCode === 13) {
			this.runSearch(inp.value);
			inp.value = '';
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
