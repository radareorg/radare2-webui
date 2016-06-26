function UpdateManager() {
	this.updateMethods = [{}, {}];
	this.currentFocus = undefined;
};

UpdateManager.prototype.registerMethod = function(offset, method) {
	this.updateMethods[offset] = method;
};

UpdateManager.prototype.focusHasChanged = function(offset) {
	this.currentFocus = offset;
};

UpdateManager.prototype.apply = function() {
	if (typeof this.currentFocus === 'undefined') {
		return;
	}
	this.updateMethods[this.currentFocus]();
};
