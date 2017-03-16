import {BaseWidget} from './BaseWidget';
import {Hexdump} from '../modules/hexdump/Hexdump';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class HexdumpWidget extends BaseWidget {
	constructor() {
		super('Hexdump', 'dark');
	}

	init() {
		r2.cmd('e cfg.bigendian', b => { this.isBigEndian = (b === 'true'); });
		this.firstTime = true;
	}

	draw() {
		if (this.firstTime) {
			this.firstTime = false;
			this.hexdump = new Hexdump(this.node, 24, this.isBigEndian);
			this.hexdump.setOnChangeCallback(function (offset, before, after) {
				console.log('changed');
			});
			r2Wrapper.registerListener(R2Actions.SEEK, () => {
				if (!this.displayed) {
					return;
				}
				this.hexdump.refreshInitialOffset();
				this.hexdump.resetContainer(this.node);
				this.hexdump.draw();
			});
		} else {
			this.hexdump.resetContainer(this.node);
		}

		this.hexdump.draw();
	}
}
