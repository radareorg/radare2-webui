/**
 * howManyLines = how many lines per chunk
 * Careful at boundaries [0..end]
 */
function HexPairNavigator(howManyLines, startOffset) {
	this.howManyBytes = howManyLines * 16;
	this.currentOffset = startOffset;

	// Define a double-linked list to navigate through chunks
	this.curChunk = undefined;

	this.providerWorker = new Worker('hexchunkProvider.js');
	this.providerWorker.postMessage(this.howManyBytes);

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

HexPairNavigator.prototype.Dir = {
	BEFORE: -1,
	CURRENT: 0,
	AFTER: 1
};

HexPairNavigator.prototype.Status = {
	LAUNCHED: 0,
	COMPLETED: 1
};

HexPairNavigator.prototype.reset = function() {
	this.curChunk = undefined;
};

HexPairNavigator.prototype.get = function(which, callback, force) {
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
				offset: this.currentOffset + (which * this.howManyBytes),
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

HexPairNavigator.prototype.go = function(where) {
	var goNext = (where === this.Dir.AFTER);
	var dir = (goNext) ? 'next' : 'prev';
	var howMany = this.howManyBytes;

	if (typeof this.curChunk[dir] !== 'undefined') {
		this.curChunk = this.curChunk[dir];
		this.currentOffset = this.curChunk.data.offset;
		// Should check (or not?) for negative offset
	} else {
		this.currentOffset = this.currentOffset + where * this.howManyBytes;
		if (this.currentOffset < 0) {
			this.currentOffset = 0;
		}

		var req = {
			dir: where,
			offset: this.currentOffset,
			status: this.Status.LAUNCHED,
			callback: []
		};

		var newChunk = {
			data: req,
			prev: (goNext) ? this.curChunk : undefined,
			next: (!goNext) ? this.curChunk : undefined
		};

		this.curChunk[dir] = newChunk;
		this.curChunk = newChunk;

		this.providerWorker.postMessage(req);
	}

	// We anticipate one
	/*
	if (typeof this.curChunk[dir] === 'undefined') {
		var offset = this.currentOffset + where * this.howManyBytes;
		if (offset < 0) {
			offset = 0;
		}

		var req = {
			dir: where,
			offset: offset,
			status: this.Status.LAUNCHED
		};

		var newChunk = {
			data: req,
			prev: (goNext) ? this.curChunk : undefined,
			next: (!goNext) ? this.curChunk : undefined
		};

		this.curChunk[dir] = newChunk;
		this.curChunk = newChunk;

		this.providerWorker.postMessage(req);
	}*/
};

/**
 * Telling to r2 that we have a change
 * It's a one-byte modification so we don't reload and keep track
 */
HexPairNavigator.prototype.reportChange = function(offset, value) {
	this.smallModifications.push({
		offset: offset,
		value: value
	});

	r2.cmd('wx ' + value + ' @' + offset, function() {});
};

/**
 * Return if a value has been modified (edit function)
 */
HexPairNavigator.prototype.hasNewValue = function(offset) {
	for (var i = 0 ; i < this.smallModifications.length ; i++) {
		if (this.smallModifications[i].offset === offset) {
			return this.smallModifications[i].value;
		}
	}

	return null;
};

/**
 * Retrieve all modifications from r2
 */
HexPairNavigator.prototype.updateModifications = function() {
	var _this = this;
	this.smallModifications = [];
	this.modifiedBytes = [];
	r2.cmd('wcj', function(d) {
		var d = JSON.parse(d);
		for (var i = 0 ; i < d.length ; i++) {
			var offset = d[i].addr;
			for (var x = 0 ; x < d[i].size ; x++) {
				_this.modifiedBytes.push(offset + x);
			}
		}
	});
};

/**
 * Tell if the byte at the current offset has been modified
 */
HexPairNavigator.prototype.isModifiedByte = function(offset) {
	return (this.modifiedBytes.indexOf(offset) > -1);
};

/**
 * Gets all visibles flags
 */
HexPairNavigator.prototype.getFlags = function(minSize, callback) {
	var filter = function(flags) {
		var filteredFlags = [];
		for (var i = 0 ; i < flags.length ; i++) {
			if (flags[i].size >= minSize) {
				filteredFlags.push({
					name: flags[i].name,
					start: flags[i].offset,
					end: flags[i].offset + flags[i].size
				});
			}
		}

		// We want the biggest first
		filteredFlags.sort(function(a, b) {
			return (a.size > b.size) ? -1 : 1;
		});
		return filteredFlags;
	};

	var flags = [];
	var pings = 0;

	// We don't care about order
	var actuator = function() {
		pings++;
		if (pings < 3) {
			return;
		}
		callback(filter(flags));
	};

	this.get(this.Dir.CURRENT, function(chunk) {
		flags = flags.concat(chunk.flags);
		actuator();
	});
	this.get(this.Dir.BEFORE, function(chunk) {
		flags = flags.concat(chunk.flags);
		actuator();
	});
	this.get(this.Dir.AFTER, function(chunk) {
		flags = flags.concat(chunk.flags);
		actuator();
	});
};

HexPairNavigator.prototype.isInside_ = function(chunk, offset) {
	var start = chunk.offset;
	var end = start + this.howManyBytes;
	return (start <= offset && end >= offset);
};

HexPairNavigator.prototype.getBytes = function(range) {
	var bytes;
	r2.cmdj('p8j ' + (range.to - range.from + 1) + ' @' + range.from, function(list) {
		bytes = list;
	});
	return bytes;
};

HexPairNavigator.prototype.refreshChunk = function(which, callback) {
	var modifications = [];
	var _this = this;
	this.get(which, function(chunk) {
		chunk.callback = [];
		modifications = chunk.modified;

		_this.get(which, function(newChunk) {
			newChunk.modified.concat(modifications);
			callback(newChunk);
		}, true);
	});
};

HexPairNavigator.prototype.refreshCurrent = function(callback) {
	var pings = 0;
	// We don't care about order
	var actuator = function() {
		pings++;
		if (pings < 3) {
			return;
		}
		callback();
	};

	this.refreshChunk(this.Dir.CURRENT, function() {
		actuator();
	});
	this.refreshChunk(this.Dir.BEFORE, function() {
		actuator();
	});
	this.refreshChunk(this.Dir.AFTER, function() {
		actuator();
	});
};
