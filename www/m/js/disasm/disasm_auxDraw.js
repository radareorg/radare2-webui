Disasm.prototype.drawContextualMenu = function(enableAoj) {
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
			if (arg == '') {
				return;
			}
		}

		if (arg != '') {
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
		{ aoj: true, name: 'analyze function', shortcut: 'f', fct: function(evt, offset) { return applyOp(offset, 'af'); } },
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
		{ aoj: true, name: 'rename flag', shortcut: 'n', fct: function(evt, offset) { return applyOp(offset, 'fr', 'Name'); } },
		// { name: 'rename function', shortcut: 'r', fct: function(evt, offset) { return applyOp(offset, 'r'); } },
		// { name: 'find references /r', shortcut: 'R', fct: function(evt, offset) { return applyOp(offset, 'R'); } },
		{ aoj: true, name: 'set string', shortcut: 's', fct: function(evt, offset) { return applyOp(offset, 'Cs'); } },
		// { name: 'set strings in current block', shortcut: 'S', fct: function(evt, offset) { return applyOp(offset, 'S'); } },
		// { name: 'undefine metadata here', shortcut: 'u', fct: function(evt, offset) { return applyOp(offset, 'u'); } },
		{ aoj: false, name: 'find xrefs', shortcut: 'x', fct: function(evt, offset) { return displayRes(offset, 'axtj'); } },
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
};

/**
 * Show a list of element in a specific dialog
 */
Disasm.prototype.addLongListDialog = function(list) {
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

			var text;
			if (keys[j] === 'opcode') {
				text = clickableOffsets(list[i][keys[j]]);
			} else if (keys[j] === 'from') {
				var hex = '0x' + list[i][keys[j]].toString(16);
				text = '<a href="javascript:seek(\'' + hex + '\');">0x' + hex + '</a>';
			} else {
				text = list[i][keys[j]];
			}

			td.innerHTML = text;
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
};
