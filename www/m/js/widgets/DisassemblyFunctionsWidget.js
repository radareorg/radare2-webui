import {BasePreWidget} from './BasePreWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';

const inColor = true; // TODO inColor

export class DisassemblyFunctionsWidget extends BasePreWidget {
	constructor() {
		super(
			'Functions',
			x => {
				const container = document.createElement('span');
				container.innerHTML = x;
				return container;
			},
			'pdf @e:asm.lineswidth=0|H',  // TODO, tail !inColor = @e:asm.lineswidth=0
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)));
	}
}
