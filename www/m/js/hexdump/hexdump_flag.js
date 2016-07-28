/**
 * Returns the color associated with the flag
 */
Hexdump.prototype.getFlagColor = function(flagName) {
	for (var i = 0 ; i < this.flagColorAssociation.length ; i++) {
		if (this.flagColorAssociation[i].name === flagName) {
			return this.flagColorAssociation[i].color;
		}
	}

	var color = this.pickColor();
	this.flagColorAssociation.push({
		name: flagName,
		color: color
	});

	return color;
};

/**
 * Draw the flags from the collection of lines (UI POV) currently displayed
 */
Hexdump.prototype.applyFlags = function(lines, blockInitialOffset, flags) {
	if (!this.showFlags) {
		return;
	}

	for (var i in flags) {
		var line;
		var flag = flags[i];

		// We select the first line concerned by the flag
		for (j = 0 ; j < lines.length ; j++) {
			if (lines[j].offset.start <= flag.offset &&
				lines[j].offset.end >= flag.offset) {
				line = lines[j];
				break;
			}
		}

		// If not found, we pick the next flag
		if (typeof line === 'undefined') {
			continue;
		}

		var flagLine = document.createElement('li');
		flagLine.classList.add('block' + blockInitialOffset);
		flagLine.classList.add('flag');
		flagLine.appendChild(document.createTextNode('[0x' + flag.offset.toString(16) + '] ' + flag.name));
		flagLine.title = flag.size + ' bytes';
		flagLine.style.color = this.getFlagColor(flag.name);
		this.listContent.insertBefore(flagLine, line);
	}
};

/**
 * Returns the index of the line who is containing the offset
 */
Hexdump.prototype.indexOfLine_ = function(offset) {
	var list = [].slice.call(this.listContent.children);
	for (var i = 0 ; i < list.length ; i++) {
		if (typeof list[i].offset !== 'undefined' &&
			list[i].offset.start <= offset &&
			list[i].offset.end >= offset) {
			return i;
		}
	}
	return -1;
};

/**
 * Add colorization on the pairs currently displayed
 * based on the length/color of the flags.
 * Small flags are "painted" at the end to ensure
 * better visibility (not masked by wide flags).
 */
Hexdump.prototype.colorizeFlag = function(reset) {
	if (!this.showFlags) {
		return;
	}

	if (typeof reset === 'undefined') {
		reset = false;
	}

	var list = [].slice.call(this.listContent.children);

	if (reset) {
		for (var i = 0 ; i < list.length ; i++) {
			list[i].backgroundColor = 'none';
		}
	}

	var _this = this;

	// Retrieving all flags with length greater than 2 sorted (small at end)
	this.nav.getFlags(2, function(flags) {
		for (var j = 0 ; j < flags.length ; j++) {
			var end = false;
			var initialLine = _this.indexOfLine_(flags[j].start);
			if (initialLine === -1) {
				console.log('Undefined flag offset');
				return;
			}

			var initialByte = flags[j].start - list[initialLine].offset.start;

			// We walk through lines
			for (var i = initialLine ; i < list.length && !end ; i++) {
				// If it's a "flag line" we move on the next
				if (typeof list[i].offset === 'undefined') {
					continue;
				}

				var hexList = list[i].children[1].children;
				for (var x = initialByte ; x < hexList.length ; x++) {
					// If reach the end, we stop here
					if (hexList[x].offset === flags[j].end) {
						end = true;
						break;
					}
					// We color the byte
					hexList[x].style.backgroundColor = _this.getFlagColor(flags[j].name);
				}

				initialByte = 0;
			}
		}
	});
};
