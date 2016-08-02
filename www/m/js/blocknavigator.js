function BlockNavigator() {

}

BlockNavigator.prototype.Dir = {
	BEFORE: -1,
	CURRENT: 0,
	AFTER: 1
};

BlockNavigator.prototype.Status = {
	LAUNCHED: 0,
	COMPLETED: 1
};

BlockNavigator.prototype.init = function() {
	if (typeof this.providerWorker === 'undefined') {
		console.log('provider worker should be defined');
		return;
	}

	this.configureWorker_();
};

BlockNavigator.prototype.configureWorker_ = function() {
	var _this = this;
	this.providerWorker.onmessage = function(e) {
		if (e.data.dir === _this.Dir.CURRENT) {
			if (typeof _this.curChunk.data.callback !== 'undefined') {
				for (var i = 0 ; i < _this.curChunk.data.callback.length ; i++) {
					_this.curChunk.data.callback[i](e.data);
				}
			}
			_this.curChunk.data = e.data;
			_this.curChunk.data.status = _this.Status.COMPLETED;
		} else {
			var dir = (e.data.dir === _this.Dir.BEFORE) ? 'prev' : 'next';

			var item = _this.curChunk;
			while (typeof item[dir] !== 'undefined') {
				item = item[dir];
				if (item.data.offset === e.data.offset) {
					break;
				}
			}

			if (item === _this.curChunk) {
				console.log('Error, history corrupted');
				return;
			}

			if (typeof item.data.callback !== 'undefined') {
				for (var i = 0 ; i < item.data.callback.length ; i++) {
					item.data.callback[i](e.data);
				}
			}

			item.data = e.data;
			item.data.status = _this.Status.COMPLETED;
		}
	};
};

BlockNavigator.prototype.reset = function() {
	this.curChunk = undefined;
};

BlockNavigator.prototype.go = function(where) {
	var goNext = (where === this.Dir.AFTER);
	var dir = (goNext) ? 'next' : 'prev';
	var howMany = this.gap;

	if (typeof this.curChunk[dir] !== 'undefined') {
		this.curChunk = this.curChunk[dir];
		this.currentOffset = this.curChunk.data.offset;
		// Should check (or not?) for negative offset
	} else {
		this.currentOffset = this.currentOffset + where * this.gap;

		var req = {
			dir: where,
			offset: this.currentOffset,
			status: this.Status.LAUNCHED,
			callback: []
		};

		if (this.currentOffset < 0) {
			req.substract = this.currentOffset * -1;
			req.offset = 0;
			this.currentOffset = 0;
		}

		var newChunk = {
			data: req,
			prev: (goNext) ? this.curChunk : undefined,
			next: (!goNext) ? this.curChunk : undefined
		};

		this.curChunk[dir] = newChunk;
		this.curChunk = newChunk;

		this.providerWorker.postMessage(req);
	}
};

BlockNavigator.prototype.get = function(which, callback, force) {
	var dir = (which === this.Dir.BEFORE) ? 'prev' : 'next';

	var item;
	if (which === this.Dir.CURRENT) {
		item = this.curChunk;
	} else {
		if (typeof this.curChunk === 'undefined') {
			item = undefined;
		} else {
			item = this.curChunk[dir];
		}
	}

	// If there is a miss (when we start)
	if (typeof item === 'undefined') {
		if (which === this.Dir.CURRENT) {
			req = {
				dir: this.Dir.CURRENT,
				offset: this.currentOffset,
				status: this.Status.LAUNCHED,
				callback: []
			};
			this.curChunk = {
				data: req,
				prev: undefined,
				next: undefined
			};
			item = this.curChunk;
			this.providerWorker.postMessage(req);
		} else {
			req = {
				dir: which,
				offset: this.currentOffset + (which * this.gap),
				status: this.Status.LAUNCHED,
				callback: []
			};
			this.curChunk[dir] = {
				data: req,
				prev: (which === this.Dir.AFTER) ? this.curChunk : undefined,
				next: (which === this.Dir.BEFORE) ? this.curChunk : undefined
			};
			item = this.curChunk[dir];
			this.providerWorker.postMessage(req);
		}
	} else if (force === true) {
		item.data.status = this.Status.LAUNCHED;
		this.providerWorker.postMessage(item.data);
	}

	// We infer the data is here
	if (item.data.status !== this.Status.LAUNCHED) {
		return callback(item.data);
	} else { // Data isn't here, we deffer our callback
		if (typeof item.data.callback === 'undefined') {
			item.data.callback = [];
		}
		item.data.callback.push(callback);
		return;
	}
};

BlockNavigator.prototype.isInside_ = function(chunk, offset) {
	var start = chunk.offset;
	var end = start + this.gap;
	return (start <= offset && end >= offset);
};
