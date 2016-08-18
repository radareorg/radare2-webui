/**
 * Handling DataTables with jQuery plugin
 *
 * @param {Array} cols - List of columns, add "+" at beginning to specify a clickable field (seek method)
 * @param {Array} nonum - List of booleans, set true if non-numeric
 * @param {String} id - Id (DOM) of the current table, internal usage for DataTable plugin
 */
function Table(cols, nonum, id) {
	this.cols = cols;
	this.nonum = nonum;
	this.clickableOffset = [];
	this.id = id || false;

	this.init();
}

Table.prototype.init = function() {
	this.root = document.createElement('table');
	this.root.className = 'mdl-data-table mdl-data-table--selectable mdl-shadow--2dp';
	if (this.root.id !== false) {
		this.root.id = this.id;
	}

	this.thead = document.createElement('thead');
	this.root.appendChild(this.thead);
	this.tbody = document.createElement('tbody');
	this.root.appendChild(this.tbody);

	var tr = document.createElement('tr');
	this.thead.appendChild(tr);

	for (var c in this.cols) {
		if (this.cols[c][0] == '+') {
			this.clickableOffset[c] = true;
			this.cols[c] = this.cols[c].substr(1);
		} else {
			this.clickableOffset[c] = false;
		}

		var th = document.createElement('th');
		th.appendChild(document.createTextNode(this.cols[c]));
		if (this.nonum[c]) {
			th.className = 'mdl-data-table__cell--non-numeric';
		}
		tr.appendChild(th);
	}
};

Table.prototype.addRow = function(cells) {
	var tr = document.createElement('tr');
	this.tbody.appendChild(tr);

	for (var i = 0 ; i < cells.length ; i++) {
		var td = document.createElement('td');
		if (this.clickableOffset[i]) {
			td.innerHTML = clickableOffsets(cells[i]);
		} else {
			td.innerHTML = cells[i];
		}
		tr.appendChild(td);
	}
};

Table.prototype.insertInto = function(node) {
	node.appendChild(this.root);
	if (this.id !== false) {
		$('#' + this.id).DataTable();
	}
};


/**
 * Legacy methods, extracted from main JS
 */

function uiTableBegin(cols, id) {
	var out = '';
	var id = id || '';
	console.log(id.substr(1));
	out += '<table id="'+id.substr(1)+'" style="margin-left:10px" class="mdl-data-table mdl-js-data-table mdl-data-table--selectable mdl-shadow--2dp">';
	//out += '<table class="mdl-data-table mdl-js-data-table mdl-data-table--selectable">';

	out += '  <thead> <tr>';

	var type;
	for (var i in cols) {
		var col = cols[i];
		if (col[0] == '+') {
			col = col.substring(1);
			type = '';
		} else {
			type = ' class="mdl-data-table__cell--non-numeric"';
		}
		out += '<th' + type + '>' + col + '</th>';
	}
	out += '</tr> </thead> <tbody>';
	return out;
}

function uiTableRow(cols) {
	var out = '<tr>';
	for (var i in cols) {
		var col = cols[i];
		if (!col) continue;
		if (col[0] == '+') {
			col = clickableOffsets(col.substring(1));
			type = '';
		} else {
			type = ' class="mdl-data-table__cell--non-numeric"';
		}
		out += '<td' + type + '>' + col + '</td>';
	}
	return out + '</tr>';
}

function uiTableEnd() {
	return '</tbody> </table>';
}
