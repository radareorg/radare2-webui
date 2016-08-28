Disasm.prototype = new RadareInfiniteBlock();
Disasm.prototype.constructor = Disasm;
function Disasm(containerElement, lineHeight) {
	this.container = new FlexContainer(containerElement, 'disasm');
	this.lineHeight = lineHeight;
	this.refreshInitialOffset();
	this.init();

	this.offsetHistory = ['0x' + this.initialOffset.toString(16)];
	this.indexOffsetHistory = 0;

	var _this = this;
	seekAction.registerLocalAction('Disassembly', function(offset) {
		var gap = (_this.offsetHistory.length - 1) - _this.indexOffsetHistory;
		for (var i = 0 ; i < gap ; i++) {
			_this.offsetHistory.pop();
		}
		_this.offsetHistory.push(offset);
		_this.indexOffsetHistory = _this.offsetHistory.length - 1;
		_this.drawControls(_this.container.getControls());
	});
}

/**
 * How many screen we want to retrieve in one round-trip with r2
 */
Disasm.prototype.infineHeightProvisioning = 3;

/**
 * Fetch and initialize data
 */
Disasm.prototype.init = function() {
	var _this = this;

	this.drawContextualMenu();
	this.drawAnalysisDialog();
	// 5% (default is 20%) : dynamic sized content, re-drawn
	this.defineInfiniteParams(0.05);

	this.container.pause('Crunching some data...');
	this.nav.crunchingData(function() {
		_this.container.resume();
	});
};

Disasm.prototype.resetContainer = function(container) {
	// TODO: cache, faster
	this.container.replug(container);
	this.container.reset();
	this.refreshInitialOffset();
	this.defineInfiniteParams(0.05);
};

/**
 * Gather data and set event to configure infinite scrolling
 */
Disasm.prototype.defineInfiniteParams = function(trigger) {
	RadareInfiniteBlock.prototype.defineInfiniteParams.call(this, trigger);
	this.nav = new DisasmNavigator(this.howManyLines, this.initialOffset);
};

Disasm.prototype.draw = function(callback) {
	var _this = this;
	this.drawControls(this.container.getControls());
	this.container.drawBody(function(element) {
		_this.drawContent(element, function() {
			_this.replaceScrollPosition(_this.nav.currentOffset);
			if (typeof callback !== 'undefined') {
				callback();
			}
		});
	});
};


/**
 * Will trigger analysis from checked analysis method
 * of the analysis dialog (<=> analysisMethod by offset)
 */
Disasm.prototype.processChosenAnalysis = function(endCallback) {
	for (var i = 0 ; i < this.analysisMethods.length ; i++) {
		this.analysisMethods[i].action(this.analysisMethods[i].active);
	}

	/* TODO, adapt to overview panel context
		updateFortune();
		updateInfo();
		updateEntropy();
	*/

	// Reprocessing
	this.nav.crunchingData(function() {
		// After, we refresh the current display
		this.draw(endCallback);
	});
};

Disasm.prototype.drawAnalysisDialog = function() {
	this.analysisMethods = [{
		name: 'Analyze symbols',
		ugly: 'symbols',
		active: false,
		action: function(active) {
			if (!active) {
				return;
			}
			r2.cmd('aa');
		}
	},{
		name: 'Analyse calls',
		ugly: 'calls',
		active: false,
		action: function(active) {
			if (active) {
				r2.cmd('e anal.calls=true;aac');
			} else {
				r2.cmd('e anal.calls=false');
			}
		}
	},{
		name: 'Emulate code',
		ugly: 'code',
		active: false,
		action: function(active) {
			if (active) {
				r2.cmd('e asm.emu=1;aae;e asm.emu=0');
			} else {
				r2.cmd('e asm.emu=false');
			}
		}
	},{
		name: 'Find preludes',
		ugly: 'preludes',
		active: false,
		action: function(active) {
			if (!active) {
				return;
			}
			r2.cmd('aap');
		}
	},{
		name: 'Autoname functions',
		ugly: 'fcts',
		active: false,
		action: function(active) {
			if (!active) {
				return;
			}
			r2.cmd('aan');
		}
	}];

	var _this = this;
	this.analysisDialog = document.createElement('dialog');
	this.analysisDialog.className = 'mdl-dialog';

	if (!this.analysisDialog.showModal) {
		dialogPolyfill.registerDialog(this.analysisDialog);
	}

	var content = document.createElement('div');
	content.className = 'mdl-dialog__content';
	this.analysisDialog.appendChild(content);

	var title = document.createElement('p');
	title.appendChild(document.createTextNode('Pick some analysis method'));
	title.className = 'mdl-typography--text-center';
	content.appendChild(title);

	var methods = document.createElement('ul');
	methods.className = 'mdl-card__supporting-text';
	this.analysisDialog.appendChild(methods);

	for (var i = 0 ; i < this.analysisMethods.length ; i++) {
		var li = document.createElement('li');
		methods.appendChild(li);

		var wrappingLabel = document.createElement('label');
		wrappingLabel.for = this.analysisMethods[i].ugly;
		wrappingLabel.className = 'mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect';
		li.appendChild(wrappingLabel);

		var input = document.createElement('input');
		input.type = 'checkbox';
		input.offset = i;
		input.id = this.analysisMethods[i].ugly;
		input.checked = this.analysisMethods[i].active;
		input.className = 'mdl-checkbox__input';
		wrappingLabel.appendChild(input);

		input.addEventListener('change', function(evt) {
			_this.analysisMethods[evt.target.offset].active = evt.target.checked;
		});

		var name = document.createElement('span');
		name.className = 'mdl-checkbox__label';
		name.appendChild(document.createTextNode(this.analysisMethods[i].name));
		wrappingLabel.appendChild(name);
	}

	var actions = document.createElement('div');
	actions.className = 'mdl-dialog__actions';
	this.analysisDialog.appendChild(actions);

	var closeButton = document.createElement('button');
	closeButton.className = 'mdl-button';
	closeButton.innerHTML = 'Close';
	closeButton.addEventListener('click', function() {
		_this.analysisDialog.close();
	});
	actions.appendChild(closeButton);

	var proceedButton = document.createElement('button');
	proceedButton.className = 'mdl-button';
	proceedButton.innerHTML = 'Proceed';
	proceedButton.addEventListener('click', function() {
		_this.processChosenAnalysis(function() {
			_this.analysisDialog.close();
		});
	});
	actions.appendChild(proceedButton);

	document.body.appendChild(this.analysisDialog);
	componentHandler.upgradeDom();
};

Disasm.prototype.extractOffset_ = function(str) {
	return parseInt(str.slice(5));
};

Disasm.prototype.getCurrentOffset = function() {
	return this.currentOffset;
};

Disasm.prototype.oncontextmenu = function(evt, offset) {
	this.refreshContextMenu(offset);
	var menu = document.getElementById('contextmenuDisasm');
	evt.preventDefault();

	if (this.contextMenuOpen) {
		menu.classList.remove('active');
	} else {
		this.currentOffset = offset;
		menu.classList.add('active');
		menu.style.left = evt.clientX + 'px';
		menu.style.top = evt.clientY + 'px';
	}

	this.contextMenuOpen = !this.contextMenuOpen;
};

Disasm.prototype.onfctmenu = function(evt, fct) {
	evt.preventDefault();

	var offset;
	r2.cmd('?v ' + fct, function(hex) {
		offset = hex;
	});

	var newName = prompt('Rename?', fct);
	if (newName === null || newName === '') {
		return;
	}

	r2.cmd('fr ' + newName + '@ ' + offset);
};

Disasm.prototype.onvarmenu = function(evt, varName) {
	evt.preventDefault();

	var newName = prompt('Rename?', varName);
	if (newName === null || newName === '') {
		return;
	}

	r2.cmd('afvn ' + varName + ' ' + newName);
};

Disasm.prototype.refreshContextMenu = function(offset) {
	// check with aoj first, if 'val' field exists: open
	var isUndefined;
	r2.cmdj('aoj @' + offset, function(info) {
		isUndefined = typeof info[0].val === 'undefined';
	});

	this.drawContextualMenu(!isUndefined);
};

Disasm.prototype.getPresentBlock = function() {
	var blocks = [];
	var bodyChildren = this.container.getBody();
	for (var i = 0 ; i < bodyChildren.length ; i++) {
		blocks.push(this.extractOffset_(bodyChildren[i].className));
	}
	return blocks;
};

Disasm.prototype.drawContent = function(dom, callback) {
	var _this = this;

	var list = this.nav.getShownOffset();
	isTopMax = (list[0] === 0);

	// If we are already at top
	if (this.isTopMax && isTopMax) {
		return;
	} else {
		this.isTopMax = isTopMax;
	}

	// reset container
	this.container.getBody().innerHTML = '';

	for (var i = 0 ; i < list.length ; i++) {
		var domAnchor = document.createElement('span');
		this.container.getBody().appendChild(domAnchor);
		this.nav.get(list[i].offset, list[i].size, function(anchor, last) {
			return function(chunk) {
				_this.drawChunk(chunk, anchor);

				if (last && typeof callback !== 'undefined') {
					callback();
				}
			};
		}(domAnchor, (i === list.length - 1)));
	}
};

/**
 * Draw a chunk before or after the current content
 */
Disasm.prototype.drawChunk = function(chunk, domAnchor) {
	domAnchor.innerHTML = chunk.data;
	var pre = domAnchor.children[0];
	var spans = pre.children;
	var _this = this;
	for (var i = 0 ; i < spans.length; i++) {
		if (spans[i].tagName === 'SPAN') {
			if (spans[i].className.indexOf('offset') !== -1) {
				spans[i].addEventListener('contextmenu', function(id) {
					return function(evt) {
						return _this.oncontextmenu(evt, id);
					};
				}(spans[i].id));
			} else if (spans[i].className.indexOf('fcn') !== -1) {
				spans[i].addEventListener('contextmenu', function(id) {
					return function(evt) {
						return _this.onfctmenu(evt, id);
					};
				}(spans[i].id));
			} else if (spans[i].className.indexOf('var') !== -1) {
				spans[i].addEventListener('contextmenu', function(id) {
					return function(evt) {
						return _this.onvarmenu(evt, id);
					};
				}(spans[i].id));
			}
		}
	}

	// Highligh current offset (seek)
	var curElem = document.getElementById(this.nav.getSeekOffset());
	if (curElem !== null) {
		curElem.classList.add('currentOffset');
	}

	return document.getElementById(domAnchor);
};

Disasm.prototype.infiniteDrawingContent = function(where, pos, endCallback) {
	var _this = this;
	var firstVisibleOffset = this.firstVisibleOffset();
	this.drawContent(this.container.getBody(), function() {
		_this.replaceScrollPosition(firstVisibleOffset);
		endCallback();
	}); // TODO Add stop scroll
};

Disasm.prototype.drawControls = function(dom) {
	var out = uiRoundButton('javascript:disasm.nav.go(-1);disasm.draw();', 'keyboard_arrow_up');
	out += uiRoundButton('javascript:disasm.nav.go(1);disasm.draw();', 'keyboard_arrow_down');
	out += '&nbsp;';
	out += uiButton('javascript:analyze()', 'ANLZ');
	out += uiButton('javascript:comment()', 'CMNT');
	out += uiButton('javascript:info()', 'Info');
	out += uiButton('javascript:rename()', 'RNME');
	out += uiButton('javascript:write()', 'Wrte');

	out += uiButton('javascript:disasm.openAnalysisDialog()', 'Process analysis');
	out += '<ul id="disasm-history"></ul>';

	dom.innerHTML = out;

	this.history = document.getElementById('disasm-history');
	this.drawHistory(this.history);
};

Disasm.prototype.drawHistory = function(dom) {
	var canGoBefore = (this.indexOffsetHistory > 0);
	var canGoAfter = (this.indexOffsetHistory < this.offsetHistory.length - 1);

	var _this = this;
	dom.innerHTML = '';
	for (var i = 0 ; i < this.offsetHistory.length ; i++) {
		var isCurrent = (i === this.indexOffsetHistory);

		var li = document.createElement('li');
		li.className = (isCurrent) ? 'active' : '';
		li.i = i;
		li.x = this.offsetHistory[i];
		li.appendChild(document.createTextNode(this.offsetHistory[i]));
		li.addEventListener('click', function(evt) {
			var x = evt.target.x;
			// Global does not trigger the callback for specific widget
			seekAction.applyGlobal(x.toString());
			_this.indexOffsetHistory = evt.target.i;
			_this.drawControls(_this.container.getControls());
		});

		dom.appendChild(li);
	}

	var li = document.createElement('li');
	li.title = 'Seek();';
	li.appendChild(document.createTextNode('?'));
	li.addEventListener('click', function() {
		seek();
	});
	dom.appendChild(li);
};

Disasm.prototype.openAnalysisDialog = function() {
	this.analysisDialog.showModal();
};

/**
 * We want to know the first offset currently visible at the moment
 * when the user ask for more data by scrolling
 */
Disasm.prototype.firstVisibleOffset = function() {
	// Part of the container already scrolled
	var hiddenContainerPart = this.container.getBody().scrollTop;
	if (hiddenContainerPart === 0) {
		return;
	}

	// We want to isolate the chunk that it's visible on the first line visible
	var curSum = 0;
	var elements = this.container.getBody().children;
	var selectedChunk = elements[0];
	for (var i = 1 ; i < elements.length ; i++) {
		var height = elements[i].getBoundingClientRect().height;
		curSum += height;
		// When the current container start in the visible zone
		// we know it's occurs in the previous, we abort here
		if (curSum > hiddenContainerPart) {
			// We restore the previous value, we need it
			curSum -= height;
			break;
		}
		selectedChunk = elements[i];
	}

	// Then, we want to guess approximately which offset was that line
	var visibleSpace = curSum - hiddenContainerPart;
	var hiddenSpace = selectedChunk.getBoundingClientRect().height - visibleSpace;

	var offsetRelatedToThatChunk = this.extractOffset_(selectedChunk.children[0].id);

	var guessedOffset = offsetRelatedToThatChunk + Math.ceil(hiddenSpace / this.lineHeight);

	return guessedOffset;
};

/**
 * We know the last approx. visible offset from firstVisibleOffset
 * we want to adjust the current view to set this same offset on
 * a near position.
 */
Disasm.prototype.replaceScrollPosition = function(offset) {
	//console.log(offset.toString(16));
	if (typeof offset === 'undefined') {
		return;
	}

	// We select the chunk where the offset belongs
	var position = this.nav.getChunkPositionFor(offset);
	if (position === -1) {
		console.log('Chunk position from offset not found');
		return;
	}

	var chunk = this.container.getBody().children[position];
	var blockOffset = this.extractOffset_(chunk.children[0].id);
	var startFromTop = chunk.offsetTop;
	var chunkHeight = chunk.getBoundingClientRect().height;

	var progression = (offset - blockOffset) / this.nav.getSize(blockOffset);
	var adjustment = Math.floor(progression * chunkHeight);
	var requiredScroll = startFromTop + adjustment;

	this.container.getBody().scrollTop = requiredScroll;
};
