// TODO, progressive rewriting from ui.legacy.js

const MARGIN = '3px';

function pictogramInputButton(iconName, name, onclick = null) {
	const button = document.createElement('a');
	button.className = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect';
	button.style.margin = MARGIN;
	const icon = document.createElement('i')
	icon.className = 'material-icons';
	icon.innerHTML = iconName;
	button.appendChild(icon);
	button.appendChild(document.createTextNode(name));
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function inputButton(name, onclick = null) {
	const button = document.createElement('a');
	button.className = 'mdl-button mdl-js-button mdl-button--raised mdl-js-ripple-effect';
	button.style.margin = MARGIN;
	button.textContent = name;
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function imgButton(iconName, title, onclick = null) {
	const button = document.createElement('button');
	button.className = 'mdl-button mdl-js-button mdl-button--fab mdl-js-ripple-effect';
	button.style.margin = MARGIN;
	button.title = title;
	const icon = document.createElement('i')
	icon.className = 'material-icons';
	icon.textContent = iconName;
	button.appendChild(icon);
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

function iconButton(iconName, title, onclick = null) {
	const button = document.createElement('button');
	button.className = 'mdl-button mdl-js-button mdl-button--fab mdl-button--mini-fab mdl-js-ripple-effect';
	button.style.margin = MARGIN;
	button.title = title;
	const icon = document.createElement('i')
	icon.className = 'material-icons md-dark';
	icon.innerHTML = iconName;
	button.appendChild(icon);
	if (onclick !== null) button.addEventListener('click', onclick);
	return button;
}

export const Inputs = {
	button: inputButton,
	imgButton: imgButton,
	iconButton: iconButton,
	pictogramInputButton: pictogramInputButton
};
