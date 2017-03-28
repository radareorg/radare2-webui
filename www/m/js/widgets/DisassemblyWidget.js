import {BaseWidget} from './BaseWidget';
import {Disassembly} from '../modules/disasm/Disassembly';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

export class DisassemblyWidget extends BaseWidget {

	constructor() {
		super('Disassembly', 'disasmPanel', 'dark');
	}

	init() {
		this.firstTime = true;
	}

	draw() {
		if (this.firstTime) {
			this.disasm = new Disassembly(this.node, 24);
			r2Wrapper.registerListener(R2Actions.SEEK, () => {
				if (!this.displayed) return;
				this.disasm.refreshInitialOffset();
				this.disasm.resetContainer(this.node);
				this.disasm.draw();
				this.disasm.onSeek();
			});
			this.firstTime = false;
		} else {
			this.disasm.resetContainer(this.node);
		}

		this.disasm.draw();
	}
}
