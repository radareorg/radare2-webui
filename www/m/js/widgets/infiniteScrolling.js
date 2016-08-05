/**
 * domTarget must have a "measurable" height
 * limit, when there is less than {limit}% available to scroll
 * we call the associated event
 */
function InfiniteScrolling(domTarget, howManyScreens, limit) {
	// TOD check properties

	this.domTarget = domTarget;
	this.limit = limit;
	this.howManyScreens = howManyScreens;
	this.screenProportion = 1.0 / this.howManyScreens;
	this.pauseScrollEvent = false;
	this.prevScroll = 0.;

	var _this = this;
	this.domTarget.addEventListener('scroll', function(e) {
		_this.scrollEvent_(e);
	});
}

InfiniteScrolling.prototype.setTopEvent = function(fct) {
	this.ontop = fct;
};

InfiniteScrolling.prototype.setBottomEvent = function(fct) {
	this.onbottom = fct;
};

InfiniteScrolling.prototype.scrollEvent_ = function(e) {
	var _this = this;
	if (this.pauseScrollEvent) {
		return;
	}

	var height = e.target.scrollHeight - e.target.offsetHeight;
	var p = e.target.scrollTop  / height;

	if (!this.isTopMax && p < this.limit && this.prevScroll > p) {
		this.pauseScrollEvent = true;
		var pos = Math.floor(((this.limit + (p - this.limit)) + this.screenProportion) * height);
		this.ontop(pos, function(isTopMax) {
			_this.pauseScrollEvent = false;
		});
	}

	if (p > (1 - this.limit) && this.prevScroll < p) {
		this.pauseScrollEvent = true;
		var pos = Math.floor((((1 - this.limit) + (p - (1 - this.limit))) - this.screenProportion) * height);
		this.onbottom(pos, function(isTopMax) {
			_this.pauseScrollEvent = false;
		});
	}

	this.prevScroll = p;
};
