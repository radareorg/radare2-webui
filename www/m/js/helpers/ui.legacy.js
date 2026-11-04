/**
 * Add a switch, with a name "label", define default state by isChecked
 * callbacks are bound when un-checked.
 */
var idSwitch = 0;
function uiSwitch(dom, name, isChecked, onChange) {
	var id = 'switch-' + (++idSwitch);

	var label = document.createElement('label');
	label.className = 'mdl-switch mdl-js-switch';
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

	var classes = 'mdl-button mdl-js-button mdl-button--raised ';
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
		option.textContent = list[i];
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
