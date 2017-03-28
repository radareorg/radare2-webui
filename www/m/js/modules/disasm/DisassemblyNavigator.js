import {BlockNavigator} from '../../core/BlockNavigator';
import {ChunkStatus} from '../../core/ChunkStatus';

// Should refactor with HexPairNav and go/get methods
/**
 * DisasmNavigator
 * Based on non-fixed size of "chunk"
 * will use:
 *	this.navigationData, as dictionnary [offset => {size, callback, data}]
 *	this.navigationOffsets, for all ordered [offset]
 * 	this.currentlyShown, as currently shown [offset]
 */

function line2offset(line) {
	return line * 2;
}

export class DisassemblyNavigator extends BlockNavigator {

	constructor(howManyLines, startOffset) {
		super();

		this.currentOffset = startOffset;
		this.howManyLines = howManyLines;
		this.gap = this.howManyLines * 2;

		this.providerWorker = new Worker('disasmProvider.js');

		this.optimalLines = this.howManyLines * 3;
		this.MINFILL = this.optimalLines * 0.8;

		this.items = [];

		this.init();
	}

	init() {
		super.init()
		this.currentlyShown = [];
		this.populateFirst();
	}

	configureWorker_() {
		var _this = this;
		this.providerWorker.onmessage = function(e) {
			var item;
			for (var i = 0 ; i < _this.items.length ; i++) {
				if (_this.items[i].offset === e.data.offset &&
					_this.items[i].size === e.data.size) {
					item = _this.items[i];
				}
			}

			if (typeof item === 'undefined') {
				console.log('Unable to find origin item');
				return;
			}

			item.data = e.data.data;
			item.status = ChunkStatus.COMPLETED;
			for (var i = 0 ; i < item.callback.length ; i++) {
				item.callback[i](item);
			}
			item.callback = [];
		};
	}

	cleanOldData() {
		for (var i = 0 ; i < this.items.length ; i++) {
			delete this.items[i].data;
			delete this.items[i].status;
		}
	}

	crunchingData(onReadyCallback) {
		var initWorker = new Worker('disasmNavProvider.js');
		var _this = this;

		initWorker.onmessage = function(e) {
			_this.navigationData = e.data;
			_this.navigationOffsets = Object.keys(e.data);
			_this.navigationOffsets.sort();
			initWorker.terminate();
			onReadyCallback();
		};

		initWorker.postMessage(true);
	}

	getOverlappingIntervals(start, end) {
		var intervals = [];
		for (var offset in this.navigationData) {
			var startInterval = offset;
			var endInterval = offset + this.navigationData[offset].size;
			if ((startInterval <= start && endInterval >= end) || // all-incl
				(startInterval <= start && endInterval >= start) || // before-overlap
				(startInterval <= end && endInterval >= end) || // after-overlap
				(startInterval >= start && endInterval <= end)) { // included
				intervals.push(offset);
			}
		}
		return intervals;
	}

	populateFirst() {
		return this.populateFrom(this.currentOffset);
	}

	/**
	 * Create block between [start;end[
	 */
	fillGap(start, end, artifical) {
		var curSize = end - start;
		// FIX, can't cut everywhere: byte alignment (invalid lines)
		return [{offset: start, size: curSize, artifical: artifical}];
		if (curSize > this.howManyLines) {
			var half = Math.round(end / 2);
			return [{
				offset: start,
				size: Math.round(curSize / 2),
				artifical: artifical
			}].concat(this.fillGap(start + Math.round(curSize / 2), end));
		} else {
			return [{
				offset: start,
				size: curSize,
				artifical: artifical
			}];
		}
	}

	populateFrom(offset) {
		// From currentOffset
		// I want at least 80% of 3 screens

		// go up of 1 screen, take first in order

		var fromOffset = offset - line2offset(this.howManyLines);
		var endOffset = fromOffset + (3 * line2offset(this.howManyLines));

		var existingIntervals = this.getOverlappingIntervals(fromOffset, endOffset);

		var requestedIntervals = []; // {offset, size}

		// If they overlap between them, we merge
		for (var i = 0 ; i < existingIntervals.length - 1 ; i++) {
			var endCurrent = existingIntervals[i];
			var startNext = existingIntervals[i + 1];
			if (startNext < endCurrent) {
				if (endNext <= endCurrent) { // inclusive
					requestedIntervals.push({
						offset: existingIntervals[i],
						size: this.navigationData[existingIntervals[i]].size
					});
				} else {
					var endNext = startNext + this.navigationData[startNext].size;
					requestedIntervals.push({
						offset: existingIntervals[i],
						size: endNext - existingIntervals[i]
					});
				}
			}
		}

		if (requestedIntervals.length > 0) {
			// If there is gap before
			if (requestedIntervals[0].offset !== fromOffset) {
				requestedIntervals = requestedIntervals.concat(this.fillGap(fromOffset, requestedIntervals[0].offset));
			}

			// If there is a gap after
			var lastInterval = requestedIntervals[requestedIntervals.length - 1];
			var lastOffsetInterval = (lastInterval.offset + lastInterval.size);
			if (lastOffsetInterval !== endOffset) {
				requestedIntervals = requestedIntervals.concat(this.fillGap(lastOffsetInterval + 1, endOffset));
			}

			// If there is a gap between
			for (var i = 0 ; i < requestedIntervals.length - 1 ; i++) {
				var endCurrent = existingIntervals[i];
				var startNext = existingIntervals[i + 1];

				if (startNext - endCurrent > 1) {
					requestedIntervals = requestedIntervals.concat(this.fillGap(endCurrent + 1, startNext));
				}
			}
		} else {
			requestedIntervals = this.fillGap(fromOffset, endOffset, true);
		}

		this.currentlyShown = requestedIntervals;

		/****
		TODO: check if existing (data field), if not, ask provider
		don't care about total length, but need to find approx. the line requested:
			which interval, starting at? +lineHeight*diff
		*****/
	}

	/**
	 * Returns the current chunks to display
	 * Will be conciliated with offset (key)
	 */
	getShownOffset() {
		return this.currentlyShown;
	}

	getSize(offset) {
		for (var i = 0 ; i < this.currentlyShown.length ; i++) {
			if (this.currentlyShown[i].offset === offset) {
				return this.currentlyShown[i].size;
			}
		}
		return -1;
	}

	getChunkPositionFor(offset) {
		for (var i = 0 ; i < this.currentlyShown.length ; i++) {
			if (offset >= this.currentlyShown[i].offset &&
				offset < this.currentlyShown[i].offset + this.currentlyShown[i].size) {
				return i;
			}
		}

		return -1;
	}

	get(offset, size, callback) {
		// TODO: retrieve data (async) and call
		var item;
		for (var i = 0 ; i < this.items.length ; i++) {
			if (this.items[i].offset === offset &&
				this.items[i].size === size) {
				item = this.items[i];
			}
		}

		if (typeof item === 'undefined') {
			item = {
				offset: offset,
				size: size
			};
			this.items.push(item);
		}

		if (typeof item.data !== 'undefined') {
			return callback(item);
		} else { // Not currently here
			if (typeof item.callback === 'undefined') {
				item.callback = [];
			}
			// Store in callback, could be retrieving or we will start it
			item.callback.push(callback);
			if (item.status !== ChunkStatus.LAUNCHED) { // Need to be retrieved
				item.status = ChunkStatus.LAUNCHED;
				this.providerWorker.postMessage({
					offset: item.offset,
					size: item.size
				});
			}
		}
	}

	go(dir) {
		this.currentOffset += dir * (this.howManyLines * 2);
		this.populateFrom(this.currentOffset);
	}

	refreshCurrentOffset() {
		var _this = this;
		r2.cmd('s', function(offset) {
			_this.currentOffset = parseInt(offset, 16);
		});
	}

	getSeekOffset() {
		return this.currentOffset;
	}

}
