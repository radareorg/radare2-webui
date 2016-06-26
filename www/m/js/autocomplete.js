/**
 * Autocompletion classe, define a way to build an autocompletion process
 * with a fixed set of entries.
 *
 * @param {String} formId - Literal DOM id #field
 * @param {String} choicesId - Literal DOM id #dropdown
 * @param {String} cmd - run into r2 to populate the autocompletion, eg. 'fs *;fj'
 * @param {integer} minChar - number of charcaters to start autocompletion
 * @param {integer} maxProp - maximum propositions to offer
 */
function Autocompletion(formId, choicesId, cmd, minChar, maxProp) {
	this.form_ = formId;
	this.dropdown_ = choicesId;
	this.cmd_ = cmd;
	this.minChar_ = minChar || 2;
	this.maxProp_ = maxProp || 10;
	this.init_();
}

Autocompletion.prototype.Keys = {
	UP: 38,
	DOWN: 40,
	ENTER: 13
};

Autocompletion.prototype.Nodes = {
	EMPTY: {pos: -1, offset: 0, length: 0, name: 'No match!'}
};

Autocompletion.prototype.init_ = function() {
	this.form_ = document.getElementById(this.form_);
	this.dropdown_ = document.getElementById(this.dropdown_);

	var boundKeyUpHandler = this.keyHandler.bind(this);
	this.form_.addEventListener('keyup', boundKeyUpHandler);

	var _this = this;
	this.form_.addEventListener('focus', function() {
		if (_this.prevLength_ >= _this.minChar_) {
			_this.show();
		}
	});

	this.form_.addEventListener('blur', function() {
		_this.hide();
	});

	this.flags_ = undefined;
	this.activeChoice_ = 0;
	this.prevLength_ = 0;
	this.list_;
	this.completions_;

	this.populate_();
};

Autocompletion.prototype.populate_ = function() {
	var _this = this;
	r2.cmdj(this.cmd_, function(f) {
		_this.flags_ = f;
	});
};

Autocompletion.prototype.process_ = function(str) {
	var selectedFlags = [];

	var howMany = 0;
	for (var i = 0 ; i < this.flags_.length ; i++) {
		var offset = this.flags_[i].name.indexOf(str, 0);
		if (offset !== -1) {
			selectedFlags.push({
				pos: howMany++,
				offset: offset,
				length: str.length,
				name: this.flags_[i].name
			});
		}

		if (howMany == this.maxProp_) {
			return selectedFlags;
		}
	}
	return selectedFlags;
};

Autocompletion.prototype.addNode_ = function(item, active) {
	var node = document.createElement('li');
	if (active) {
		node.className = 'active';
	}

	var _this = this;

	node.addEventListener('mouseover', (function(pos) {
		return function() {
			_this.setActiveChoice(pos);
		};
	})(item.pos));

	node.addEventListener('mousedown', (function(pos) {
		return function() {
			_this.setActiveChoice(pos);
			_this.valid();
		};
	})(item.pos));

	var emphasis = document.createElement('strong');
	emphasis.appendChild(document.createTextNode(item.name.substr(item.offset, item.length)));

	node.appendChild(
		document.createTextNode(
			item.name.substr(0, item.offset)));
	node.appendChild(emphasis);
	node.appendChild(
		document.createTextNode(
			item.name.substr(item.offset + item.length, item.name.length - (item.offset + item.length))));
	this.dropdown_.appendChild(node);
};

Autocompletion.prototype.cleanChoices_ = function() {
	// Cleaning old completion
	while (this.dropdown_.firstChild) {
		this.dropdown_.removeChild(this.dropdown_.firstChild);
	}
};

Autocompletion.prototype.setActiveChoice = function(newActive) {
	for (i in this.dropdown_.childNodes) {
		if (i == newActive) {
			this.dropdown_.childNodes[i].className = 'active';
		} else if (i == this.activeChoice_) {
			this.dropdown_.childNodes[i].className = '';
		}
	}
	this.activeChoice_ = newActive;
};

Autocompletion.prototype.keyMovement_ = function(key) {
	if (key == this.Keys.UP && this.activeChoice_ > 0) {
		console.log('UP');
		this.setActiveChoice(this.activeChoice_ - 1);
	}

	if (key == this.Keys.DOWN && this.activeChoice_ < this.dropdown_.childNodes.length - 1) {
		console.log('DOWN');
		this.setActiveChoice(this.activeChoice_ + 1);
	}
};

Autocompletion.prototype.valid = function() {
	if (this.activeChoice_ == -1 || this.dropdown_.childNodes.length <= this.activeChoice_) {
		return;
	}
	this.form_.blur();
	this.prepareView();
	return seek(this.completions_[this.activeChoice_].name);
};

Autocompletion.prototype.show = function() {
	this.dropdown_.style.display = 'block';
};

Autocompletion.prototype.hide = function() {
	this.dropdown_.style.display = 'none';
};

Autocompletion.prototype.keyHandler = function(e) {
	if (e.keyCode == this.Keys.UP || e.keyCode == this.Keys.DOWN) {
		return this.keyMovement_(e.keyCode);
	}

	if (e.keyCode == this.Keys.ENTER) {
		this.hide();
		return this.valid();
	}

	var value = e.target.value;
	this.cleanChoices_();

	if (value.length >= 2) {
		this.show();
		this.completions_ = this.process_(value);
		if (this.prevLength_ !== value.length) {
			this.activeChoice_ = 0;
		}

		// Add them to dropdown
		if (this.completions_.length == 0) {
			this.addNode_(this.Nodes.EMPTY, false);
		} else {
			for (var i in this.completions_) {
				// TODO add eventthis.list_ener (hover) for this.activeChoice_
				this.addNode_(this.completions_[i], i == this.activeChoice_);
			}
		}

		this.prevLength_ = value.length;
	} else {
		this.hide();
	}
};

Autocompletion.prototype.setPrepareView = function(callback) {
	this.preparationCallback = callback;
};

/**
 * Prepare view to show the result
 */
Autocompletion.prototype.prepareView = function() {
	if (typeof this.preparationCallback === 'undefined') {
		return;
	}
	this.preparationCallback();
};
