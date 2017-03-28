import {r2Wrapper} from '../core/R2Wrapper';
import {Widgets} from '../widgets/Widgets';

const ACKeys = {
	UP: 38,
	DOWN: 40,
	ENTER: 13
}

const ACNodes = {
	EMPTY: {pos: -1, offset: 0, length: 0, name: 'No match!'}
}

/**
 * Autocompletion classe, define a way to build an autocompletion process
 * with a fixed set of entries.
 */
export class Autocompletion {

	/**
	 * @param {String} formId - Literal DOM id #field
	 * @param {String} choicesId - Literal DOM id #dropdown
	 * @param {String} cmd - run into r2 to populate the autocompletion, eg. 'fs *;fj'
	 * @param {integer} minChar - number of charcaters to start autocompletion
	 * @param {integer} maxProp - maximum propositions to offer
	 */
	constructor(formId, choicesId, cmd, minChar, maxProp) {
		this.form_ = formId;
		this.dropdown_ = choicesId;
		this.cmd_ = cmd;
		this.minChar_ = minChar || 2;
		this.maxProp_ = maxProp || 10;
		this.init_();
	}

	init_() {
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

		this.flags_;
		this.activeChoice_ = 0;
		this.prevLength_ = 0;
		this.list_;
		this.completions_;

		this.populate_();
	}

	populate_() {
		var _this = this;
		r2.cmdj(this.cmd_, function(f) {
			_this.flags_ = f;
		});
	}

	process_(str) {
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

			if (howMany === this.maxProp_) {
				return selectedFlags;
			}
		}
		return selectedFlags;
	}

	addNode_(item, active) {
		const node = document.createElement('li');
		if (active) {
			node.className = 'active';
		}

		node.addEventListener('mouseover', () => this.setActiveChoice(item.pos));

		node.addEventListener('mousedown', () => {
			this.setActiveChoice(item.pos);
			this.valid();
		});

		const emphasis = document.createElement('strong');
		emphasis.appendChild(document.createTextNode(item.name.substr(item.offset, item.length)));

		node.appendChild(
			document.createTextNode(
				item.name.substr(0, item.offset)));
		node.appendChild(emphasis);
		node.appendChild(
			document.createTextNode(
				item.name.substr(item.offset + item.length, item.name.length - (item.offset + item.length))));
		this.dropdown_.appendChild(node);
		console.log(node);
	}

	cleanChoices_() {
		// Cleaning old completion
		while (this.dropdown_.firstChild) {
			this.dropdown_.removeChild(this.dropdown_.firstChild);
		}
	}

	setActiveChoice(newActive) {
		let i = 0;
		for (let child of this.dropdown_.children) {
			child.className = i === newActive ? 'active' : '';
			i += 1;
		}
		this.activeChoice_ = newActive;
	}

	keyMovement_(key) {
		if (key === ACKeys.UP && this.activeChoice_ > 0) {
			console.log('UP');
			this.setActiveChoice(this.activeChoice_ - 1);
		}

		if (key === ACKeys.DOWN && this.activeChoice_ < this.dropdown_.childNodes.length - 1) {
			console.log('DOWN');
			this.setActiveChoice(this.activeChoice_ + 1);
		}
	}

	valid() {
		if (this.activeChoice_ === -1 || this.dropdown_.childNodes.length <= this.activeChoice_) {
			return;
		}
		this.hide();
		this.prepareView();
		return r2Wrapper.seek(this.completions_[this.activeChoice_].name, Widgets.DISASSEMBLY);
	}

	show() {
		this.dropdown_.style.display = 'block';
	}

	hide() {
		this.dropdown_.style.display = 'none';
	}

	keyHandler(e) {
		if (e.keyCode === ACKeys.UP || e.keyCode === ACKeys.DOWN) {
			return this.keyMovement_(e.keyCode);
		}

		if (e.keyCode === ACKeys.ENTER) {
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
			if (this.completions_.length === 0) {
				this.addNode_(ACNodes.EMPTY, false);
			} else {
				for (var i in this.completions_) {
					// TODO add eventthis.list_ener (hover) for this.activeChoice_
					this.addNode_(this.completions_[i], i === this.activeChoice_);
				}
			}

			this.prevLength_ = value.length;
		} else {
			this.hide();
		}
	}

	setPrepareView(callback) {
		this.preparationCallback = callback;
	}

	/**
	 * Prepare view to show the result
	 */
	prepareView() {
		if (typeof this.preparationCallback === 'undefined') {
			return;
		}
		this.preparationCallback();
	}
}
