// TODO, progressive rewriting from ui.legacy.js

const MARGIN = '3px';

function pictogramInputButton(iconName, name, onclick = null) {
	const button = document.createElement('a');
	button.className = 'mdl-button mdl-js-button mdl-button--raised';
	button.style.margin = MARGIN;
	const icon = document.createElement('i')
	icon.className = 'material-icons mi-' + iconName;
	button.appendChild(icon);
	button.appendChild(document.createTextNode(name));
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function inputButton(name, onclick = null) {
	const button = document.createElement('a');
	button.className = 'mdl-button mdl-js-button mdl-button--raised';
	button.style.margin = MARGIN;
	button.textContent = name;
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function imgButton(iconName, title, onclick = null) {
	const button = document.createElement('button');
	button.className = 'mdl-button mdl-js-button mdl-button--fab';
	button.style.margin = MARGIN;
	button.title = title;
	const icon = document.createElement('i')
	icon.className = 'material-icons mi-' + iconName;
	button.appendChild(icon);
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function iconButton(iconName, title, onclick = null) {
	const button = document.createElement('button');
	button.className = 'mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab';
	button.style.margin = MARGIN;
	button.title = title;
	const icon = document.createElement('i')
	icon.className = 'material-icons md-dark mi-' + iconName;
	button.appendChild(icon);
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function selectInput(title, options, onchange = null, selected = null) {
	const select = document.createElement('select');
	select.className = 'widget-select';
	select.title = title;
	select.setAttribute('aria-label', title);
	for (const option of options) {
		const node = document.createElement('option');
		node.value = option;
		node.textContent = option;
		if (option === selected) node.selected = true;
		select.appendChild(node);
	}
	if (onchange !== null) select.addEventListener('change', () => onchange(select.value));
	return select;
}

function toolbar(...children) {
	const bar = document.createElement('div');
	bar.className = 'widget-toolbar';
	for (const child of children) bar.appendChild(child);
	return bar;
}

export const Inputs = {
	button: inputButton,
	imgButton: imgButton,
	iconButton: iconButton,
	pictogramInputButton: pictogramInputButton,
	select: selectInput,
	toolbar: toolbar
};
