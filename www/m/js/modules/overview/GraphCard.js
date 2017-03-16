import {uiContext} from '../../core/UIContext';
import {r2Wrapper} from '../../core/R2Wrapper';
import {Widgets} from '../../widgets/Widgets';

export class GraphCard {

	get DOM() { return this.card; }

	constructor() {
		this.build();
	}

	build() {
		this.card = document.createElement('div');
		this.card.className = 'demo-charts mdl-color--white mdl-shadow--2dp mdl-cell mdl-cell--12-col mdl-grid';

		const codeChart = this.createChart('code', 'Go to assembly', undefined, 82, () => {
			r2Wrapper.seek('entry0', Widgets.DISASSEMBLY);
		});
		const dataChart = this.createChart('data', 'Go to hexdump', undefined, 22, () => {
			r2Wrapper.seek('0x00', Widgets.HEXDUMP);
		});
		const stringsChart = this.createChart('strings', 'Go to strings', undefined, 4, () => { uiContext.navigateTo(Widgets.STRINGS); });
		const functionsChart = this.createChart('functions', 'Go to functions', undefined, 82, () => { uiContext.navigateTo(Widgets.FUNCTIONS) });

		this.card.appendChild(codeChart);
		this.card.appendChild(dataChart);
		this.card.appendChild(stringsChart);
		this.card.appendChild(functionsChart);
	}

	createChart(name, title, color, value, onclick) {
		const xmlns = "http://www.w3.org/2000/svg";
		const svg = document.createElementNS(xmlns, 'svg');
		svg.setAttribute('class', 'demo-chart mdl-cell mdl-cell--4-col mdl-cell--3-col-desktop');
		svg.setAttribute('fill', 'currentColor');
		svg.setAttribute('viewBox', '0 0 1 1');
		svg.setAttribute('width', '200px');
		svg.setAttribute('height', '200px');
		svg.setAttribute('title', title);

		svg.addEventListener('click', onclick);

		const use = document.createElementNS(xmlns, 'use');
		use.setAttributeNS('http://www.w3.org/1999/xlink', 'href', '#piechart');
		use.setAttribute('mask', 'url(#piemask)');
		svg.appendChild(use);

		const textLegend = document.createElementNS(xmlns, 'text');
		textLegend.setAttribute('x', '0.3');
		textLegend.setAttribute('y', '0.2');
		textLegend.setAttribute('font-family', 'Roboto');
		textLegend.setAttribute('font-size', '0.1');
		textLegend.setAttribute('fill', '#888');
		textLegend.setAttribute('text-anchor', 'top');
		textLegend.setAttribute('dy', '0.1');
		textLegend.textContent = name;
		svg.appendChild(textLegend);

		const textValue = document.createElementNS(xmlns, 'text');
		textValue.setAttribute('x', '0.5');
		textValue.setAttribute('y', '0.5');
		textValue.setAttribute('font-family', 'Roboto');
		textValue.setAttribute('font-size', '0.3');
		textValue.setAttribute('fill', '#888');
		textValue.setAttribute('text-anchor', 'middle');
		textValue.setAttribute('dy', '0.1');
		textValue.textContent = value;
		svg.appendChild(textValue);

		const textPercentage = document.createElementNS(xmlns, 'tspan');
		textPercentage.setAttribute('dy', '-0.07');
		textPercentage.setAttribute('font-size', '0.2');
		textPercentage.textContent = '%';
		textValue.appendChild(textPercentage);
		
		return svg;
	}

	refresh() {
		// Do nothing yet
	}
}
