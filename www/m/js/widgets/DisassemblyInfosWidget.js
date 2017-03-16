import {BasePreWidget} from './BasePreWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';

const inColor = true; // TODO inColor

export class DisassemblyInfosWidget extends BasePreWidget {
	constructor() {
		super(
			'Infos',
			x => {
				const container = document.createElement('span');
				container.innerHTML = x;
				return container;
			},			'afi',
			Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY)));
	}
}
