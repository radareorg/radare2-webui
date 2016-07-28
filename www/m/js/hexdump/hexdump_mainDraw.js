/**
 * Helper for dynamic callback at first drawing
 * Allows to place the scroll on current chunk.
 */
Hexdump.prototype.getFirstElement = function() {
	return this.firstElement;
};

/**
 * Helper to delay drawing
 */
Hexdump.prototype.getCurChunk = function() {
	return this.curChunk;
};

/**
 * Draw 3 chunks on specified DOM node
 */
Hexdump.prototype.drawContent = function(dom, callback) {
	dom.innerHTML = '';

	this.listContent = document.createElement('ul');
	dom.appendChild(this.listContent);

	var _this = this;
	this.listContent.addEventListener('contextmenu', function(evt) {
		if (typeof _this.currentSelection === 'undefined' ||
			typeof _this.currentSelection.from === 'undefined' ||
			typeof _this.currentSelection.to === 'undefined') {
			// If undefined, we chose to have one-byte selection
			_this.currentSelection = {
				from: evt.target.offset,
				to: evt.target.offset
			};
		}
		evt.preventDefault();
		var menu = document.getElementById('contextmenu');

		if (_this.contextMenuOpen) {
			menu.classList.remove('active');
		} else {
			menu.classList.add('active');
			menu.style.left = evt.clientX + 'px';
			menu.style.top = evt.clientY + 'px';
		}

		_this.contextMenuOpen = !_this.contextMenuOpen;
	});

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
		_this.content.scrollTop = 0;
		_this.content.scrollTop = _this.getFirstElement().getBoundingClientRect().top;

		// Everything has been drawn, maybe we should do something more
		if (typeof callback !== 'undefined') {
			callback();
		}
	});
};

/**
 * Draw a chunk before or after the current content
 */
Hexdump.prototype.drawChunk = function(chunk, where) {
	if (chunk.offset === 0 && chunk.hex.length === 0) {
		return;
	}

	var _this = this;
	var drawMethod;
	var size;
	if (this.hexLength === -1) {
		drawMethod = this.drawPairs_;
	} else {
		drawMethod = this.drawWords_;
		size = this.hexLength;
	}

	if (typeof where === 'undefined') {
		where = this.Dir.AFTER;
	}

	var lines = [];
	var firstElement;
	var i;
	for (var x = 0 ; x < chunk.hex.length ; x++) {
		var line = document.createElement('li');
		line.className = 'block' + chunk.offset;

		if (where === this.Dir.AFTER) {
			this.listContent.appendChild(line);
			lines.push(line);
			i = x;
		} else {
			this.listContent.insertBefore(line, this.listContent.firstChild);
			lines.unshift(line);
			i = (chunk.hex.length - 1) - x;
		}

		line.offset = {};
		line.offset.start = chunk.offset + (16 * i);
		line.offset.end = line.offset.start + 15;

		var offset = document.createElement('ul');
		var hexpairs = document.createElement('ul');
		var asciis = document.createElement('ul');

		offset.classList.add('offset');

		var offsetEl = document.createElement('li');
		offset.appendChild(offsetEl);
		offsetEl.appendChild(document.createTextNode('0x' + (chunk.offset + (i * 16)).toString(16)));

		offsetEl.assoc = hexpairs;

		offsetEl.addEventListener('dblclick', function(evt) {
			evt.preventDefault();
			_this.selectionFirst = evt.target.parentNode.nextSibling.children[0];
			_this.selectionEnd = evt.target.parentNode.nextSibling.children[15];
			_this.processSelection();
		});

		hexpairs.style.lineHeight = this.lineHeight + 'px';
		hexpairs.classList.add('hexpairs');

		asciis.classList.add('ascii');

		line.appendChild(offset);
		line.appendChild(hexpairs);
		line.appendChild(asciis);

		drawMethod.apply(
			this,
			[hexpairs, asciis, chunk.hex[i], chunk.ascii[i], chunk.modified, chunk.offset + (16 * i), size]
		);

		if (typeof firstElement === 'undefined') {
			firstElement = line;
		}
	}

	this.applyFlags(lines, chunk.offset, chunk.flags);

	return firstElement;
};

/**
 * Trigerred by scrolling, determine and add content at the right place
 */
Hexdump.prototype.infiniteDrawingContent = function(where, pos) {
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

		if (chunk.offset === 0 && chunk.hex.length === 0) {
			return;
		}

		var removing;
		if (where === _this.Dir.BEFORE) {
			removing = _this.listContent.lastChild.className;
		} else {
			removing = _this.listContent.firstChild.className;
		}
		var elements = Array.prototype.slice.call(document.getElementsByClassName(removing));
		for (var i = 0 ; i < elements.length ; i++) {
			elements[i].parentNode.removeChild(elements[i]);
		}

		_this.drawChunk(chunk, where);
		_this.content.scrollTop = pos;
		_this.colorizeFlag(true);

		_this.pauseScrollEvent = false;
	});
};

/**
 * mouse over event to highligh pair-ascii at the same time
 */
Hexdump.prototype.showPairs_ = function(first, second, isOver) {
	if (isOver) {
		first.classList.add('active');
		second.classList.add('active');
	} else {
		first.classList.remove('active');
		second.classList.remove('active');
	}
};

/**
 * Generic method to draw words of any size
 */
Hexdump.prototype.drawWords_ = function(hexpairs, asciis, pairs, chars, modifications, offset, size) {
	var words = this.pairs2words(pairs, size);
	hexpairs.classList.add('words');

	for (var x = 0 ; x < pairs.length ; x++) {
		var asciiEl = document.createElement('li');
		asciiEl.appendChild(document.createTextNode(chars[x]));
		asciis.appendChild(asciiEl);

		this.colorizeByte(asciiEl, pairs[x]);
	}

	for (var x = 0 ; x < words.length ; x++) {
		var hexpairEl = document.createElement('li');
		hexpairEl.appendChild(document.createTextNode('0x' + words[x]));
		hexpairs.appendChild(hexpairEl);
	}
};

/**
 * Default drawing method to draw the pairs with all features
 */
Hexdump.prototype.drawPairs_ = function(hexpairs, asciis, pairs, chars, modifications, offset) {
	hexpairs.classList.add('pairs');
	var _this = this;

	var editableHexEvent = {
		keydown: function(evt) {
			if (evt.keyCode === 13) {
				collectHexpair(evt.target);
			}
		},
		blur: function(evt) {
			collectHexpair(evt.target);
		}
	};

	var editableAsciiEvent = {
		keydown: function(evt) {
			if (evt.keyCode === 13) {
				collectAscii(evt.target);
			}
		},
		blur: function(evt) {
			collectAscii(evt.target);
		}
	};

	var collectHexpair = function(target) {
		if (target.busy) {
			return; // Event has been already triggered elsewhere
		}
		// Don't need to set to false, in each case we remove the node
		target.busy = true;

		// Keep the first 2 valid hex characters
		var regex = target.value.match(/$([a-fA-F0-9]{2})^/);
		if (regex === null) {
			if (typeof target.parentNode === 'undefined') {
				// Solving event conflict
				return;
			}
			alert('Wrong format, expected: [a-fA-F0-9]{2}');
			target.parentNode.innerHTML = target.initValue;
			return;
		}

		var value = regex[0];
		target = target.parentNode;
		var initial = _this.nav.reportChange(target.offset, value);

		target.innerHTML = value;
		target.assoc.innerHTML = hexPairToASCII(value);
		if (initial !== null) {
			target.classList.add('modified');
			target.assoc.classList.add('modified');
			_this.colorizeByte(target, value);
			_this.colorizeByte(target.assoc, value);
			_this.onChangeCallback(target.offset, initial, value);
		}

		target.removeEventListener('keydown', editableHexEvent.keydown);
		target.removeEventListener('blur', editableHexEvent.blur);
	};

	var collectAscii = function(target) {
		var value = target.value[0];
		var hex = ASCIIToHexpair(value);
		target = target.parentNode;
		var initial = _this.nav.reportChange(target.assoc.offset, hex);

		target.innerHTML = value;
		target.assoc.innerHTML = hex;
		if (initial !== null) {
			target.classList.add('modified');
			target.assoc.classList.add('modified');
			_this.colorizeByte(target, value);
			_this.colorizeByte(target.assoc, value);
			_this.onChangeCallback(target.assoc.offset, target.assoc.innerHTML, hex);
		}

		target.removeEventListener('keydown', editableAsciiEvent.keydown);
		target.removeEventListener('blur', editableAsciiEvent.blur);
	};

	for (var x = 0 ; x < pairs.length ; x++) {
		var curOffset = offset + x;

		// If there is a one-byte modification (UI not refresh)
		var checkModification = this.nav.hasNewValue(curOffset);
		// If there is a modification known by r2
		var isModified = this.nav.isModifiedByte(curOffset);
		// If it's a small modification, we update content
		if (checkModification !== null) {
			pairs[x] = checkModification;
			chars[x] = hexPairToASCII(checkModification);
			isModified = true;
		}

		var hexpairEl = document.createElement('li');
		hexpairEl.appendChild(document.createTextNode(pairs[x]));
		hexpairEl.offset = curOffset;
		if (isModified) {
			hexpairEl.classList.add('modified');
		}

		var asciiEl = document.createElement('li');
		asciiEl.appendChild(document.createTextNode(chars[x]));
		if (isModified) {
			asciiEl.classList.add('modified');
		}

		asciiEl.assoc = hexpairEl;
		hexpairEl.assoc = asciiEl;

		hexpairs.appendChild(hexpairEl);
		asciis.appendChild(asciiEl);

		this.colorizeByte(hexpairEl, pairs[x]);
		this.colorizeByte(asciiEl, pairs[x]);

		hexpairEl.addEventListener('mouseenter', function(evt) {
			_this.showPairs_(evt.target, evt.target.assoc, true);
		});

		hexpairEl.addEventListener('mouseleave', function(evt) {
			_this.showPairs_(evt.target, evt.target.assoc, false);
		});

		asciiEl.addEventListener('mouseenter', function(evt) {
			_this.showPairs_(evt.target, evt.target.assoc, true);
		});

		asciiEl.addEventListener('mouseleave', function(evt) {
			_this.showPairs_(evt.target, evt.target.assoc, false);
		});

		if (this.isWritable()) {
			hexpairEl.addEventListener('click', function(evt) {
				if (evt.button !== 0) {
					return;
				}
				evt.preventDefault();
				var form = document.createElement('input');
				form.maxLength = 2;
				form.initValue = evt.target.innerHTML;
				form.value = evt.target.innerHTML;
				form.pattern = '[a-fA-F0-9]{2}';
				evt.target.innerHTML = '';
				evt.target.appendChild(form);
				form.busy = false; // Race-flag
				form.addEventListener('keydown', editableHexEvent.keydown);
				form.addEventListener('blur', editableHexEvent.blur);
				form.focus();
			});

			asciiEl.addEventListener('click', function(evt) {
				if (evt.button !== 0) {
					return;
				}
				evt.preventDefault();
				var form = document.createElement('input');
				form.maxLength = 1;
				form.value = evt.target.innerHTML;
				form.pattern = '(.){1}';
				evt.target.innerHTML = '';
				evt.target.appendChild(form);
				form.addEventListener('keydown', editableAsciiEvent.keydown);
				form.addEventListener('blur', editableAsciiEvent.blur);
				form.focus();
			});
		} else {
			hexpairEl.addEventListener('click', function() {
				_this.beingSelected = false;
				_this.cleanSelection();
			});

			hexpairEl.addEventListener('mousedown', function(evt) {
				if (evt.button !== 0) {
					return;
				}
				evt.preventDefault();
				_this.beingSelected = true;
				_this.selectionFirst = evt.target;
			});

			hexpairEl.addEventListener('mouseover', function(evt) {
				if (!_this.beingSelected) {
					return;
				}
				_this.selectionEnd = evt.target;
				_this.processSelection(true);
			});

			hexpairEl.addEventListener('mouseup', function(evt) {
				if (!_this.beingSelected) {
					return;
				}
				_this.selectionEnd = evt.target;
				_this.processSelection(false);
				_this.beingSelected = false;
			});
		}
	}
};
