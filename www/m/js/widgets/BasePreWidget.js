import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

/**
 * Very simple Widget designed to handle RAW content from R2
 * Would be eventually formatted then encapsulated with <pre> 
 */
export class BasePreWidget extends BaseWidget {

	/**
	 * Creates an instance of BasePreWidget.
	 * @param {any} name Name of the widget, displayed on the top bar
	 * @param {any} formatFunc Function used to format the r2cmd output (used as innerHTML)
	 * @param {any} r2cmd Command executed to obtain the output
	 * @param {any} [backButton=null] Optional button to be inserted into the widget
	 */
	constructor(name, formatFunc, r2cmd, backButton = null) {
		super(name, 'dark');
		this.formatFunc = formatFunc;
		this.r2cmd = r2cmd;
		if (backButton !== null)
			this.backButton = backButton;
	}

	/** @override */
	init() {
		if (typeof this.backButton === 'undefined') {
			return;
		}
		this.backButton.style.position = 'absolute';
		this.backButton.style.top = '1em';
		this.backButton.style.left = '1em';

		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	/** @override */
	draw() {
		if (typeof this.backButton !== 'undefined') {
			this.node.appendChild(this.backButton);
		}
		this.node.appendChild(this.getPre());
	}

	/** Format text from registered r2cmd and provides a <pre> element */
	getPre() {
		const pre = document.createElement('pre');
		r2.cmd(this.r2cmd, output => {
			pre.appendChild(this.formatFunc(output));
		});
		return pre;
	}
}
