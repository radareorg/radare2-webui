/**
 * Legacy methods, extracted from main JS
 */
function uiTableBegin(cols, domId) {
	console.warn('Usage is deprecated: migrate to Table');
	var out = '';
	var id = domId || '';
	var classes = 'mdl-data-table mdl-js-data-table mdl-data-table--selectable mdl-shadow--2dp';
	out += '<table id="' + id.substr(1) + '" style="margin-left:10px" class="' + classes + '">';
	//out += '<table class="mdl-data-table mdl-js-data-table mdl-data-table--selectable">';

	out += '  <thead> <tr>';

	var type;
	for (var i in cols) {
		var col = cols[i];
		if (col[0] === '+') {
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
	var type = '';
	var out = '<tr>';
	for (var i in cols) {
		var col = cols[i];
		if (!col) {
			continue;
		}
		if (col[0] === '+') {
			col = clickableOffsets(col.substring(1));
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
