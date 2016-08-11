function RadareInfiniteBlock() {

}

/**
 * Define where we should process
 */
RadareInfiniteBlock.prototype.Dir = {
	BEFORE: -1,
	CURRENT: 0,
	AFTER: 1
};

/**
 * Helper to delay drawing
 */
RadareInfiniteBlock.prototype.getCurChunk = function() {
	return this.curChunk;
};

/**
 * Helper for dynamic callback at first drawing
 * Allows to place the scroll on current chunk.
 */
RadareInfiniteBlock.prototype.getFirstElement = function() {
	return this.firstElement;
};

/**
 * Load the *new* initial offset from the "s" value
 */
RadareInfiniteBlock.prototype.refreshInitialOffset = function() {
	var _this = this;
	r2.cmd('s', function(offset) {
		_this.initialOffset = parseInt(offset, 16);
	});
};

/**
 * Gather data and set event to configure infinite scrolling
 */
RadareInfiniteBlock.prototype.defineInfiniteParams = function(trigger) {
	var height = (this.container.getBody().offsetHeight === 0) ? 800 : this.container.getBody().offsetHeight;
	this.howManyLines = Math.floor((height / this.lineHeight) * this.infineHeightProvisioning);

	var infiniteScrolling = new InfiniteScrolling(
		this.container.getBody(),
		3, /* before, current, after */
		(typeof trigger !== 'undefined') ? trigger : 0.20 /* when there less than 1/5 visible */
	);

	var _this = this;
	infiniteScrolling.setTopEvent(function(pos, endCallback) {
		_this.nav.go(_this.nav.Dir.BEFORE);
		_this.infiniteDrawingContent(_this.Dir.BEFORE, pos, endCallback);
	});

	infiniteScrolling.setBottomEvent(function(pos, endCallback) {
		_this.nav.go(_this.nav.Dir.AFTER);
		_this.infiniteDrawingContent(_this.Dir.AFTER, pos, endCallback);
	});
};
