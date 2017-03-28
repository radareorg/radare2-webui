/**
 * BaseWidget is an abstract class which wrap a Widget
 * This abstraction ensure two concerns:
 *  - A Widget can be instanciated several times if we want
 *  - A Widget shouldn't be bothered by dimension change (TODO)
 */
export class BaseWidget {

	/** Node provided by UIContext to draw content */
	get rootNode() { return this._rootNode; }

	/** Node provided by the Widget to draw content */
	get node() { return this._node; }

	/** Pass the widgetContainer instance with name of the widget */
	constructor(name, ...classNames) {
		this.name = name;
		this.classNames = classNames;
		this.classNames.push('rwidget');
		this.init();

		this.focused = false;
		this.displayed = false;
	}

	/** Init the module used inside component, called once */
	init() { }

	/** Define what should be done to render the Widget */
	drawWidget(destinationNode, ...args) {
		this._node = destinationNode;
		this._rootNode = destinationNode;
		this._rootNode.focus();

		// Set state
		this.displayed = true;
		this.focused = true;

		// Clear previous content
		this._node.innerHTML = '';
		this._node.className = '';

		// Apply CSS classes
		this.classNames.forEach(className => this._rootNode.classList.add(className));

		// Insert content
		this.draw(...args);
	}

	/** Method to insert content to Widget.node */
	draw(...args) { }

	/** When focus is gained */
	gotFocus() {
		this.gotDisplay();
		this.focused = true;
	}

	/** When focus is lost */
	lostFocus() {
		this.focused = false;
	}

	/** When widget is displayed */
	gotDisplay() {
		this.displayed = true;
	}

	/** When widget is replaced */
	lostDisplay() {
		this.lostFocus();
		this.displayed = false;
	}
}
