/**
 * Define a container in absolute position
 * Create two area: control + body
 */
function FlexContainer(dom, classes) {
	this.classes = (typeof classes === 'undefined') ? '' : classes;
	this.init(dom);
}

FlexContainer.prototype.replug = function(dom) {
	this.container = dom;
	this.container.innerHTML = '';
	this.container.appendChild(this.controls);
	this.container.appendChild(this.body);
};

FlexContainer.prototype.reset = function() {
	this.init(this.container);
};

FlexContainer.prototype.init = function(dom) {
	this.container = dom;
	this.container.innerHTML = '';

	this.controls = document.createElement('div');
	this.body = document.createElement('div');

	this.controls.className = 'flex flex-controls ' + this.classes;
	this.body.className = 'flex flex-body ' + this.classes;

	this.container.appendChild(this.controls);
	this.container.appendChild(this.body);
};

FlexContainer.prototype.getControls = function() {
	return this.controls;
};

FlexContainer.prototype.drawControls = function(callback) {
	this.controls.innerHTML = '';
	callback(this.controls);
};

FlexContainer.prototype.getBody = function() {
	return this.body;
};

FlexContainer.prototype.drawBody = function(callback) {
	this.body.innerHTML = '';
	callback(this.body);
};

FlexContainer.prototype.pause = function(msg) {
	if (!this.dialogHasBeenDrawn) {
		this.drawEmptyDialog();
	}

	this.textDialog.innerHTML = msg;
	this.dialog.showModal();
};

FlexContainer.prototype.drawEmptyDialog = function() {
	var _this = this;
	this.dialog = document.createElement('dialog');
	this.dialog.className = 'mdl-dialog';

	if (!this.dialog.showModal) {
		dialogPolyfill.registerDialog(this.dialog);
	}

	var content = document.createElement('div');
	content.className = 'mdl-dialog__content';
	this.dialog.appendChild(content);

	var icon = document.createElement('p');
	icon.className = 'mdl-typography--text-center';
	content.appendChild(icon);

	var iIcon = document.createElement('i');
	iIcon.className = 'material-icons';
	iIcon.style.fontSize = '54px';
	iIcon.innerHTML = 'error_outline';
	icon.appendChild(iIcon);

	this.textDialog = document.createElement('p');
	content.appendChild(this.textDialog);

	var actions = document.createElement('div');
	actions.className = 'mdl-dialog__actions';
	this.dialog.appendChild(actions);

	var saveButton = document.createElement('button');
	saveButton.className = 'mdl-button';
	saveButton.innerHTML = 'Cancel';
	saveButton.addEventListener('click', function() {
		_this.dialog.close();
	});
	actions.appendChild(saveButton);

	document.body.appendChild(this.dialog);
	componentHandler.upgradeDom();
};

FlexContainer.prototype.resume = function() {
	this.dialog.close();
};
