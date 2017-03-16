import {BlockNavigator} from '../../core/BlockNavigator';
import {NavigatorDirection} from '../../core/NavigatorDirection';

/**
 * howManyLines = how many lines per chunk
 * Careful at boundaries [0..end]
 */
export class HexPairNavigator extends BlockNavigator {

	constructor(howManyLines, nbCols, startOffset) {
		super();
		this.howManyBytes = howManyLines * 16;
		this.gap = this.howManyBytes;
		this.currentOffset = startOffset;

		// Define a double-linked list to navigate through chunks
		this.curChunk;

		this.providerWorker = new Worker('hexchunkProvider.js');
		this.providerWorker.postMessage({
			howManyBytes: this.howManyBytes,
			nbCols: nbCols
		});

		this.init();
	}

	/**
	 * Force the configuration to be actualized on worker
	 */
	changeNbCols(nbCols) {
		this.providerWorker.postMessage({
			howManyBytes: this.howManyBytes,
			nbCols: nbCols,
			reset: true
		});
		this.reset();
	}

	/**
	 * Telling to r2 that we have a change
	 * It's a one-byte modification so we don't reload and keep track
	 */
	reportChange(offset, value) {
		this.smallModifications.push({
			offset: offset,
			value: value
		});

		r2.cmd('wx ' + value + ' @' + offset, function() {});
	}

	/**
	 * Return if a value has been modified (edit function)
	 */
	hasNewValue(offset) {
		for (var i = 0 ; i < this.smallModifications.length ; i++) {
			if (this.smallModifications[i].offset === offset) {
				return this.smallModifications[i].value;
			}
		}

		return null;
	}

	/**
	 * Retrieve all modifications from r2
	 */
	updateModifications() {
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
	}

	/**
	 * Tell if the byte at the current offset has been modified
	 */
	isModifiedByte(offset) {
		return (this.modifiedBytes.indexOf(offset) > -1);
	}

	/**
	 * Gets all visibles flags
	 */
	getFlags(minSize, callback) {
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

		this.get(NavigatorDirection.CURRENT, function(chunk) {
			flags = flags.concat(chunk.flags);
			actuator();
		});
		this.get(NavigatorDirection.BEFORE, function(chunk) {
			flags = flags.concat(chunk.flags);
			actuator();
		});
		this.get(NavigatorDirection.AFTER, function(chunk) {
			flags = flags.concat(chunk.flags);
			actuator();
		});
	}

	getBytes(range) {
		var bytes;
		r2.cmdj('p8j ' + (range.to - range.from + 1) + ' @' + range.from, function(list) {
			bytes = list;
		});
		return bytes;
	}

	refreshChunk(which, callback) {
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
	}

	refreshCurrent(callback) {
		var pings = 0;
		// We don't care about order
		var actuator = function() {
			pings++;
			if (pings < 3) {
				return;
			}
			callback();
		};

		this.refreshChunk(NavigatorDirection.CURRENT, function() {
			actuator();
		});
		this.refreshChunk(NavigatorDirection.BEFORE, function() {
			actuator();
		});
		this.refreshChunk(NavigatorDirection.AFTER, function() {
			actuator();
		});
	}
}
