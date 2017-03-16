import {BasePreWidget} from './BasePreWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {formatOffsets} from '../helpers/Format';

const inColor = true; // TODO inColor

export class DisassemblyDecompileWidget extends BasePreWidget {
	constructor() {
		super(
			'Decompile',
			x => formatOffsets(x),
			'pdc @e:scr.color=1,scr.html=1', // TODO !inColor, 'pdc' only
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)));
	}
}
