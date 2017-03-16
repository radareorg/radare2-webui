import {BasePreWidget} from './BasePreWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {formatOffsets} from '../helpers/Format';

const inColor = true; // TODO inColor

export class DisassemblyFunctionsFullWidget extends BasePreWidget {
	constructor() {
		super(
			'Functions (full)',
			x => formatOffsets(x),
			'e scr.color=1;s entry0;s $S;pD $SS;e scr.color=0',
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)));
	}
}
