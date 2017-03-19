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
			'pdc|H',
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)));
	}
}
