/**
 * Making a splittable container zone
 */
function ContainerZone(containerNode, rulerNode, titleNode) {
	this.container = document.getElementById(containerNode);
	this.ruler = document.getElementById(rulerNode);
	this.title = document.getElementById(titleNode);
	this.focus = 0;
	this.currentLayout = this.Layout.FULL;
	this.widgets = [];
	this.populatedWidgets = [];
	this.initRuler();


	var emptyWidget = this.getWidget('New Widget', false);
	emptyWidget.setHTMLContent('<p class="mdl-typography--text-center">Ready !</p>');
}

ContainerZone.prototype.Layout = {
	FULL: 'full',
	HORIZONTAL: 'horizontal',
	VERTICAL: 'vertical'
};

ContainerZone.prototype.initRuler = function() {
	var context = {};
	var _this = this;

	var initDrag = function(e) {
		context = {
			startX: e.clientX,
			startWidth: parseInt(document.defaultView.getComputedStyle(_this.ruler).width, 10),
			interval: (e.clientX - _this.ruler.offsetLeft)
		};
		document.documentElement.addEventListener('mousemove', doDrag, false);
		document.documentElement.addEventListener('mouseup', stopDrag, false);

		// Prevent selecting text
		e.preventDefault();
	};

	var doDrag = function(e) {
		var gap = 0.005; // 0.5% margin between two panels
		var relativePosition = (e.clientX - context.interval) / _this.container.offsetWidth;
		_this.container.children[0].style.width = (relativePosition - gap) * 100 + '%';
		_this.container.children[1].style.width = ((1 - relativePosition) - gap) * 100 + '%';
		_this.ruler.style.marginLeft = relativePosition * 100 + '%';
	};

	var stopDrag = function() {
		document.documentElement.removeEventListener('mousemove', doDrag, false);
		document.documentElement.removeEventListener('mouseup', stopDrag, false);
	};

	this.ruler.addEventListener('mousedown', initDrag);
};

/**
 * Autobinding implies the widget to be populated as is
 * Will be completed by the user manipulating the widget
 */
ContainerZone.prototype.getWidget = function(name, autobinding) {
	var autobinding = (typeof autobinding === 'undefined'); // Default is true

	for (var i = 0 ; i < this.widgets.length ; i++) {
		if (this.widgets[i].getName() === name) {
			if (autobinding) { // Autobinding
				this.add(this.widgets[i]);
			}
			return this.widgets[i];
		}
	}

	var newWidget = new Widget(name);
	this.widgets.push(newWidget);

	if (autobinding) {
		this.add(newWidget);
	}

	return newWidget;
};

ContainerZone.prototype.getWidgetDOMWrapper = function(widget) {
	var offset = this.populatedWidgets.indexOf(widget);
	if (offset === -1) {
		console.log('Can\'t get DOM wrapper of a non-populated widget');
		return;
	}

	return this.container.children[offset];
};

ContainerZone.prototype.isSplitted = function() {
	return this.currentLayout !== this.Layout.FULL;
};

ContainerZone.prototype.merge = function() {
	if (!this.isSplitted()) {
		return;
	}

	this.ruler.style.display = 'none';

	var keep = this.getWidgetDOMWrapper(this.populatedWidgets[this.focus]);
	keep.className = 'rwidget full focus';

	for (var i = 0 ; i < this.container.children.length ; i++) {
		if (i != this.focus) {
			this.container.removeChild(this.container.children[i]);
			this.populatedWidgets.splice(i, 1);
		}
	}

	this.focus = 0;
	this.currentLayout = this.Layout.FULL;
	this.drawTitle();
};

ContainerZone.prototype.split = function(layout) {
	if (this.isSplitted()) {
		return;
	}

	this.ruler.style.display = 'block';

	for (var i = 0 ; i < this.populatedWidgets.length ; i++) {
		this.getWidgetDOMWrapper(this.populatedWidgets[i]).classList.remove('full');
		this.getWidgetDOMWrapper(this.populatedWidgets[i]).classList.add(layout);
	}

	this.currentLayout = layout;

	if (this.populatedWidgets.length <= 1) {
		var emptyWidget = this.getWidget('New Widget');
		this.add(emptyWidget);
	}

	// We want to set the focus on the space
	this.focus = 1;
	this.drawTitle();
};

ContainerZone.prototype.add = function(widget) {
	if (this.populatedWidgets.indexOf(widget) !== -1) {
		// Can't open the same panel more than once: draw() should be called
		return;
	}

	// Special case at beginning when the widget is already loaded
	if (widget.isAlreadyThere()) {
		this.populatedWidgets.push(widget);
		this.applyFocusEvent_(widget);
		return;
	}

	var widgetElement = document.createElement('div');
	widgetElement.classList.add('rwidget');
	widgetElement.classList.add(this.currentLayout);
	widget.binding(widgetElement);

	if (this.isSplitted()) {
		var layoutFull = this.populatedWidgets.length >= 2;

		// If the container is full, we remove the active widget
		if (layoutFull) {
			// TODO, handle default width 50% -> doesn't consider previous resizing
			this.container.removeChild(this.container.children[this.focus]); // from DOM
			this.populatedWidgets.splice(this.focus, 1);
		}

		if (this.focus === 0 && layoutFull) { // Poping first
			this.populatedWidgets.unshift(widget);
			if (!widget.isAlreadyThere()) {
				this.container.insertBefore(widgetElement, this.container.children[0]);
			}
		} else { // Second panel
			this.populatedWidgets.push(widget);
			if (!widget.isAlreadyThere()) {
				this.container.appendChild(widgetElement);
			}
		}
	} else {
		if (this.populatedWidgets.length >= 1) {
			this.container.removeChild(this.container.children[this.focus]); // from DOM
		}
		this.populatedWidgets = [widget];
		if (!widget.isAlreadyThere()) {
			this.container.appendChild(widgetElement);
		}
	}

	this.setFocus(widget);
	this.applyFocusEvent_(widget);
	this.drawTitle();
};

ContainerZone.prototype.setFocus = function(widget) {
	this.focus = this.populatedWidgets.indexOf(widget);
	this.container.children[this.focus].classList.add('focus');

	if (this.isSplitted()) {
		this.container.children[(this.focus + 1) % 2 ].classList.remove('focus');
	}

	this.drawTitle();
};

ContainerZone.prototype.drawTitle = function() {
	if (this.layout === this.Layout.FULL || this.populatedWidgets.length === 1) {
		this.title.innerHTML = this.populatedWidgets[0].getName();
	} else {
		var titles = [];
		for (var i = 0 ; i < this.populatedWidgets.length ; i++) {
			if (this.focus == i) {
				titles.push('<strong>' + this.populatedWidgets[i].getName() + '</strong>');
			} else {
				titles.push(this.populatedWidgets[i].getName());
			}
		}
		this.title.innerHTML = titles.join(' & ');
	}
};

ContainerZone.prototype.applyFocusEvent_ = function(widget) {
	var _this = this;
	var element = this.getWidgetDOMWrapper(widget);
	element.addEventListener('click', function() {
		_this.setFocus(widget);
	});
};

function Widget(name, identifier) {
	this.name = name;
	this.identifier = identifier;

	if (typeof identifier !== 'undefined') {
		this.DOMWrapper = document.getElementById(identifier);
	}
}

Widget.prototype.binding = function(domElement) {
	this.DOMWrapper = domElement;
	if (typeof this.content !== 'undefined') {
		this.DOMWrapper.innerHTML = this.content;
	}
};

Widget.prototype.setHTMLContent = function(content) {
	this.content = content;
};

Widget.prototype.getName = function() {
	return this.name;
};

Widget.prototype.getIdentifier = function() {
	return this.identifier;
};

/**
 * Identify the special case where the content is already here, in the page
 */
Widget.prototype.isAlreadyThere = function() {
	return (typeof this.identifier !== 'undefined');
};
