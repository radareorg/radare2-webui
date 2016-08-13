function ActionListener(fct) {
	this.cmd = fct;
	this.actions = {};
};

ActionListener.prototype.registerLocalAction = function(widgetName, callback) {
	this.actions[widgetName] = callback;
};

ActionListener.prototype.applyGlobal = function(args) {
	this.cmd(args);
};

ActionListener.prototype.apply = function(args) {
	this.applyGlobal(args);
	if (typeof args !== 'undefined') {
		var currentlyDrawn = widgetContainer.getCurrentlyDrawn();
		for (var i = 0 ; i < currentlyDrawn.length ; i++) {
			var localAction = this.actions[currentlyDrawn[i]];
			if (typeof localAction !== 'undefined') {
				localAction(args);
			}
		}
	}
};
