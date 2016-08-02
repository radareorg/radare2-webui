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
