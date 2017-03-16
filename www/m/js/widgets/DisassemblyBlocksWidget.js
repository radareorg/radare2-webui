import {BasePreWidget} from './BasePreWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {formatOffsets} from '../helpers/Format';

const inColor = true; // TODO inColor

export class DisassemblyBlocksWidget extends BasePreWidget {
	constructor() {
		super(
			'Blocks',
			x => formatOffsets(x),
			'pdr @e:scr.color=1,scr.html=1', // TODO !inColor, 'pdr' only
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)));
	}
}
