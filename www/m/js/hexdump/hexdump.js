/**
 * UI management
 * Container should be currently sized for the purpose
 * lineHeight should be specified in pixels
 */
Hexdump.prototype = new RadareInfiniteBlock();
Hexdump.prototype.constructor = Hexdump;
function Hexdump(containerElement, lineHeight, isBigEndian) {
	this.container = new FlexContainer(containerElement, 'hex');
	this.lineHeight = lineHeight;
	this.bigEndian = isBigEndian;
	this.hexLength = this.Sizes.PAIRS;
	this.init();
	this.resetContainer(containerElement);

	this.showFlags = true;
	this.beingSelected = false;
	this.selectionFirst;
	this.selectionEnd;

	this.lastColorUsed = -1;
	this.bgColors = [
		'rgba(255,0,0,0.4)',
		'rgba(0,255,0,0.4)',
		'rgba(0,92,192,0.4)',
		'rgba(255,255,0,0.4)',
		'rgba(255,0,255,0.4)',
		'rgba(0,255,255,0.4)'
	];

	this.flagColorAssociation = [];
}

/**
 * How many screen we want to retrieve in one round-trip with r2
 */
Hexdump.prototype.infineHeightProvisioning = 2;

/**
 * Size in number of bytes to make a word
 */
Hexdump.prototype.Sizes = {
	PAIRS: -1,
	WORD: 4, // 32 bits
	QUADWORD: 8 // 64 bits
};

/**
 * Define the behavior expected when a value is edited
 */
Hexdump.prototype.setOnChangeCallback = function(callback) {
	this.onChangeCallback = callback;
};

/**
 * Fetch and initialize data
 */
Hexdump.prototype.init = function() {
	var _this = this;

	this.refreshInitialOffset();

	r2.cmdj('ecj', function(colors) {
		_this.colors = colors;
	});

	r2.cmdj('ij', function(info) {
		_this.writable = info.core.iorw;
	});

	for (var key in this.colors) {
		this.colors[key] = 'rgb(' + this.colors[key][0] + ',' + this.colors[key][1] + ',' + this.colors[key][2] + ')';;
	}

	this.selectionMode = !this.writable;

	window.addEventListener('mousedown', function(evt) {
		if (evt.button !== 0) {
			return;
		}
		_this.cleanSelection();
	});

	this.drawContextualMenu();
	this.changeWritable();
};

/**
 * Generic definition of isWritable, if not, we are in select mode
 */
Hexdump.prototype.isWritable = function() {
	return this.writable && !this.selectionMode;
};

/**
 * On change on R/W status on document (!= this.isWritable)
 */
Hexdump.prototype.changeWritable = function() {
	var items = Array.prototype.slice.call(document.getElementsByClassName('writableMenu'));
	var opacity = (this.writable) ? 1.0 : 0.5;

	for (var i = 0 ; i < items.length ; i++) {
		items[i].style.opacity = opacity;
	}
};

/**
 * Called when the frame need to be redrawn
 * Reset the container and draw the previous state
 * TODO: save DOM/Events when quitting widget to reload it faster
 */
Hexdump.prototype.resetContainer = function(container) {
	this.refreshInitialOffset();

	if (typeof this.nav !== 'undefined') {
		this.nav.reset();
	}

	this.container.replug(container);

	// TODO: cache, faster
	this.container.reset();

	this.container.drawBody(function(element) {
		element.appendChild(document.createElement('div')); // offsets
		element.appendChild(document.createElement('div')); // hexpairs
		element.appendChild(document.createElement('div')); // ascii
	});
	this.content = this.container.getBody();
	this.defineInfiniteParams();
};

Hexdump.prototype.getCurrentSelection = function() {
	return this.currentSelection;
};

/**
 * Gather data and set event to configure infinite scrolling
 */
Hexdump.prototype.defineInfiniteParams = function() {
	RadareInfiniteBlock.prototype.defineInfiniteParams.call(this);
	this.nav = new HexPairNavigator(this.howManyLines, this.initialOffset);
	this.nav.updateModifications();
};

/**
 * Sequence to draw the whole UI
 */
Hexdump.prototype.draw = function() {
	var _this = this;
	this.drawControls(this.container.getControls());
	this.drawContent(this.container.getBody(), function() {
		_this.colorizeFlag();
	});
};

/**
 * Colorize a byte depending on 00/7f/ff and ASCII
 */
Hexdump.prototype.colorizeByte = function(elem, val) {
	if (val === '00' || val === 'ff' || val == '7f') {
		elem.style.color = this.colors['b0x' + val];
	} else if (isAsciiVisible(parseInt(val, 16))) {
		elem.style.color = 'rgb(192,192,192)';
	} else {
		elem.style.color = 'inherit';
	}
};

/**
 * Return a color on a cyclic way
 */
Hexdump.prototype.pickColor = function() {
	this.lastColorUsed = (this.lastColorUsed + 1) % this.bgColors.length;
	return this.bgColors[this.lastColorUsed];
};

/**
 * Convert a pair to a word considering endian
 */
Hexdump.prototype.pairs2words = function(list, wordLength) {
	if (wordLength === 1) {
		return list;
	}

	var honoringEndian;
	if (this.bigEndian) {
		honoringEndian = function(x, y) {
			return x + y;
		};
	} else {
		honoringEndian = function(x, y) {
			return y + x;
		};
	}

	var newList = [];
	for (var i = 0 ; i < list.length / 2 ; i++) {
		newList.push(
			honoringEndian(
				list[i * 2],
				list[(i * 2) + 1]
			)
		);
	}

	return this.pairs2words(newList, wordLength / 2);
};

/**
 * Delete selection marks from the UI
 */
Hexdump.prototype.cleanSelection = function(previsualization) {
	if (typeof previsualization === 'undefined') {
		previsualization = false;
	}

	if (!previsualization) {
		this.currentSelection = {};
	}

	var elems;
	do {
		elems = this.listContent.getElementsByClassName('selected');
		for (var i = 0 ; i < elems.length ; i++) {
			elems[i].classList.remove('selected');
		}
	} while (elems.length > 0);
};

/**
 * Draw the selection (emulated)
 * Based on sibling
 */
Hexdump.prototype.processSelection = function(isPrev) {
	if (isPrev) {
		this.cleanSelection(true);
	}

	if (this.selectionFirst === this.selectionEnd) {
		this.selectionFirst.classList.add('selected');
		this.currentSelection = {
			from: this.selectionFirst.offset,
			to: this.selectionFirst.offset
		};
	}

	var start = (this.selectionFirst.offset < this.selectionEnd.offset) ? this.selectionFirst : this.selectionEnd;
	var end = (this.selectionFirst.offset < this.selectionEnd.offset) ? this.selectionEnd : this.selectionFirst;

	this.currentSelection = {
		from: start.offset,
		to: end.offset
	};

	var curNode = start;
	var endFound = false;
	while (!endFound) {
		var sibling = curNode;
		curNode.classList.add('selected');

		while (sibling !== null) {
			if (sibling.offset === end.offset) {
				sibling.classList.add('selected');
				curNode = sibling;
				endFound = true;
				return;
			}

			do {
				curNode = sibling;
				sibling = sibling.nextSibling;
			} while (typeof curNode.offset === 'undefined');
			curNode.classList.add('selected');
		}

		var nextLine = curNode.parentNode.parentNode.nextSibling;
		if (nextLine === null) {
			return;
		}

		while (nextLine.children.length <= 1) {
			if (nextLine === null) {
				return;
			}
			nextLine = nextLine.nextSibling;
		}

		curNode = nextLine.children[1].children[0];
	}
};
