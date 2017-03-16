import {NavigatorDirection} from '../core/NavigatorDirection';
import {InfiniteScrolling} from '../helpers/InfiniteScrolling';

/**  How many screen we want to retrieve in one round-trip with r2 */
export const defaultHeightProvisioning = 3;

export class RadareInfiniteBlock {

	constructor(heightProvisioning = defaultHeightProvisioning) {
		this.heightProvisioning = heightProvisioning
	}

	/**
	 * Helper to delay drawing
	 */
	getCurChunk() {
		return this.curChunk;
	}

	/**
	 * Helper for dynamic callback at first drawing
	 * Allows to place the scroll on current chunk.
	 */
	getFirstElement() {
		return this.firstElement;
	}

	/**
	 * Load the *new* initial offset from the "s" value
	 */
	refreshInitialOffset() {
		r2.cmd('s', (offset) => {
			this.initialOffset = parseInt(offset, 16);
		});
	}

	/**
	 * Gather data and set event to configure infinite scrolling
	 */
	defineInfiniteParams(trigger) {
		var height = (this.container.getBody().offsetHeight === 0) ? 800 : this.container.getBody().offsetHeight;
		this.howManyLines = Math.floor(height / this.lineHeight * this.heightProvisioning);

		var infiniteScrolling = new InfiniteScrolling(
			this.container.getBody(),
			3, /* before, current, after */
			(typeof trigger !== 'undefined') ? trigger : 0.20 /* when there less than 1/5 visible */
		);

		infiniteScrolling.setTopEvent((pos, endCallback) => {
			this.nav.go(NavigatorDirection.BEFORE);
			this.infiniteDrawingContent(NavigatorDirection.BEFORE, pos, endCallback);
		});

		infiniteScrolling.setBottomEvent((pos, endCallback) => {
			this.nav.go(NavigatorDirection.AFTER);
			this.infiniteDrawingContent(NavigatorDirection.AFTER, pos, endCallback);
		});
	}

}
