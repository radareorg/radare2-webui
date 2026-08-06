import {applySeek} from '../helpers/Format';

/**
 * Lightweight sortable/filterable table.
 *
 * @param {Array} cols - List of columns, add "+" at beginning to specify a clickable field (seek method)
 * @param {Array} nonum - List of booleans, set true if non-numeric
	 * @param {String} id - Id (DOM) of the current table
 */
export class Table {
	constructor(cols, nonum, id, onChange, seekNavigation = null) {
		this.cols = cols;
		this.nonum = nonum;
		this.clickableOffset = new Array(cols.length);
		this.clickableOffset.fill(false);
		this.contentEditable = new Array(cols.length);
		this.contentEditable.fill(false);
		this.onChange = onChange;
		this.seekNavigation = seekNavigation;
		this.id = id || false;

		this.init();
	}

	init() {
		this.root = document.createElement('table');
		this.root.className = 'mdl-data-table mdl-data-table--selectable mdl-shadow--2dp';
		if (this.id !== false) {
			this.root.id = this.id;
		}

		this.thead = document.createElement('thead');
		this.root.appendChild(this.thead);
		this.tbody = document.createElement('tbody');
		this.root.appendChild(this.tbody);

		var tr = document.createElement('tr');
		this.thead.appendChild(tr);

		for (var c in this.cols) {
			if (this.cols[c][0] === '+') {
				this.clickableOffset[c] = true;
				this.cols[c] = this.cols[c].substr(1);
			} else if (this.cols[c][0] === '~') {
				this.contentEditable[c] = true;
				this.cols[c] = this.cols[c].substr(1);
			}

			var th = document.createElement('th');
			th.appendChild(document.createTextNode(this.cols[c]));
			if (this.nonum[c]) {
				th.className = 'mdl-data-table__cell--non-numeric';
			}
			tr.appendChild(th);
		}
	}

	getRows() {
		return Array.prototype.slice.call(this.tbody.children);
	}

	addRow(cells) {
		var tr = document.createElement('tr');
		this.tbody.appendChild(tr);

		for (var i = 0; i < cells.length; i++) {
			var td = document.createElement('td');
			if (this.clickableOffset[i]) {
				const a = document.createElement('a');
				a.innerHTML = cells[i];
				td.appendChild(a);
				applySeek(a, cells[i], this.seekNavigation);				
			} else if (typeof cells[i] === 'object') {
				td.appendChild(cells[i]);
			} else {
				td.innerHTML = cells[i];
			}

			if (this.contentEditable[i]) {
				var _this = this;
				td.initVal = td.innerHTML;
				td.contentEditable = true;
				td.busy = false;

				td.addEventListener('blur', function (evt) {
					if (evt.target.busy) {
						return;
					}
					if (evt.target.initVal === evt.target.innerHTML) {
						return;
					}
					evt.target.busy = true;
					_this.onChange(cells, evt.target.innerHTML);
					evt.target.initVal = evt.target.innerHTML;
					evt.target.busy = false;
				});

				td.addEventListener('keydown', function (evt) {
					if (evt.keyCode !== 13 || evt.target.busy) {
						return;
					}
					if (evt.target.initVal === evt.target.innerHTML) {
						return;
					}
					evt.preventDefault();
					evt.target.busy = true;
					_this.onChange(cells, evt.target.innerHTML);
					evt.target.initVal = evt.target.innerHTML;
					evt.target.busy = false;
					evt.target.blur();
				});
			}

			tr.appendChild(td);
		}
		return tr;
	}

	/**
	 * Insert the table into node; when filterParent is provided (usually
	 * a widget toolbar) the filter input is appended there instead.
	 */
	insertInto(node, filterParent = null) {
		if (this.id !== false) {
			const filter = document.createElement('input');
			filter.className = 'table-filter';
			filter.type = 'search';
			filter.placeholder = 'Filter';
			filter.setAttribute('aria-label', 'Filter table');
			filter.addEventListener('input', () => {
				const query = filter.value.toLowerCase();
				for (const row of this.getRows()) {
					row.hidden = !row.textContent.toLowerCase().includes(query);
				}
			});
			(filterParent || node).appendChild(filter);

			for (const [column, heading] of [...this.thead.rows[0].cells].entries()) {
				heading.classList.add('sortable');
				heading.tabIndex = 0;
				let ascending = false;
				const sort = () => {
					ascending = !ascending;
					const numeric = !this.nonum[column];
					const value = row => row.cells[column].textContent.trim();
					const compare = numeric
						? (a, b) => Number(value(a)) - Number(value(b))
						: (a, b) => value(a).localeCompare(value(b));
					this.getRows().sort((a, b) => ascending ? compare(a, b) : compare(b, a))
						.forEach(row => this.tbody.appendChild(row));
					heading.setAttribute('aria-sort', ascending ? 'ascending' : 'descending');
				};
				heading.addEventListener('click', sort);
				heading.addEventListener('keydown', event => {
					if (event.key === 'Enter' || event.key === ' ') sort();
				});
			}
		}
		node.appendChild(this.root);
	}
}
