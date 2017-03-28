import {HexPairNavigator} from './HexPairNavigator';
import {NavigatorDirection} from '../../core/NavigatorDirection';
import {RadareInfiniteBlock} from '../../layout/RadareInfiniteBlock';
import {FlexContainer} from '../../layout/FlexContainer';
import {WordSizes} from './WordSizes';

import {uiContext} from '../../core/UIContext';
import {Widgets} from '../../widgets/Widgets';
import {Inputs} from '../../helpers/Inputs';
import {applySeek, formatOffset} from '../../helpers/Format';
import {r2Wrapper} from '../../core/R2Wrapper';

/**
 * UI management
 * Container should be currently sized for the purpose
 * lineHeight should be specified in pixels
 */
export class Hexdump extends RadareInfiniteBlock {
	
	constructor(containerElement, lineHeight, isBigEndian) {
		super();
		this.container = new FlexContainer(containerElement, 'hex');
		this.lineHeight = lineHeight;
		this.bigEndian = isBigEndian;
		this.nbColumns = 16;
		this.hexLength = WordSizes.PAIRS;
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
	 * Define the behavior expected when a value is edited
	 */
	setOnChangeCallback(callback) {
		this.onChangeCallback = callback;
	}

	/**
	 * Fetch and initialize data
	 */
	init() {
		this.refreshInitialOffset();

		r2.cmdj('ecj|', (colors) => { this.colors = colors; });
		r2.cmdj('ij|', (info) => { this.writable = info.core.iorw; });
		this.selectionMode = !this.writable;

		for (var key in this.colors) {
			this.colors[key] = 'rgb(' + this.colors[key][0] + ',' + this.colors[key][1] + ',' + this.colors[key][2] + ')';;
		}

		window.addEventListener('mousedown', (evt) => {
			if (evt.button !== 0 || this.contextMenuOpen) {
				return;
			}
			this.cleanSelection();
		});

		this.drawContextualMenu();
		this.changeWritable();
	}

	/**
	 * Generic definition of isWritable, if not, we are in select mode
	 */
	isWritable() {
		return this.writable && !this.selectionMode;
	}

	/**
	 * On change on R/W status on document (!= this.isWritable)
	 */
	changeWritable() {
		var items = Array.prototype.slice.call(document.getElementsByClassName('writableMenu'));
		var opacity = (this.writable) ? 1.0 : 0.5;

		for (var i = 0 ; i < items.length ; i++) {
			items[i].style.opacity = opacity;
		}
	}

	/**
	 * Called when the frame need to be redrawn
	 * Reset the container and draw the previous state
	 * TODO: save DOM/Events when quitting widget to reload it faster
	 */
	resetContainer(container) {
		this.refreshInitialOffset();

		if (typeof this.nav !== 'undefined') {
			this.nav.reset();
		}

		this.container.replug(container);

		// TODO: cache, faster
		this.container.reset();

		this.container.drawBody((element) => {
			element.appendChild(document.createElement('div')); // offsets
			element.appendChild(document.createElement('div')); // hexpairs
			element.appendChild(document.createElement('div')); // ascii
		});
		this.content = this.container.getBody();
		this.defineInfiniteParams();
	}

	getCurrentSelection() {
		return this.currentSelection;
	}

	/**
	 * Gather data and set event to configure infinite scrolling
	 */
	defineInfiniteParams() {
		RadareInfiniteBlock.prototype.defineInfiniteParams.call(this);
		this.nav = new HexPairNavigator(this.howManyLines, this.nbColumns, this.initialOffset);
		this.nav.updateModifications();
	}

	/**
	 * Sequence to draw the whole UI
	 */
	draw() {
		this.drawControls(this.container.getControls());
		this.drawContent(this.container.getBody(), () => {
			this.colorizeFlag();
		});
	}

	/**
	 * Colorize a byte depending on 00/7f/ff and ASCII
	 */
	colorizeByte(elem, val) {
		if (val === '00' || val === 'ff' || val === '7f') {
			elem.style.color = this.colors['b0x' + val];
		} else if (isAsciiVisible(parseInt(val, 16))) {
			elem.style.color = 'rgb(192,192,192)';
		} else {
			elem.style.color = 'inherit';
		}
	}

	/**
	 * Return a color on a cyclic way
	 */
	pickColor() {
		this.lastColorUsed = (this.lastColorUsed + 1) % this.bgColors.length;
		return this.bgColors[this.lastColorUsed];
	}

	/** Assemble two pairs depending of endianness */
	honoringEndian(x, y) {
		if (this.bigEndian) {
			return x + y
		} else {
			return y + x;
		}
	}

	/**
	 * Convert a pair to a word considering endian
	 */
	pairs2words(list, wordLength) {
		if (wordLength === 1) {
			return list;
		}

		let newList = [];
		for (let i = 0 ; i < list.length / 2 ; i++) {
			newList.push(
				this.honoringEndian(
					list[i * 2],
					list[(i * 2) + 1]
				)
			);
		}

		return this.pairs2words(newList, wordLength / 2);
	}

	/**
	 * Delete selection marks from the UI
	 */
	cleanSelection(previsualization) {
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
	}

	/**
	 * Draw the selection (emulated)
	 * Based on sibling
	 */
	processSelection(isPrev) {
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
	}

	//#region main draw
/**
	 * Draw 3 chunks on specified DOM node
	 */
	drawContent(dom, callback) {
		dom.innerHTML = '';

		this.listContent = document.createElement('ul');
		this.listContent.className = 'listContent';
		dom.appendChild(this.listContent);

		this.listContent.addEventListener('contextmenu', (evt) => {
			if (typeof this.currentSelection === 'undefined' ||
				typeof this.currentSelection.from === 'undefined' ||
				typeof this.currentSelection.to === 'undefined') {
				// If undefined, we chose to have one-byte selection
				this.currentSelection = {
					from: evt.target.offset,
					to: evt.target.offset
				};
			}
			evt.preventDefault();
			var menu = document.getElementById('contextmenuHex');

			if (this.contextMenuOpen) {
				menu.classList.remove('active');
			} else {
				menu.classList.add('active');
				menu.style.left = evt.clientX + 'px';
				menu.style.top = evt.clientY + 'px';
			}

			this.contextMenuOpen = !this.contextMenuOpen;
		});

		this.nav.get(NavigatorDirection.CURRENT, (chunk) => {
			this.curChunk = chunk;
		});

		this.nav.get(NavigatorDirection.BEFORE, (chunk) => {
			this.isTopMax = chunk.offset === 0;
			this.drawChunk(chunk);
			this.firstElement = this.drawChunk(this.getCurChunk());
		});

		this.nav.get(NavigatorDirection.AFTER, (chunk) => {
			this.drawChunk(chunk);
			this.content.scrollTop = 0;
			this.content.scrollTop = this.getFirstElement().getBoundingClientRect().top;

			// Everything has been drawn, maybe we should do something more
			if (typeof callback !== 'undefined') {
				callback();
			}
		});
	}

	/**
	 * Draw a chunk before or after the current content
	 */
	drawChunk(chunk, where) {
		if (chunk.offset === 0 && chunk.hex.length === 0) {
			return this.firstElement;
		}

		var drawMethod;
		var size;
		if (this.hexLength === -1) {
			drawMethod = this.drawPairs_;
		} else {
			drawMethod = this.drawWords_;
			size = this.hexLength;
		}

		if (typeof where === 'undefined') {
			where = NavigatorDirection.AFTER;
		}

		var lines = [];
		var firstElement;
		var i;
		for (var x = 0 ; x < chunk.hex.length ; x++) {
			const line = document.createElement('li');
			line.className = 'block' + chunk.offset;

			if (where === NavigatorDirection.AFTER) {
				this.listContent.appendChild(line);
				lines.push(line);
				i = x;
			} else {
				this.listContent.insertBefore(line, this.listContent.firstChild);
				lines.unshift(line);
				i = (chunk.hex.length - 1) - x;
			}

			line.addEventListener('mousedown', (evt) => { this.currentLine = line; });

			line.offset = {};
			line.offset.start = chunk.offset + (this.nbColumns * i);
			line.offset.end = line.offset.start + (this.nbColumns - 1);

			var offset = document.createElement('ul');
			var hexpairs = document.createElement('ul');
			var asciis = document.createElement('ul');

			offset.classList.add('offset');

			var offsetEl = document.createElement('li');
			offset.appendChild(offsetEl);
			const hex = int2fixedHex(chunk.offset + (i * this.nbColumns), 8);
			const offsetElA = document.createElement('a');
			offsetElA.innerHTML = hex;
			applySeek(offsetElA);
			offsetEl.appendChild(offsetElA);

			offsetEl.assoc = hexpairs;

			hexpairs.style.lineHeight = this.lineHeight + 'px';
			hexpairs.classList.add('hexpairs');

			asciis.classList.add('ascii');

			line.appendChild(offset);
			line.appendChild(hexpairs);
			line.appendChild(asciis);

			drawMethod.apply(
				this,
				[hexpairs, asciis, chunk.hex[i], chunk.ascii[i], chunk.modified, chunk.offset + (this.nbColumns * i), size]
			);

			if (typeof firstElement === 'undefined') {
				firstElement = line;
			}
		}

		this.applyFlags(lines, chunk.offset, chunk.flags);

		return firstElement;
	}

	/**
	 * Trigerred by scrolling, determine and add content at the right place
	 */
	infiniteDrawingContent(where, pos, endCallback) {
		this.nav.get(where, (chunk) => {
			if (where === NavigatorDirection.BEFORE) {
				this.isTopMax = chunk.offset === 0;
			} else {
				if (this.isTopMax) {
					this.nav.get(NavigatorDirection.BEFORE, (chunk) => {
						if (chunk.offset > 0) {
							this.isTopMax = false;
						}
					});
				}
			}

			if (chunk.offset === 0 && chunk.hex.length === 0) {
				return;
			}

			var removing;
			if (where === NavigatorDirection.BEFORE) {
				removing = this.listContent.lastChild.className;
			} else {
				removing = this.listContent.firstChild.className;
			}
			var elements = Array.prototype.slice.call(document.getElementsByClassName(removing));
			for (var i = 0 ; i < elements.length ; i++) {
				elements[i].parentNode.removeChild(elements[i]);
			}

			this.drawChunk(chunk, where);
			this.content.scrollTop = pos;
			this.colorizeFlag(true);

			endCallback(this.isTopMax); // pauseScrollEvent = false
		});
	}

	/**
	 * mouse over event to highligh pair-ascii at the same time
	 */
	showPairs_(first, second, isOver) {
		if (isOver) {
			first.classList.add('active');
			second.classList.add('active');
		} else {
			first.classList.remove('active');
			second.classList.remove('active');
		}
	}

	/**
	 * Generic method to draw words of any size
	 */
	drawWords_(hexpairs, asciis, pairs, chars, modifications, offset, size) {
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
			var contentNode;
			if (size === 2) {
				var word = '' + new Int16Array([+words[x]])[0]
				if (word.length < 5) {
					word = Array(5 - word.length).join('_') + word
				}
				contentNode = document.createTextNode(word);
			} else {
				contentNode = document.createElement('a');
				contentNode.innerHTML = '0x' + words[x];
				applySeek(contentNode);
			}
			hexpairEl.appendChild(contentNode);
			hexpairs.appendChild(hexpairEl);
		}
	}

	/**
	 * Default drawing method to draw the pairs with all features
	 */
	drawPairs_(hexpairs, asciis, pairs, chars, modifications, offset) {
		hexpairs.classList.add('pairs');

		var editableHexEvent = {
			keydown: (evt) => evt.keyCode === 13 && collectHexpair(evt.target),
			blur: (evt) => collectHexpair(evt.target)
		};

		var editableAsciiEvent = {
			keydown: (evt) => evt.keyCode === 13 && collectAscii(evt.target),
			blur: (evt) => collectAscii(evt.target)
		};

		var collectHexpair = (target) => {
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
			var initial = this.nav.reportChange(target.offset, value);

			target.innerHTML = value;
			target.assoc.innerHTML = hexPairToASCII(value);
			if (initial !== null) {
				target.classList.add('modified');
				target.assoc.classList.add('modified');
				this.colorizeByte(target, value);
				this.colorizeByte(target.assoc, value);
				this.onChangeCallback(target.offset, initial, value);
			}

			target.removeEventListener('keydown', editableHexEvent.keydown);
			target.removeEventListener('blur', editableHexEvent.blur);
		};

		var collectAscii = (target) => {
			var value = target.value[0];
			var hex = ASCIIToHexpair(value);
			target = target.parentNode;
			var initial = this.nav.reportChange(target.assoc.offset, hex);

			target.innerHTML = value;
			target.assoc.innerHTML = hex;
			if (initial !== null) {
				target.classList.add('modified');
				target.assoc.classList.add('modified');
				this.colorizeByte(target, value);
				this.colorizeByte(target.assoc, value);
				this.onChangeCallback(target.assoc.offset, target.assoc.innerHTML, hex);
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

			hexpairEl.addEventListener('mouseenter', (evt) => this.showPairs_(evt.target, evt.target.assoc, true));
			hexpairEl.addEventListener('mouseleave', (evt) => this.showPairs_(evt.target, evt.target.assoc, false));

			asciiEl.addEventListener('mouseenter', (evt) => this.showPairs_(evt.target, evt.target.assoc, true));
			asciiEl.addEventListener('mouseleave', (evt) => this.showPairs_(evt.target, evt.target.assoc, false));

			if (this.isWritable()) {
				hexpairEl.addEventListener('click', (evt) => {
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

				asciiEl.addEventListener('click', (evt) => {
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
				hexpairEl.addEventListener('click', () => {
					this.beingSelected = false;
					this.cleanSelection();
				});

				const stopSelection = () => {
					this.beingSelected = false;
					window.removeEventListener('mouseup', stopSelection);
				};

				hexpairEl.addEventListener('mousedown', (evt) => {
					if (evt.button !== 0) {
						return;
					}
					evt.preventDefault();
					this.beingSelected = true;
					this.selectionFirst = evt.target;
					window.addEventListener('mouseup', stopSelection);
				});

				hexpairEl.addEventListener('mouseover', (evt) => {
					if (!this.beingSelected) {
						return;
					}
					this.selectionEnd = evt.target;
					this.processSelection(true);
				});

				hexpairEl.addEventListener('mouseup', (evt) => {
					if (!this.beingSelected) {
						return;
					}
					this.selectionEnd = evt.target;
					this.processSelection(false);
				});
			}
		}
	}

	//#endregion

	//#region aux draw
/**
	 * Populate the content of the contextual menu (on hexpair selection)
	 */
	drawContextualMenu() {
		var exportOp = (name, range, command, ext) => {
			var output;
			r2.cmd(command + ' ' + (range.to - range.from) + ' @' + range.from, (d) => { output = d; });

			var dialog = this.createExportDialog('Export as ' + name + ':', output, () => {
				var blob = new Blob([output], {type: 'text/plain'});
				var fileName;
				r2.cmdj('ij', (d) => { fileName = basename(d.core.file); });
				fileName += '_0x' + range.from.toString(16) + '-0x' + range.to.toString(16) + '.' + ext;
				saveAs(blob, fileName);
			});

			document.body.appendChild(dialog);
			componentHandler.upgradeDom();
			dialog.showModal();
		};

		var bytes;
		var exportAs = [
			{ name: 'Assembly', fct: (evt, range) => exportOp('ASM', range, 'pca', 'asm') },
			{ name: 'Disassembly', fct: (evt, range) => exportOp('DISASM', range, 'pD', 'disasm') },
			{ name: 'Hexpairs', fct: (evt, range) => exportOp('HEXPAIRS', range, 'p8', 'disasm') },
			{ name: 'Base64 Encode', fct: (evt, range) => exportOp('b64e', range, 'p6e', 'disasm') },
			{ name: 'Base64 Decode', fct: (evt, range) => exportOp('b64d', range, 'p6d', 'disasm') },
			{ name: 'Binary', fct: (evt, range) => { bytes = new Uint8Array(this.nav.getBytes(range));
				var blob = new Blob([bytes], {type: 'application/octet-stream'});
				var fileName;
				r2.cmdj('ij', (d) => { fileName = basename(d.core.file); });
				fileName += '_0x' + range.from.toString(16) + '-0x' + range.to.toString(16) + '.bin';
				saveAs(blob, fileName);
			} },
			{ name: 'C', fct: (evt, range) => exportOp('C', range, 'pc', 'c') },
			{ name: 'C half-words (2 bytes)', fct: (evt, range) => exportOp('C', range, 'pch', 'c') },
			{ name: 'C words (4 bytes)', fct: (evt, range) => exportOp('C', range, 'pcw', 'c') },
			{ name: 'C dwords (8 bytes)', fct: (evt, range) => exportOp('C', range, 'pcd', 'c') },
			{ name: 'JavaScript', fct: (evt, range) => exportOp('JS', range, 'pcJ', 'js') },
			{ name: 'JSON', fct: (evt, range) => exportOp('JSON', range, 'pcj', 'json') },
			{ name: 'Python', fct: (evt, range) => exportOp('Python', range, 'pcp', 'py') },
			{ name: 'R2 commands', fct: (evt, range) => exportOp('R2 cmd', range, 'pc*', 'r2') },
			{ name: 'Shell script', fct: (evt, range) => exportOp('Shell script', range, 'pcS', 'txt') },
			{ name: 'String', fct: (evt, range) => exportOp('string', range, 'pcs', 'txt') }
		];
		var applyOp = (range, operande) => {
			var val = prompt('Value (valid hexpair):');
			var op = operande + ' ' + val + ' ' + (range.to - range.from) + ' @' + range.from;
			r2.cmd(op, () => console.log('Call: ' + op));
			this.nav.updateModifications();

			// Send modifications and reload
			this.nav.refreshCurrent(() => this.draw());
		};
		var operations = [
			{ name: 'addition', fct: (evt, range) => applyOp(range, 'woa') },
			{ name: 'and', fct: (evt, range) => applyOp(range, 'woA') },
			{ name: 'divide', fct: (evt, range) => applyOp(range, 'wod') },
			{ name: 'shift left', fct: (evt, range) => applyOp(range, 'wol') },
			{ name: 'multiply', fct: (evt, range) => applyOp(range, 'wom') },
			{ name: 'or', fct: (evt, range) => applyOp(range, 'woo') },
			{ name: 'shift right', fct: (evt, range) => applyOp(range, 'wor') },
			{ name: 'substraction', fct: (evt, range) => applyOp(range, 'wos') },
			{ name: 'write looped', fct: (evt, range) => applyOp(range, 'wow') },
			{ name: 'xor', fct: (evt, range) => applyOp(range, 'wox') },
			{ name: '2 byte endian swap', fct: (evt, range) => applyOp(range, 'wo2') },
			{ name: '4 byte endian swap', fct: (evt, range) => applyOp(range, 'wo4') }
		];

		var items = [
		/*
			TODO
			{
				name: 'Copy length @offset to cmd-line',
				fct: function(evt, range) {
					console.log('Not implemented');
				}
			},
			{
				name: 'Copy bytes to cmd-line',
				fct: function(evt, range) {
					console.log('Not implemented');
				}
			},*/
			{
				name: 'Select line',
				fct: (evt, range) => {
					this.selectionFirst = this.currentLine.children[1].children[0];
					this.selectionEnd = this.currentLine.children[1].children[this.currentLine.children[1].children.length - 1];
					this.processSelection(true);
				}
			},
			{
				name: 'Set flag',
				fct: (evt, range) => {
					var name = prompt('Flag\'s name:');
					r2.cmd('f ' + name + ' ' + (range.to - range.from + 1) + ' @' + range.from, () => {
						this.nav.refreshCurrent(() => this.draw());
					});
				}
			},
			{
				name: 'Export as...',
				expand: exportAs,
				requireWritable: false
			},
			{
				name: 'Operations...',
				expand: operations,
				requireWritable: true
			}
		];

		var menu = document.createElement('nav');
		menu.id = 'contextmenuHex';
		menu.classList.add('context-menu');

		var ul = document.createElement('ul');
		menu.appendChild(ul);

		// var bindAction = function(element, action) {
		// 	element.addEventListener('mousedown', (function(fct) {
		// 		return function(evt) {
		// 			fct(evt, _this.getCurrentSelection());
		// 		};
		// 	}(action)));
		// };

		var bindAction = (element, action) => {
			element.addEventListener('mousedown', (evt) => {
				action(evt, this.getCurrentSelection());
			})
		};

		for (var i = 0 ; i < items.length ; i++) {
			var li = document.createElement('li');
			ul.appendChild(li);
			li.appendChild(document.createTextNode(items[i].name));
			li.isSubOpen = false;
			li.requireWritable = items[i].requireWritable;

			if (items[i].requireWritable) {
				li.classList.add('writableMenu');
			}

			li.addEventListener('mouseenter', (evt) => {
				// Cleaning old "active"
				var subactives = Array.prototype.slice.call(evt.target.parentNode.getElementsByClassName('subactive'));
				for (var x = 0 ; x < subactives.length ; x++) {
					subactives[x].classList.remove('subactive');
					subactives[x].isSubOpen = false;
				}
			});

			// expandable menu
			if (typeof items[i].expand !== 'undefined') {
				// Make submenu reachable
				li.addEventListener('mouseenter', (evt) => {
					// If not available on read-only mode
					if (evt.target.requireWritable && !this.writable) {
						return;
					}

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
				bindAction(li, items[i].fct);
			}
		}

		document.body.appendChild(menu);
		componentHandler.upgradeDom();

		this.contextMenuOpen = false;
		var closeMenu = () => {
			if (!this.contextMenuOpen) {
				return;
			}
			menu.classList.remove('active');
			this.contextMenuOpen = false;
		};

		window.onkeyup = (e) =>  e.keyCode === 27 && closeMenu();
		document.addEventListener('click', () => closeMenu());
	}

	/**
	 * Return the export dialog built
	 * Don't forget to normalize the output by calling MDL processing
	 */
	createExportDialog(label, output, save) {
		var dialog = document.createElement('dialog');
		dialog.className = 'mdl-dialog';

		if (!dialog.showModal) {
			dialogPolyfill.registerDialog(dialog);
		}

		/*	CONTENT  */
		var content = document.createElement('div');
		content.className = 'mdl-dialog__content';
		dialog.appendChild(content);

		var desc = document.createTextNode(label);
		content.appendChild(desc);

		var textarea = document.createElement('textarea');
		textarea.style.width = '100%';
		textarea.style.height = '220px';
		content.appendChild(textarea);
		textarea.value = output;

		/*  ACTIONS  */
		var actions = document.createElement('div');
		actions.className = 'mdl-dialog__actions';
		dialog.appendChild(actions);

		var saveButton = document.createElement('button');
		saveButton.className = 'mdl-button';
		saveButton.innerHTML = 'Save';
		saveButton.addEventListener('click', () => {
			dialog.close();
			dialog.parentNode.removeChild(dialog);
			save();
		});
		actions.appendChild(saveButton);

		var closeButton = document.createElement('button');
		closeButton.className = 'mdl-button';
		closeButton.innerHTML = 'Close';
		closeButton.addEventListener('click', () => {
			dialog.close();
			dialog.parentNode.removeChild(dialog);
		});
		actions.appendChild(closeButton);

		return dialog;
	}

	/**
	 * Draw the top-bar controls
	 */
	drawControls(dom) {
		dom.innerHTML = '';

		var controlList = document.createElement('ul');
		controlList.classList.add('controlList');
		dom.appendChild(controlList);

		var wordBlock = document.createElement('li');
		controlList.appendChild(wordBlock);
		var nbColumnsBlock = document.createElement('li');
		controlList.appendChild(nbColumnsBlock);
		var bigEndianBlock = document.createElement('li');
		controlList.appendChild(bigEndianBlock);
		var selectionBlock = document.createElement('li');
		controlList.appendChild(selectionBlock);
		var flagBlock = document.createElement('li');
		controlList.appendChild(flagBlock);

		var selectWord = document.createElement('span');
	/*
		selectWord.appendChild(document.createTextNode('Word length: '));
	*/
		var select = document.createElement('select');
		selectWord.appendChild(select);

		for (var i in WordSizes) {
			var option = document.createElement('option');
			option.value = WordSizes[i];
			option.text = WordSizes[i] > 0 ? (WordSizes[i] * 8) + ' bits' : 'pairs';
			if (WordSizes[i] === this.hexLength) {
				option.selected = true;
			}
			select.appendChild(option);
		}

		select.addEventListener('change', (evt) => {
			this.hexLength = parseInt(evt.target.value);
			this.draw();
		}, false);

		// Nb columns
		const nbCols = document.createElement('input');
		nbCols.className = 'mdl-textfield__input';
		nbCols.style.width = '26px';
		nbCols.style.display = 'inline';
		nbCols.pattern = '[0-9]+';
		nbCols.value = this.nbColumns;

		var setNbCols = (dom) => {
			this.nbColumns = nbCols;
			this.nav.changeNbCols(nbCols);
			this.draw();
			dom.value = nbCols;
		};

		var selectColumns = document.createElement('span');
		selectColumns.title = 'Number of columns per line';

		var buttonLess = document.createElement('button');
		buttonLess.className = 'mdl-button mdl-js-button mdl-button--icon';
		buttonLess.appendChild(document.createTextNode('-'));
		buttonLess.addEventListener('click', () => setNbCols(this.nbColumns - 1));

		var buttonMore = document.createElement('button');
		buttonMore.className = 'mdl-button mdl-js-button mdl-button--icon';
		buttonMore.appendChild(document.createTextNode('+'));
		buttonMore.addEventListener('click', () => setNbCols(this.nbColumns + 1));

		nbCols.addEventListener('change', (evt) => {
			var curVal = parseInt(evt.target.value);
			setNbCols(curVal);
		});

		selectColumns.appendChild(buttonLess);
		selectColumns.appendChild(document.createTextNode(' '));
		selectColumns.appendChild(nbCols);
		selectColumns.appendChild(document.createTextNode(' '));
		selectColumns.appendChild(buttonMore);


		// Big endian
		var checkboxBigEndian = document.createElement('input');
		checkboxBigEndian.classList.add('mdl-checkbox__input');
		checkboxBigEndian.type = 'checkbox';
		checkboxBigEndian.checked = this.bigEndian;

		var textBigEndian = document.createElement('span');
		textBigEndian.classList.add('mdl-checkbox__label');
		textBigEndian.appendChild(document.createTextNode('bigEndian'));

		var labelCheckboxBE = document.createElement('label');
		labelCheckboxBE.classList.add('mdl-checkbox');
		labelCheckboxBE.classList.add('mdl-js-checkbox');
		labelCheckboxBE.classList.add('mdl-js-ripple-effect');
		labelCheckboxBE.appendChild(checkboxBigEndian);
		labelCheckboxBE.appendChild(textBigEndian);

		checkboxBigEndian.addEventListener('change', () => {
			this.bigEndian = !this.bigEndian;
			this.draw();
		});

		// Selection mode
		var checboxSelection = document.createElement('input');
		checboxSelection.classList.add('mdl-checkbox__input');
		checboxSelection.type = 'checkbox';
		checboxSelection.checked = this.isWritable();

		var textSelection = document.createElement('span');
		textSelection.classList.add('mdl-checkbox__label');
		textSelection.appendChild(document.createTextNode('isEditable'));

		var labelCheckboxSelection = document.createElement('label');
		labelCheckboxSelection.classList.add('mdl-checkbox');
		labelCheckboxSelection.classList.add('mdl-js-checkbox');
		labelCheckboxSelection.classList.add('mdl-js-ripple-effect');
		labelCheckboxSelection.appendChild(checboxSelection);
		labelCheckboxSelection.appendChild(textSelection);
		if (!this.writable) {
			checboxSelection.disabled = true;
		}

		checboxSelection.addEventListener('change', () => {
			this.selectionMode = !this.selectionMode;
			this.draw();
		});

		// Big endian
		var checkboxFlags = document.createElement('input');
		checkboxFlags.classList.add('mdl-checkbox__input');
		checkboxFlags.type = 'checkbox';
		checkboxFlags.checked = this.showFlags;

		var textFlags = document.createElement('span');
		textFlags.classList.add('mdl-checkbox__label');
		textFlags.appendChild(document.createTextNode('showFlags'));

		var labelFlags = document.createElement('label');
		labelFlags.classList.add('mdl-checkbox');
		labelFlags.classList.add('mdl-js-checkbox');
		labelFlags.classList.add('mdl-js-ripple-effect');
		labelFlags.appendChild(checkboxFlags);
		labelFlags.appendChild(textFlags);

		checkboxFlags.addEventListener('change', () => {
			this.showFlags = !this.showFlags;
			this.draw();
		});

		wordBlock.appendChild(selectWord);
		nbColumnsBlock.appendChild(selectColumns);
		bigEndianBlock.appendChild(labelCheckboxBE);
		selectionBlock.appendChild(labelCheckboxSelection);
		flagBlock.appendChild(labelFlags);

		// Call MDL
		componentHandler.upgradeDom();
	}

	//#endregion

	//#region flags
/**
	 * Returns the color associated with the flag
	 */
	getFlagColor(flagName) {
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
	}

	/**
	 * Draw the flags from the collection of lines (UI POV) currently displayed
	 */
	applyFlags(lines, blockInitialOffset, flags) {
		if (!this.showFlags) {
			return;
		}

		for (var i in flags) {
			var line;
			var flag = flags[i];

			// We select the first line concerned by the flag
			for (var j = 0 ; j < lines.length ; j++) {
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

			const flagLine = document.createElement('li');
			const theOffset = int2fixedHex(flag.offset, 8);
			flagLine.classList.add('block' + blockInitialOffset);
			flagLine.classList.add('flag');
			flagLine.offset = theOffset;
			flagLine.appendChild(document.createTextNode('[' + theOffset + '] ' + flag.name));
			flagLine.title = 'Go to Disassembly';
			flagLine.style.cursor = 'pointer';
			flagLine.addEventListener('click', () => r2Wrapper.seek(theOffset, Widgets.DISASSEMBLY));
			flagLine.title = '(' + flag.size + ' bytes) Seek ' + theOffset + ' on disassembly widget';
			flagLine.style.color = this.getFlagColor(flag.name);
			this.listContent.insertBefore(flagLine, line);
		}
	}

	/**
	 * Returns the index of the line who is containing the offset
	 */
	indexOfLine_(offset) {
		var list = [].slice.call(this.listContent.children);
		for (var i = 0 ; i < list.length ; i++) {
			if (typeof list[i].offset !== 'undefined' &&
				list[i].offset.start <= offset &&
				list[i].offset.end >= offset) {
				return i;
			}
		}
		return -1;
	}

	/**
	 * Add colorization on the pairs currently displayed
	 * based on the length/color of the flags.
	 * Small flags are "painted" at the end to ensure
	 * better visibility (not masked by wide flags).
	 */
	colorizeFlag(reset) {
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

		// Retrieving all flags with length greater than 2 sorted (small at end)
		this.nav.getFlags(2, (flags) => {
			for (var j = 0 ; j < flags.length ; j++) {
				var end = false;
				var initialLine = this.indexOfLine_(flags[j].start);
				if (initialLine === -1) {
					console.log('Undefined flag offset');
					return;
				}

				var initialByte = flags[j].start - list[initialLine].offset.start;

				// We walk through lines
				for (var i = initialLine ; i < list.length && !end ; i++) {
					// If it's a "flag line" we move on the next
					if (typeof list[i].offset === 'undefined' || list[i].classList.contains('flag')) {
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
						hexList[x].style.backgroundColor = this.getFlagColor(flags[j].name);
					}

					initialByte = 0;
				}
			}
		});
	}

	//#endregion
}
