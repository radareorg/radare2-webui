import {DisassemblyNavigator} from './DisassemblyNavigator';
import {RadareInfiniteBlock} from '../../layout/RadareInfiniteBlock';
import {FlexContainer} from '../../layout/FlexContainer';

import {uiContext} from '../../core/UIContext';
import {Widgets} from '../../widgets/Widgets';
import {Inputs} from '../../helpers/Inputs';
import {applySeek, formatOffset} from '../../helpers/Format';
import {r2Wrapper} from '../../core/R2Wrapper';

export class Disassembly extends RadareInfiniteBlock {

	constructor(containerElement, lineHeight) {
		super();
		this.container = new FlexContainer(containerElement, 'disasm');
		this.lineHeight = lineHeight;
		this.init();

	}

	init() {
		var _this = this;
		this.refreshInitialOffset();

		this.drawContextualMenu();
		this.drawAnalysisDialog();
		// 5% (default is 20%) : dynamic sized content, re-drawn
		this.defineInfiniteParams(0.05);

		this.container.pause('Crunching some data...');
		this.nav.crunchingData(function() {
			_this.container.resume();
		});

		this.indexOffsetHistory = 0;
		this.offsetHistory = [];
		this.onSeek();
	}

	/** Trigger when widget is displayed and seek is called */
	onSeek() {
		const currentOffset = (typeof this.initialOffset === 'number') ? int2fixedHex(this.initialOffset, 8) : this.initialOffset;

		if (currentOffset === this.offsetHistory[this.offsetHistory.length - 1]) {
			this.indexOffsetHistory = this.offsetHistory.length - 1;
			this.drawControls(this.container.getControls());
			return;
		}

		const indexOffset = this.offsetHistory.indexOf(currentOffset);
		if (~indexOffset) { // offset is already in the history
			this.indexOffsetHistory = indexOffset;
			this.drawControls(this.container.getControls());
			return;
		} 
		
		// Previous offset is set before last element of history
		// FIRST CALL
		const previousOffset = this.offsetHistory[this.offsetHistory.length - 1];
		if (this.indexOffsetHistory < this.offsetHistory.length - 1) {
			// We keep only first part
			this.offsetHistory = this.offsetHistory.slice(0, this.indexOffsetHistory + 1);
		}

		this.offsetHistory.push(currentOffset);
		this.indexOffsetHistory = this.offsetHistory.length - 1;
		this.drawControls(this.container.getControls());
	}

	resetContainer(container) {
		// TODO: cache, faster
		this.container.replug(container);
		this.container.reset();
		this.refreshInitialOffset();
		this.defineInfiniteParams(0.05);
	}

	/**
	 * Gather data and set event to configure infinite scrolling
	 */
	defineInfiniteParams(trigger) {
		super.defineInfiniteParams(trigger);
		this.nav = new DisassemblyNavigator(this.howManyLines, this.initialOffset);
	}

	draw(callback) {
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
	}


	/**
	 * Will trigger analysis from checked analysis method
	 * of the analysis dialog (<=> analysisMethod by offset)
	 */
	processChosenAnalysis(endCallback) {
		for (var i = 0 ; i < this.analysisMethods.length ; i++) {
			this.analysisMethods[i].action(this.analysisMethods[i].active);
		}

		/* TODO, adapt to overview panel context
			updateFortune();
			updateInfo();
			updateEntropy();
		*/

		// Reprocessing
		var _this = this;
		this.nav.crunchingData(function() {
			// After, we refresh the current display
			_this.draw(endCallback);
		});
	}

	drawAnalysisDialog() {
		this.analysisMethods = [{
			name: 'Analyse current offset',
			ugly: 'curoffset',
			active: true,
			action: function(active) {
				if (!active) {
					return;
				}
				r2.cmd('af');
			}
		},{
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
			name: 'Analyse reference',
			ugly: 'ref',
			active: false,
			action: function(active) {
				if (!active) {
					return;
				}
				r2.cmd('aar');
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

		var title = document.createElement('h6');
		title.appendChild(document.createTextNode('Analysis...'));
		title.className = 'mdl-dialog__title';
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

		var proceedButton = document.createElement('button');
		proceedButton.className = 'mdl-button';
		proceedButton.innerHTML = 'Proceed';
		proceedButton.addEventListener('click', function() {
			_this.processChosenAnalysis(function() {
				_this.analysisDialog.close();
			});
		});
		actions.appendChild(proceedButton);

		var closeButton = document.createElement('button');
		closeButton.className = 'mdl-button';
		closeButton.innerHTML = 'Close';
		closeButton.addEventListener('click', function() {
			_this.analysisDialog.close();
		});
		actions.appendChild(closeButton);

		document.body.appendChild(this.analysisDialog);
		componentHandler.upgradeDom();
	}

	extractOffset_(str) {
		return parseInt(str.slice(5));
	}

	getCurrentOffset() {
		return this.currentOffset;
	}

	oncontextmenu(evt, offset) {
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
	}

	onfctmenu(evt, fct) {
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
	}

	onvarmenu(evt, varName) {
		evt.preventDefault();

		var newName = prompt('Rename?', varName);
		if (newName === null || newName === '') {
			return;
		}

		r2.cmd('afvn ' + varName + ' ' + newName);
	}

	refreshContextMenu(offset) {
		// check with aoj first, if 'val' field exists: open
		var isUndefined;
		r2.cmdj('aoj @' + offset, function(info) {
			isUndefined = typeof info[0].val === 'undefined';
		});

		this.drawContextualMenu(!isUndefined);
	}

	getPresentBlock() {
		var blocks = [];
		var bodyChildren = this.container.getBody();
		for (var i = 0 ; i < bodyChildren.length ; i++) {
			blocks.push(this.extractOffset_(bodyChildren[i].className));
		}
		return blocks;
	}

	drawContent(dom, callback) {
		var _this = this;

		var list = this.nav.getShownOffset();
		var isTopMax = (list[0] === 0);

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
	}

	/**
	 * Draw a chunk before or after the current content
	 */
	drawChunk(chunk, domAnchor) {
		domAnchor.innerHTML = chunk.data;
		// TODO Dirty workaround, see with worker usage
		const seekableElements = domAnchor.getElementsByClassName('r2seek');
		for (const el of seekableElements) {
			applySeek(el);
		}
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
	}

	infiniteDrawingContent(where, pos, endCallback) {
		var _this = this;
		var firstVisibleOffset = this.firstVisibleOffset();
		this.drawContent(this.container.getBody(), function() {
			_this.replaceScrollPosition(firstVisibleOffset);
			endCallback();
		}); // TODO Add stop scroll
	}

	drawControls(dom) {
		dom.innerHTML = '';

		const more = Inputs.iconButton('list', 'Others representations');
		more.id = 'disasm_more';

		const moreMenu = document.createElement('ul');
		moreMenu.className = 'mdl-menu mdl-menu--bottom-left mdl-js-menu mdl-js-ripple-effect';
		moreMenu.setAttribute('for', 'disasm_more');

		const subPanels = {
			'Graph': () => uiContext.navigateTo(Widgets.DISASSEMBLY_GRAPH),
			'Infos': () => uiContext.navigateTo(Widgets.DISASSEMBLY_INFOS),
			'Functions': () => uiContext.navigateTo(Widgets.DISASSEMBLY_FUNCTIONS),
			'Functions (full)': () => uiContext.navigateTo(Widgets.DISASSEMBLY_FUNCTIONS_FULL),
			'Blocks': () => uiContext.navigateTo(Widgets.DISASSEMBLY_BLOCKS),
			'Decompile': () => uiContext.navigateTo(Widgets.DISASSEMBLY_DECOMPILE),
		}

		for (let subpanel in subPanels) {
			const item = document.createElement('li');
			item.className = 'mdl-menu__item';
			item.textContent = subpanel;
			item.addEventListener('click', subPanels[subpanel])
			moreMenu.appendChild(item);
		}

		const container = document.createElement('div');
		container.className = 'button-controls-disasm';

		container.appendChild(more);
		container.appendChild(moreMenu);
		container.appendChild(Inputs.iconButton('mode_edit', 'Write', () => write()));
		container.appendChild(Inputs.iconButton('find_replace', 'Open Analyze window', () => this.openAnalysisDialog()));
		dom.appendChild(container);

		componentHandler.upgradeDom(); // TODO should be called when controls are binded to DOM

		this.history = document.createElement('ul');
		this.history.id = 'disasm-history';
		dom.appendChild(this.history);

		this.drawHistory(this.history);
	}

	drawHistory(dom) {
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
			li.addEventListener('click', (evt) => {
				r2Wrapper.seek(evt.target.x);
			});

			dom.appendChild(li);
		}

		var li = document.createElement('li');
		li.title = 'Seek';
		li.appendChild(document.createTextNode('?'));
		li.addEventListener('click', function() {
			r2Wrapper.seek();
		});
		dom.appendChild(li);
	}

	openAnalysisDialog() {
		this.analysisDialog.showModal();
	}

	/**
	 * We want to know the first offset currently visible at the moment
	 * when the user ask for more data by scrolling
	 */
	firstVisibleOffset() {
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
	}

	/**
	 * We know the last approx. visible offset from firstVisibleOffset
	 * we want to adjust the current view to set this same offset on
	 * a near position.
	 */
	replaceScrollPosition(offset) {
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

		var firstEligibleElement = 0;
		while (typeof chunk.children[firstEligibleElement].id === 'undefined') {
			firstEligibleElement++;
		}
		var blockOffset = this.extractOffset_(chunk.children[firstEligibleElement].id);
		var startFromTop = chunk.offsetTop;
		var chunkHeight = chunk.getBoundingClientRect().height;

		var progression = (offset - blockOffset) / this.nav.getSize(blockOffset);
		var adjustment = Math.floor(progression * chunkHeight);
		var requiredScroll = startFromTop + adjustment;

		this.container.getBody().scrollTop = requiredScroll;
	}

	drawContextualMenu(enableAoj) {
		var _this = this;

		var displayRes = function(offset, cmd) {
			var output;
			var fullCmd = cmd + ' @' + offset;
			r2.cmdj(fullCmd, function(d) {
				output = d;
			});

			if (output === null || output.constructor !== Array) {
				alert('No available ouput!');
				return;
			}

			_this.addLongListDialog(output);
		};

		var applyOp = function(offset, cmd, prompting) {
			var arg = '';
			if (typeof prompting !== 'undefined') {
				arg = prompt(prompting + '?');
				if (arg === '') {
					return;
				}
			}

			if (arg !== '') {
				cmd += ' ' + arg;
			}

			r2.cmd(cmd + ' @' + offset);
			_this.nav.cleanOldData();
			_this.draw();
		};

		/**
		 * Take a r2 cmd in parameter, will format output into a dialog to validate stuff
		 */
		var presentResults = function(offset, cmd, drawingFct, validationCallback) {
			var output;
			r2.cmd(cmd + ' @' + offset, function(d) {
				output = d;
			});
			drawingFct(this.resultDialog, output, validationCallback);
		};

		var items = [// can add: 'expand' property for expandable menu
			// { name: 'define flag size', shortcut: '$', fct: function(evt, offset) { return applyOp(offset, '$'); } },
			// { name: 'edit bits', shortcut: '1', fct: function(evt, offset) { return applyOp(offset, '1'); } },
			// { name: 'set as byte', shortcut: 'b', fct: function(evt, offset) { return applyOp(offset, 'b'); } },
			// { name: 'set as short word (2 bytes)', shortcut: 'B', fct: function(evt, offset) { return applyOp(offset, 'B'); } },
			// { name: 'set as code', shortcut: 'c', fct: function(evt, offset) { return applyOp(offset, 'c'); } },
			// { name: 'define flag color (fc)', shortcut: 'C', fct: function(evt, offset) { return applyOp(offset, 'C'); } },
			// { name: 'set as data', shortcut: 'd', fct: function(evt, offset) { return applyOp(offset, 'd'); } },
			// { name: 'end of function', shortcut: 'e', fct: function(evt, offset) { return applyOp(offset, 'e'); } },
			{ aoj: false, name: 'view graph', shortcut: 'G', fct: function loadgraph() { return uiContext.navigateTo(Widgets.DISASSEMBLY_GRAPH);}},
			{ aoj: false, name: 'analyze function', shortcut: 'F', fct: function(evt, offset) { return applyOp(offset, 'af'); } },
			// { name: 'format', shortcut: 'F', fct: function(evt, offset) { return applyOp(offset, 'F'); } },
			{ aoj: true, name: 'immediate base...', shortcut: 'i', expand: [
				{
					name: 'binary',
					fct: function(evt, offset) { return applyOp(offset, 'ahi b'); }
				},{
					name: 'octal',
					fct: function(evt, offset) { return applyOp(offset, 'ahi o'); }
				},{
					name: 'decimal',
					fct: function(evt, offset) { return applyOp(offset, 'ahi d'); }
				},{
					name: 'hexadecimal',
					fct: function(evt, offset) { return applyOp(offset, 'ahi h'); }
				},{
					name: 'string',
					fct: function(evt, offset) { return applyOp(offset, 'ahi s'); }
				}] },
			// { name: 'merge down (join this and next functions)', shortcut: 'j', fct: function(evt, offset) { return applyOp(offset, 'j'); } },
			// { name: 'merge up (join this and previous function)', shortcut: 'k', fct: function(evt, offset) { return applyOp(offset, 'k'); } },
			// { name: 'highlight word', shortcut: 'h', fct: function(evt, offset) { return applyOp(offset, 'h'); } },
			// { name: 'manpage for current call', shortcut: 'm', fct: function(evt, offset) { return applyOp(offset, 'm'); } },
			{ aoj: false, name: 'add comment', shortcut: ';', fct: function(evt, offset) { return applyOp(offset, 'CC', 'Name'); } },
			{ aoj: false, name: 'set flag', shortcut: 'f', fct: function(evt, offset) { return applyOp(offset, 'f', 'Name'); } },
			{ aoj: true, name: 'rename flag', shortcut: 'n', fct: function(evt, offset) { return applyOp(offset, 'fr', 'Name'); } },
			// { name: 'rename function', shortcut: 'r', fct: function(evt, offset) { return applyOp(offset, 'r'); } },
			// { name: 'find references /r', shortcut: 'R', fct: function(evt, offset) { return applyOp(offset, 'R'); } },
			{ aoj: true, name: 'set string', shortcut: 's', fct: function(evt, offset) { return applyOp(offset, 'Cs'); } },
			// { name: 'set strings in current block', shortcut: 'S', fct: function(evt, offset) { return applyOp(offset, 'S'); } },
			// { name: 'undefine metadata here', shortcut: 'u', fct: function(evt, offset) { return applyOp(offset, 'u'); } },
			{ aoj: false, name: 'find xrefs', shortcut: 'x', fct: function(evt, offset) { return displayRes(offset, 'axtj'); } },
			{ aoj: false, name: 'as data', shortcut: 'D', fct: function(evt, offset) { return applyOp(offset, 'Cd ', 'Size'); } },
			{ aoj: false, name: 'as code', shortcut: 'F', fct: function(evt, offset) { return applyOp(offset, 'C-'); } },
			{ aoj: false, name: 'as string', shortcut: 'S', fct: function(evt, offset) { return applyOp(offset, 'Cs'); } },
			// { name: 'set as 32bit word', shortcut: 'w', fct: function(evt, offset) { return applyOp(offset, 'w'); } },
			// { name: 'set as 64bit word', shortcut: 'W', fct: function(evt, offset) { return applyOp(offset, 'W'); } }
		];

		var menu = document.getElementById('contextmenuDisasm');
		if (menu === null) {
			var menu = document.createElement('nav');
			menu.id = 'contextmenuDisasm';
			menu.classList.add('context-menu');
		} else {
			menu.innerHTML = '';
		}

		var ul = document.createElement('ul');
		menu.appendChild(ul);

		var _this = this;
		var bindAction = function(element, action) {
			element.addEventListener('mousedown', (function(fct) {
				return function(evt) {
					fct(evt, _this.getCurrentOffset());
				};
			}(action)));
		};

		for (var i = 0 ; i < items.length ; i++) {
			var li = document.createElement('li');
			ul.appendChild(li);
			li.appendChild(document.createTextNode(items[i].name));
			li.isSubOpen = false;

			li.addEventListener('mouseenter', function(evt) {
				// Cleaning old "active"
				var subactives = Array.prototype.slice.call(evt.target.parentNode.getElementsByClassName('subactive'));
				for (var x = 0 ; x < subactives.length ; x++) {
					subactives[x].classList.remove('subactive');
					subactives[x].isSubOpen = false;
				}
			});

			// expandable menu
			if (typeof items[i].expand !== 'undefined' && (enableAoj && items[i].aoj || !items[i].aoj)) {
				// Make submenu reachable
				li.addEventListener('mouseenter', function(evt) {
					if (evt.target.isSubOpen) {
						return;
					} else {
						evt.target.isSubOpen = true;
					}

					var subMenu = evt.target.children[0];
					if (typeof subMenu === 'undefined') {
						return;
					}

					var dim = evt.target.getBoundingClientRect();
					var indexOf = Array.prototype.slice.call(evt.target.parentNode.children).indexOf(evt.target);
					evt.target.classList.add('subactive');
					subMenu.style.left = dim.width + 'px';
					subMenu.style.top = indexOf * dim.height + 'px';
				});

				// Creating sub menu
				var subUl = document.createElement('ul');
				li.appendChild(subUl);
				for (var j = 0 ; j < items[i].expand.length ; j++) {
					var subLi = document.createElement('li');
					subUl.appendChild(subLi);
					subLi.appendChild(document.createTextNode(items[i].expand[j].name));
					bindAction(subLi, items[i].expand[j].fct);
				}
			} else {
				if (enableAoj && items[i].aoj || !items[i].aoj) {
					bindAction(li, items[i].fct);
				} else {
					li.classList.add('disabled');
				}
			}
		}

		document.body.appendChild(menu);
		componentHandler.upgradeDom();

		var _this = this;
		this.contextMenuOpen = false;
		var closeMenu = function() {
			if (!_this.contextMenuOpen) {
				return;
			}
			menu.classList.remove('active');
			_this.contextMenuOpen = false;
		};

		window.onkeyup = function(e) {
			if (e.keyCode === 27) {
				closeMenu();
			}
		};

		document.addEventListener('click', function() {
			closeMenu();
		});
	}

	/**
	 * Show a list of element in a specific dialog
	 */
	addLongListDialog(list) {
		var _this = this;
		var dialog = document.createElement('dialog');
		dialog.className = 'mdl-dialog';

		if (!dialog.showModal) {
			dialogPolyfill.registerDialog(dialog);
		}

		var content = document.createElement('div');
		content.className = 'mdl-dialog__content';
		dialog.appendChild(content);

		var title = document.createElement('p');
		title.appendChild(document.createTextNode('Results'));
		title.className = 'mdl-typography--text-center';
		content.appendChild(title);

		var container = document.createElement('div');
		container.className = 'mdl-card__supporting-text';
		dialog.appendChild(container);

		var table = document.createElement('table');
		table.className = 'disasm-table-dialog';
		table.style.width = '100%';
		table.style.border = '1px dashed red';
		container.appendChild(table);

		var thead = document.createElement('thead');
		table.appendChild(thead);

		var keys = Object.keys(list[0]);
		for (var i = 0 ; i < keys.length ; i++) {
			var th = document.createElement('th');
			th.appendChild(document.createTextNode(keys[i]));
			thead.appendChild(th);
		}

		var tbody = document.createElement('tbody');
		table.appendChild(tbody);

		for (var i = 0 ; i < list.length ; i++) {
			var tr = document.createElement('tr');
			tbody.appendChild(tr);

			for (var j = 0 ; j < keys.length ; j++) {
				var td = document.createElement('td');
				tr.appendChild(td);

				if (keys[j] === 'opcode') {
					td.appendChild(formatOffset(list[i][keys[j]]));
				} else if (keys[j] === 'from') {
					const hex = '0x' + list[i][keys[j]].toString(16);
					td.appendChild(formatOffset(hex));
				} else {
					td.innerHTML = list[i][keys[j]];
				}
			}
		}

		var actions = document.createElement('div');
		actions.className = 'mdl-dialog__actions';
		dialog.appendChild(actions);

		var closeButton = document.createElement('button');
		closeButton.className = 'mdl-button';
		closeButton.innerHTML = 'Close';
		closeButton.addEventListener('click', function() {
			dialog.close();
			document.body.removeChild(dialog);
		});
		actions.appendChild(closeButton);

		document.body.appendChild(dialog);
		componentHandler.upgradeDom();

		dialog.showModal();
	}
}
