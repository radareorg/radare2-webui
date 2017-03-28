import { BaseWidget } from './BaseWidget';
import { Overview } from '../modules/overview/Overview'
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

/**
 * @class OverviewWidget
 * @extends {BaseWidget}
 */
export class OverviewWidget extends BaseWidget {

	/** Creates an instance of OverviewWidget */
	constructor() {
		super('Overview');
	}

	/** @override*/
	init() {
		this.overview = new Overview();
		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	/** @override*/
	draw(...args) {
		this.node.appendChild(this.overview.DOM);
		this.overview.adjustLayout();
		componentHandler.upgradeDom();
	}
}
