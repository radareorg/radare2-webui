Disasm.prototype = new RadareInfiniteBlock();
Disasm.prototype.constructor = Disasm;
function Disasm(containerElement, lineHeight) {
	this.container = new FlexContainer(containerElement, 'disasm');
	this.lineHeight = lineHeight;
	this.init();
	this.resetContainer(containerElement);
}

/**
 * How many screen we want to retrieve in one round-trip with r2
 */
Disasm.prototype.infineHeightProvisioning = 2;

/**
 * Fetch and initialize data
 */
Disasm.prototype.init = function() {
	var _this = this;

	this.refreshInitialOffset();
	this.drawContextualMenu();
};

Disasm.prototype.resetContainer = function(container) {
	this.refreshInitialOffset();


	if (typeof this.nav !== 'undefined') {
		this.nav.reset();
	}

	this.container.replug(container);

	// TODO: cache, faster
	this.container.reset();

	this.defineInfiniteParams();

	var _this = this;
	this.container.drawBody(function(element) {
		_this.drawContent(element);
	});
};

/**
 * Gather data and set event to configure infinite scrolling
 */
Disasm.prototype.defineInfiniteParams = function() {
	RadareInfiniteBlock.prototype.defineInfiniteParams.call(this);
	this.nav = new DisasmNavigator(this.howManyLines, this.initialOffset);
};

Disasm.prototype.draw = function() {
	this.drawControls(this.container.getControls());
	this.drawContent(this.container.getBody());
};

Disasm.prototype.drawContextualMenu = function() {
	// none
};

Disasm.prototype.drawContent = function(dom, callback) {
	var _this = this;

	this.nav.get(this.Dir.CURRENT, function(chunk) {
		_this.curChunk = chunk;
	});

	this.nav.get(this.Dir.BEFORE, function(chunk) {
		_this.isTopMax = chunk.offset === 0;
		_this.drawChunk(chunk);
		_this.firstElement = _this.drawChunk(_this.getCurChunk());
	});

	this.nav.get(this.Dir.AFTER, function(chunk) {
		_this.drawChunk(chunk);
		_this.container.getBody().scrollTop = 0;
		_this.container.getBody().scrollTop = _this.getFirstElement().getBoundingClientRect().top;

		// Everything has been drawn, maybe we should do something more
		if (typeof callback !== 'undefined') {
			callback();
		}
	});
};

/**
 * Draw a chunk before or after the current content
 */
Disasm.prototype.drawChunk = function(chunk, where) {
	if (where === this.Dir.BEFORE) {
		this.container.getBody().innerHTML = chunk.raw + this.container.getBody().innerHTML;
	} else {
		this.container.getBody().innerHTML += chunk.raw;
	}

	return document.getElementById(chunk.domId);
};

Disasm.prototype.infiniteDrawingContent = function(where, pos, endCallback) {
	var _this = this;
	this.nav.get(where, function(chunk) {
		if (where === _this.Dir.BEFORE) {
			_this.isTopMax = chunk.offset === 0;
		} else {
			if (_this.isTopMax) {
				_this.nav.get(_this.Dir.BEFORE, function(chunk) {
					if (chunk.offset > 0) {
						_this.isTopMax = false;
					}
				});
			}
		}

		if (chunk.offset === 0) {
			return;
		}

		var element = (where === _this.Dir.BEFORE) ? _this.container.getBody().lastChild : _this.container.getBody().firstChild;
		element.parentNode.removeChild(element);

		_this.drawChunk(chunk, where);
		_this.container.getBody().scrollTop = pos;

		endCallback(_this.isTopMax); // pauseScrollEvent = false
	});
};

Disasm.prototype.drawControls = function(dom) {
	dom.innerHTML = 'todo';
};
