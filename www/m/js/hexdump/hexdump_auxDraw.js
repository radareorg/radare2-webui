/**
 * Populate the content of the contextual menu (on hexpair selection)
 */
Hexdump.prototype.drawContextualMenu = function() {
	var _this = this;

	var exportOp = function(name, range, command, ext) {
		var output;
		r2.cmd(command + ' ' + (range.to - range.from) + ' @' + range.from, function(d) {
			output = d;
		});

		var dialog = _this.createExportDialog('Export as ' + name + ':', output, function() {
			var blob = new Blob([output], {type: 'text/plain'});
			var fileName;
			r2.cmdj('ij', function(d) {
				fileName = basename(d.core.file);
			});
			fileName += '_0x' + range.from.toString(16) + '-0x' + range.to.toString(16) + '.' + ext;
			saveAs(blob, fileName);
		});

		document.body.appendChild(dialog);
		componentHandler.upgradeDom();
		dialog.showModal();
	};

	var exportAs = [
		{ name: 'Assembly', fct: function(evt, range) { return exportOp('ASM', range, 'pca', 'asm'); } },
		{ name: 'Disassembly', fct: function(evt, range) { return exportOp('DISASM', range, 'pD', 'disasm'); } },
		{ name: 'Hexpairs', fct: function(evt, range) { return exportOp('HEXPAIRS', range, 'p8', 'disasm'); } },
		{ name: 'Base64 Encode', fct: function(evt, range) { return exportOp('b64e', range, 'p6e', 'disasm'); } },
		{ name: 'Base64 Decode', fct: function(evt, range) { return exportOp('b64d', range, 'p6d', 'disasm'); } },
		{ name: 'Binary', fct: function(evt, range) {
			var bytes = new Uint8Array(_this.nav.getBytes(range));
			var blob = new Blob([bytes], {type: 'application/octet-stream'});
			var fileName;
			r2.cmdj('ij', function(d) {
				fileName = basename(d.core.file);
			});
			fileName += '_0x' + range.from.toString(16) + '-0x' + range.to.toString(16) + '.bin';
			saveAs(blob, fileName);
		} },
		{ name: 'C', fct: function(evt, range) { return exportOp('C', range, 'pc', 'c'); } },
		{ name: 'C half-words (2 bytes)', fct: function(evt, range) { return exportOp('C', range, 'pch', 'c'); } },
		{ name: 'C words (4 bytes)', fct: function(evt, range) { return exportOp('C', range, 'pcw', 'c'); } },
		{ name: 'C dwords (8 bytes)', fct: function(evt, range) { return exportOp('C', range, 'pcd', 'c'); } },
		{ name: 'JavaScript', fct: function(evt, range) { return exportOp('JS', range, 'pcJ', 'js'); } },
		{ name: 'JSON', fct: function(evt, range) { return exportOp('JSON', range, 'pcj', 'json'); } },
		{ name: 'Python', fct: function(evt, range) { return exportOp('Python', range, 'pcp', 'py'); } },
		{ name: 'R2 commands', fct: function(evt, range) { return exportOp('R2 cmd', range, 'pc*', 'r2'); } },
		{ name: 'Shell script', fct: function(evt, range) { return exportOp('Shell script', range, 'pcS', 'txt'); } },
		{ name: 'String', fct: function(evt, range) { return exportOp('string', range, 'pcs', 'txt'); } }
	];
	var applyOp = function(range, operande) {
		var val = prompt('Value (valid hexpair):');
		var op = operande + ' ' + val + ' ' + (range.to - range.from) + ' @' + range.from;
		r2.cmd(op, function() {
			console.log('Call: ' + op);
		});

		_this.nav.updateModifications();

		// Send modifications and reload
		_this.nav.refreshCurrent(function() {
			_this.draw();
		});
	};
	var operations = [
		{ name: 'addition', fct: function(evt, range) { return applyOp(range, 'woa'); } },
		{ name: 'and', fct: function(evt, range) { return applyOp(range, 'woA'); } },
		{ name: 'divide', fct: function(evt, range) { return applyOp(range, 'wod'); } },
		{ name: 'shift left', fct: function(evt, range) { return applyOp(range, 'wol'); } },
		{ name: 'multiply', fct: function(evt, range) { return applyOp(range, 'wom'); } },
		{ name: 'or', fct: function(evt, range) { return applyOp(range, 'woo'); } },
		{ name: 'shift right', fct: function(evt, range) { return applyOp(range, 'wor'); } },
		{ name: 'substraction', fct: function(evt, range) { return applyOp(range, 'wos'); } },
		{ name: 'write looped', fct: function(evt, range) { return applyOp(range, 'wow'); } },
		{ name: 'xor', fct: function(evt, range) { return applyOp(range, 'wox'); } },
		{ name: '2 byte endian swap', fct: function(evt, range) { return applyOp(range, 'wo2'); } },
		{ name: '4 byte endian swap', fct: function(evt, range) { return applyOp(range, 'wo4'); } }
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
			name: 'Set flag',
			fct: function(evt, range) {
				var name = prompt('Flag\'s name:');
				r2.cmd('f ' + name + ' ' + (range.to - range.from + 1) + ' @' + range.from, function() {
					_this.nav.refreshCurrent(function() {
						_this.draw();
					});
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

	var _this = this;
	var bindAction = function(element, action) {
		element.addEventListener('mousedown', (function(fct) {
			return function(evt) {
				fct(evt, _this.getCurrentSelection());
			};
		}(action)));
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

		li.addEventListener('mouseenter', function(evt) {
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
			li.addEventListener('mouseenter', function(evt) {
				// If not available on read-only mode
				if (evt.target.requireWritable && !_this.writable) {
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
};

/**
 * Return the export dialog built
 * Don't forget to normalize the output by calling MDL processing
 */
Hexdump.prototype.createExportDialog = function(label, output, save) {
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
	saveButton.addEventListener('click', function() {
		dialog.close();
		dialog.parentNode.removeChild(dialog);
		save();
	});
	actions.appendChild(saveButton);

	var closeButton = document.createElement('button');
	closeButton.className = 'mdl-button';
	closeButton.innerHTML = 'Close';
	closeButton.addEventListener('click', function() {
		dialog.close();
		dialog.parentNode.removeChild(dialog);
	});
	actions.appendChild(closeButton);

	return dialog;
};

/**
 * Draw the top-bar controls
 */
Hexdump.prototype.drawControls = function(dom) {
	dom.innerHTML = '';
	var _this = this;

	var controlList = document.createElement('ul');
	controlList.classList.add('controlList');
	dom.appendChild(controlList);

	var wordBlock = document.createElement('li');
	controlList.appendChild(wordBlock);
	var bigEndianBlock = document.createElement('li');
	controlList.appendChild(bigEndianBlock);
	var selectionBlock = document.createElement('li');
	controlList.appendChild(selectionBlock);
	var flagBlock = document.createElement('li');
	controlList.appendChild(flagBlock);

	var selectWord = document.createElement('span');
	selectWord.appendChild(document.createTextNode('Word length: '));
	var select = document.createElement('select');
	selectWord.appendChild(select);

	for (var i in this.Sizes) {
		var option = document.createElement('option');
		option.value = this.Sizes[i];
		option.text = this.Sizes[i] > 0 ? (this.Sizes[i] * 8) + ' bits' : 'pairs';
		if (this.Sizes[i] === this.hexLength) {
			option.selected = true;
		}
		select.appendChild(option);
	}

	select.addEventListener('change', function() {
		_this.hexLength = parseInt(this.value);
		_this.draw();
	}, false);

	// Big endian
	var checkboxBigEndian = document.createElement('input');
	checkboxBigEndian.classList.add('mdl-checkbox__input');
	checkboxBigEndian.type = 'checkbox';
	checkboxBigEndian.checked = this.bigEndian;

	var textBigEndian = document.createElement('span');
	textBigEndian.classList.add('mdl-checkbox__label');
	textBigEndian.appendChild(document.createTextNode('is big endian'));

	var labelCheckboxBE = document.createElement('label');
	labelCheckboxBE.classList.add('mdl-checkbox');
	labelCheckboxBE.classList.add('mdl-js-checkbox');
	labelCheckboxBE.classList.add('mdl-js-ripple-effect');
	labelCheckboxBE.appendChild(checkboxBigEndian);
	labelCheckboxBE.appendChild(textBigEndian);

	checkboxBigEndian.addEventListener('change', function() {
		_this.bigEndian = !_this.bigEndian;
		_this.draw();
	});

	// Selection mode
	var checboxSelection = document.createElement('input');
	checboxSelection.classList.add('mdl-checkbox__input');
	checboxSelection.type = 'checkbox';
	checboxSelection.checked = this.isWritable();

	var textSelection = document.createElement('span');
	textSelection.classList.add('mdl-checkbox__label');
	textSelection.appendChild(document.createTextNode('is editable'));

	var labelCheckboxSelection = document.createElement('label');
	labelCheckboxSelection.classList.add('mdl-checkbox');
	labelCheckboxSelection.classList.add('mdl-js-checkbox');
	labelCheckboxSelection.classList.add('mdl-js-ripple-effect');
	labelCheckboxSelection.appendChild(checboxSelection);
	labelCheckboxSelection.appendChild(textSelection);
	if (!this.writable) {
		checboxSelection.disabled = true;
	}

	checboxSelection.addEventListener('change', function() {
		_this.selectionMode = !_this.selectionMode;
		_this.draw();
	});

	// Big endian
	var checkboxFlags = document.createElement('input');
	checkboxFlags.classList.add('mdl-checkbox__input');
	checkboxFlags.type = 'checkbox';
	checkboxFlags.checked = this.showFlags;

	var textFlags = document.createElement('span');
	textFlags.classList.add('mdl-checkbox__label');
	textFlags.appendChild(document.createTextNode('show flags'));

	var labelFlags = document.createElement('label');
	labelFlags.classList.add('mdl-checkbox');
	labelFlags.classList.add('mdl-js-checkbox');
	labelFlags.classList.add('mdl-js-ripple-effect');
	labelFlags.appendChild(checkboxFlags);
	labelFlags.appendChild(textFlags);

	checkboxFlags.addEventListener('change', function() {
		_this.showFlags = !_this.showFlags;
		_this.draw();
	});

	wordBlock.appendChild(selectWord);
	bigEndianBlock.appendChild(labelCheckboxBE);
	selectionBlock.appendChild(labelCheckboxSelection);
	flagBlock.appendChild(labelFlags);

	// Call MDL
	componentHandler.upgradeDom();
};
