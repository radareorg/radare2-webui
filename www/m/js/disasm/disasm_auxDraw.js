Disasm.prototype.drawContextualMenu = function() {
	var _this = this;

	var applyOp = function(offset, cmd) {
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
		{ name: 'analyze function', shortcut: 'f', fct: function(evt, offset) { return applyOp(offset, 'af'); } },
		// { name: 'format', shortcut: 'F', fct: function(evt, offset) { return applyOp(offset, 'F'); } },
		{ name: 'immediate base...', shortcut: 'i', expand: [
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
		{ name: 'rename flag used at cursor', shortcut: 'n', fct: function(evt, offset) { return applyOp(offset, 'fr'); } },
		// { name: 'rename function', shortcut: 'r', fct: function(evt, offset) { return applyOp(offset, 'r'); } },
		// { name: 'find references /r', shortcut: 'R', fct: function(evt, offset) { return applyOp(offset, 'R'); } },
		{ name: 'set string', shortcut: 's', fct: function(evt, offset) { return applyOp(offset, 'Cs'); } },
		// { name: 'set strings in current block', shortcut: 'S', fct: function(evt, offset) { return applyOp(offset, 'S'); } },
		// { name: 'undefine metadata here', shortcut: 'u', fct: function(evt, offset) { return applyOp(offset, 'u'); } },
		{ name: 'find xrefs to current address (./r)', shortcut: 'x', fct: function(evt, offset) { return applyOp(offset, 'axt'); } },
		// { name: 'set as 32bit word', shortcut: 'w', fct: function(evt, offset) { return applyOp(offset, 'w'); } },
		// { name: 'set as 64bit word', shortcut: 'W', fct: function(evt, offset) { return applyOp(offset, 'W'); } }
	];

	var menu = document.createElement('nav');
	menu.id = 'contextmenuDisasm';
	menu.classList.add('context-menu');

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
		if (typeof items[i].expand !== 'undefined') {
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
