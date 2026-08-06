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

		r2Wrapper.registerListener(R2Actions.SEEK, () => {
			if (this.displayed) {
				this.draw();
			}
		});
	}

	draw() {
		this.node.innerHTML = '';
		this.node.appendChild(Inputs.toolbar(this.backButton));
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
			pre.style.margin = '0.5em';
			pre.style.color = inColor ? 'white' : 'black';
			if (d.trim().length === 0) {
				pre.textContent = 'No graph at the current offset, analyze the function first.';
			} else {
				pre.appendChild(formatOffsets(d))
			}
			graph.appendChild(pre);
		});

		return graph;
	}
}
