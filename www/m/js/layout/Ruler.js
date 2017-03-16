/** Ruler component for splitted layout */
export class Ruler {

	get position() { return this._position; }
	set position(value) {
		this._position = value;
		this.triggerListeners();
	}

	constructor(containerNode, rulerNode) {
		this.containerNode = containerNode;
		this.rulerNode = rulerNode;

		this.listeners = [];
		this.moving = false;
		this.position = 0.5;

		this.init();
		this.reset();

		this.addListeners((position) => this.move(position));
	}

	/** Add events listeners on the node */
	init() {
		const doDrag = (e) => {
			e.preventDefault();
			const containerBoundingBox = this.containerNode.getBoundingClientRect();
			this.position = (e.clientX - containerBoundingBox.left) / containerBoundingBox.width;
		};

		const stopDrag = () => {
			document.documentElement.removeEventListener('mousemove', doDrag, false);
			document.documentElement.removeEventListener('mouseup', stopDrag, false);
		};

		this.rulerNode.addEventListener('mousedown', (e) => {
			document.documentElement.addEventListener('mousemove', doDrag, false);
			document.documentElement.addEventListener('mouseup', stopDrag, false);
		});
	}

	/** Invoke listener with new position */
	triggerListeners() {
		this.listeners.forEach(l => l(this.position));
	}

	addListeners(fn) {
		this.listeners.push(fn);
	}

	/** Move the ruler between [0;1] */
	move(position) {
		this.rulerNode.style.marginLeft = (position) * 100 + '%';
	}

	/** Place the ruler in the middle (doesn't change display mode) */
	reset() {
		this.position = 0.5;
		this.move(0.5);
	}

	show() {
		this.rulerNode.style.display = 'block';
	}

	hide() {
		this.rulerNode.style.display = 'none';
	}
}
