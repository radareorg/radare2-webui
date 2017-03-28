import {BaseWidget} from './BaseWidget';
import {Inputs} from '../helpers/Inputs';

import {uiContext} from '../core/UIContext';
import {Widgets} from './Widgets';
import {formatOffsets} from '../helpers/Format';
import {r2Wrapper, R2Actions} from '../core/R2Wrapper';

const inColor = true; // TODO inColor

export class DisassemblyGraphWidget extends BaseWidget {
	constructor() {
		super('Graph', 'dark');
	}

	init() {
		this.backButton = Inputs.iconButton('undo', 'Back to Disassembly', () => uiContext.navigateTo(Widgets.DISASSEMBLY));
		this.backButton.style.position = 'absolute';
		this.backButton.style.top = '1em';
		this.backButton.style.left = '1em';

		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.node.appendChild(this.backButton);
		this.node.appendChild(this.getGraph());
	}

	getGraph() {
		const graph = document.createElement('div');
		graph.style.overflow = 'auto';
		graph.setAttribute(
			'content',
			'user-scalable=yes, width=device-width, minimum-scale=1, maximum-scale=1'
		);

		var tail = inColor ? '|H': '';
		r2.cmd('agf' + tail, (d) => {
			const pre = document.createElement('pre');
			pre.style.color = inColor ? 'white' : 'black';
			pre.appendChild(formatOffsets(d))
			graph.appendChild(pre);
		});

		return graph;
	}
}
