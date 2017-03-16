function uiButton(href, label, type) {
	var classes = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	// classes += 'mdl-color--accent mdl-color-text--accent-contrast';
	if (type === 'active') {
		var st = 'style="background-color:#f04040 !important"';
		return '&nbsp;<a href="' + href.replace(/"/g, '\'') + '" class="' + classes + '" ' + st + '>' + label + '</a>';
	}
	return '&nbsp;<a href="' + href.replace(/"/g, '\'') + '" class="' + classes + '">' + label + '</a>';
}

function uiCheckList(grp, id, label) {
	var output = '<li>';
	output += '<label for="' + grp + '" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">';
	output += '<input type="checkbox" id="' + id + '" class="mdl-checkbox__input" />';
	output += '<span class="mdl-checkbox__label">' + label + '</span>';
	output += '</label></li>';

	return output;
}

var comboId = 0;
function uiCombo(d) {
	var funName = 'combo' + (++comboId);
	var fun = funName + ' = function(e) {';
	fun += ' var sel = document.getElementById("opt_' + funName + '");';
	fun += ' var opt = sel.options[sel.selectedIndex].value;';
	fun += ' switch (opt) {';
	for (var a in d) {
		fun += 'case "' + d[a].name + '": ' + d[a].js + '(' + d[a].name + ');break;';
	}
	fun += '}}';
	// CSP violation here
	eval(fun);
	var out = '<select id="opt_' + funName + '" onchange="' + funName + '()">';
	for (var a in d) {
		var def = (d[a].default) ? ' default' : '';
		out += '<option' + def + '>' + d[a].name + '</option>';
	}
	out += '</select>';
	return out;
}

/**
 * Add a switch, with a name "label", define default state by isChecked
 * callbacks are bound when un-checked.
 */
var idSwitch = 0;
function uiSwitch(dom, name, isChecked, onChange) {
	var id = 'switch-' + (++idSwitch);

	var label = document.createElement('label');
	label.className = 'mdl-switch mdl-js-switch mdl-js-ripple-effect';
	label.for = id;
	dom.appendChild(label);

	var input = document.createElement('input');
	input.type = 'checkbox';
	input.className = 'mdl-switch__input';
	input.checked = isChecked;
	input.id = id;
	label.appendChild(input);

	input.addEventListener('change', function(evt) {
		onChange(name, evt.target.checked);
	});

	var span = document.createElement('span');
	span.className = 'mdl-switch__label';
	span.innerHTML = name;
	label.appendChild(span);

	var br = document.createElement('br');
	label.appendChild(br);
}

function uiActionButton(dom, action, label) {
	var button = document.createElement('a');
	button.href = '#';
	button.innerHTML = label;
	button.addEventListener('click', action);
	dom.appendChild(button);

	var classes = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect ';
	classes += 'mdl-color--accent mdl-color-text--accent-contrast';
	button.className = classes;
	button.style.margin = '3px';
}

var selectId = 0;
function uiSelect(dom, name, list, defaultOffset, onChange) {
	var id = 'select-' + (++selectId);

	var div = document.createElement('div');
	div.className = 'mdl-selectfield mdl-js-selectfield mdl-selectfield--floating-label';
	dom.appendChild(div);

	var select = document.createElement('select');
	select.className = 'mdl-selectfield__select';
	select.id = id;
	select.name = id;
	div.appendChild(select);

	for (var i = 0 ; i < list.length ; i++) {
		var option = document.createElement('option');
		option.innerHTML = list[i];
		option.value = list[i];
		select.appendChild(option);
		if (i === defaultOffset) {
			option.selected = true;
		}
	}

	select.addEventListener('change', function(evt) {
		onChange(evt.target.value);
	});

	var label = document.createElement('label');
	label.className = 'mdl-selectfield__label';
	label.for = id;
	label.innerHTML = name;
	div.appendChild(label);
}

// function uiSwitch(d) {
// 	// TODO: not yet done
// 	var out = d;
// 	out += '<label class="mdl-switch mdl-js-switch mdl-js-ripple-effect" for="switch-1">';
// 	out += '<input type="checkbox" id="switch-1" class="mdl-switch__input" checked />';
// 	out += '<span class="mdl-switch__label"></span>';
// 	out += '</label>';
// 	return out;
// }

function uiBlock(d) {
	var classes = 'mdl-card__supporting-text mdl-shadow--2dp mdl-color-text--blue-grey-50 mdl-cell';
	var styles = 'display:inline-block;margin:5px;color:black !important;background-color:white !important';
	var out = '';
	for (var i in d.blocks) {
		var D = d.blocks[i];
		out += '<br />' + D.name + ': ';
		out += uiCombo(D.buttons);
	}
	return out;
}

function uiRoundButton(a, b, c) {
	var out = '';
	out += '<button onclick=' + a + ' class="mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect" ' + c + '>';
	out += '<i class="material-icons" style="opacity:1">' + b + '</i>';
	out += '</button>';
	return out;
}
