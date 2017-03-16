import {UpdateManager} from '../helpers/UpdateManager';
import {Layouts} from './Layouts';

/**
 * Making a splittable container zone
 */
export class ContainerZone {
	
	constructor(containerNode, rulerNode, titleNode) {
		this.container = document.getElementById(containerNode);
		this.ruler = document.getElementById(rulerNode);
		this.title = document.getElementById(titleNode);
		this.currentLayout = Layouts.FULL;
		this.widgets = [];
		this.populatedWidgets = [];
		this.initRuler();

		this.focus_ = 0;
		this.focusListeners = [];

		var _this = this;
		this.fallback = function() {
			var emptyWidget = _this.getWidget('New Widget', false);
			emptyWidget.setHTMLContent('<p class="mdl-typography--text-center">Ready !</p>');
			_this.add(emptyWidget);
		};

		this.updateManagers = {};
		this.updateManagers.updates = new UpdateManager();
		this.updateManagers.lastViews = new UpdateManager();

		this.addFocusListener(this.updateManagers.updates);
		this.addFocusListener(this.updateManagers.lastViews);
	}
	
	/**
	 * Define the widget method that would be called when splitting
	 */
	fallbackWidget(callback) {
		this.fallback = callback;
	}

	initRuler() {
		var context = {};
		var _this = this;

		this.rulerProp = {
			gap: 0.005, // 0.5% margin between two panels
			pos: 0.5
		};

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
			var relativePosition = (e.clientX - context.interval) / _this.container.offsetWidth;
			_this.rulerProp.pos = relativePosition;
			_this.container.children[0].style.width = (relativePosition - _this.rulerProp.gap) * 100 + '%';
			_this.container.children[1].style.width = ((1 - relativePosition) - _this.rulerProp.gap) * 100 + '%';
			_this.ruler.style.marginLeft = relativePosition * 100 + '%';
		};

		var stopDrag = function() {
			document.documentElement.removeEventListener('mousemove', doDrag, false);
			document.documentElement.removeEventListener('mouseup', stopDrag, false);
		};

		this.ruler.addEventListener('mousedown', initDrag);
	}

	setFocus(focus) {
		this.focus_ = focus;
		for (var i = 0 ; i < this.focusListeners.length ; i++) {
			this.focusListeners[i].focusHasChanged(focus);
		}
	}

	getFocus() {
		return this.focus_;
	}

	/**
	 * Autobinding implies the widget to be populated as is
	 * Will be completed by the user manipulating the widget
	 */
	getWidget(name, autobinding) {
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
	}

	getWidgetDOMWrapper(widget) {
		var offset = this.populatedWidgets.indexOf(widget);
		if (offset === -1) {
			console.log('Can\'t get DOM wrapper of a non-populated widget');
			return;
		}

		return this.container.children[offset];
	}

	isSplitted() {
		return this.currentLayout !== Layouts.FULL;
	}

	merge() {
		if (!this.isSplitted()) {
			return;
		}

		// Reset and clear
		this.ruler.style.marginLeft = '50%';
		this.ruler.style.display = 'none';
		this.rulerProp.pos = 0.5;

		var keep = this.getWidgetDOMWrapper(this.populatedWidgets[this.getFocus()]);
		keep.className = 'rwidget full focus';
		keep.style.width = 'auto';

		for (var i = 0 ; i < this.container.children.length ; i++) {
			if (i !== this.getFocus()) {
				this.container.removeChild(this.container.children[i]);
				this.populatedWidgets.splice(i, 1);
			}
		}

		this.setFocus(0);
		this.currentLayout = Layouts.FULL;
		this.drawTitle();
	}

	split(layout) {
		if (this.isSplitted()) {
			return;
		}

		this.ruler.style.display = 'block';
		this.container.children[0].style.width = (this.rulerProp.pos - this.rulerProp.gap) * 100 + '%';

		for (var i = 0 ; i < this.populatedWidgets.length ; i++) {
			this.getWidgetDOMWrapper(this.populatedWidgets[i]).classList.remove('full');
			this.getWidgetDOMWrapper(this.populatedWidgets[i]).classList.add(layout);
		}

		this.currentLayout = layout;

		if (this.populatedWidgets.length <= 1) {
			// We pop the fallback widget
			this.fallback();
		}

		// We want to set the focus on the space
		this.setFocus(1);
		this.drawTitle();
	}

	/**
	 * Tell if the widget is currently displayed (careful to case sensitivity)
	 */
	getCurrentlyDrawn() {
		var list = [];
		for (var i = 0 ; i < this.populatedWidgets.length ; i++) {
			list.push(this.populatedWidgets[i].name);
		}
		return list;
	}

	add(widget) {
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
				this.container.removeChild(this.container.children[this.getFocus()]); // from DOM
				this.populatedWidgets.splice(this.getFocus(), 1);
			}

			if (this.getFocus() === 0 && layoutFull) { // Poping first
				this.populatedWidgets.unshift(widget);
				if (!widget.isAlreadyThere()) {
					this.container.insertBefore(widgetElement, this.container.children[0]);
					this.container.children[0].style.width = (this.rulerProp.pos - this.rulerProp.gap) * 100 + '%';
				}
			} else { // Second panel
				this.populatedWidgets.push(widget);
				if (!widget.isAlreadyThere()) {
					this.container.appendChild(widgetElement);
					this.container.children[1].style.width = ((1 - this.rulerProp.pos) - this.rulerProp.gap) * 100 + '%';
				}
			}
		} else {
			if (this.populatedWidgets.length >= 1) {
				this.container.removeChild(this.container.children[this.getFocus()]); // from DOM
			}
			this.populatedWidgets = [widget];
			if (!widget.isAlreadyThere()) {
				this.container.appendChild(widgetElement);
				this.container.children[0].style.width = 'auto';
			}
		}

		this.moveFocusOnWidget(widget);
		this.applyFocusEvent_(widget);
		widget.setOffset(this.getFocus());
		this.drawTitle();
	}

	moveFocusOnWidget(widget) {
		this.setFocus(this.populatedWidgets.indexOf(widget));
		this.container.children[this.getFocus()].classList.add('focus');

		if (this.isSplitted()) {
			this.container.children[(this.getFocus() + 1) % 2 ].classList.remove('focus');
		}

		this.drawTitle();
	}

	drawTitle() {
		if (this.currentLayout === Layouts.FULL || this.populatedWidgets.length === 1) {
			this.title.innerHTML = this.populatedWidgets[0].getName();
		} else {
			var titles = [];
			for (var i = 0 ; i < this.populatedWidgets.length ; i++) {
				if (this.getFocus() === i) {
					titles.push('<strong>' + this.populatedWidgets[i].getName() + '</strong>');
				} else {
					titles.push(this.populatedWidgets[i].getName());
				}
			}
			this.title.innerHTML = titles.join(' & ');
		}
	}

	applyFocusEvent_(widget) {
		var _this = this;
		var element = this.getWidgetDOMWrapper(widget);
		element.addEventListener('mousedown', function() {
			_this.moveFocusOnWidget(widget);
		});
	}

	addFocusListener(obj) {
		this.focusListeners.push(obj);
	}
}
