import {AnalysisCard} from './AnalysisCard';
import {EntropyCard} from './EntropyCard';
import {FortunesCard} from './FortunesCard';
import {GraphCard} from './GraphCard';
import {InfoCard} from './InfoCard';

export class Overview {

	get DOM() { return this.dom; }

	constructor() {
		this.analysisCard = new AnalysisCard();
		this.entropyCard = new EntropyCard(600, 120);
		this.fortuneCard = new FortunesCard();
		this.graphCard = new GraphCard();
		this.infoCard = new InfoCard();

		this.build();

		this.analysisCard.onAnalysis = () => {
		  this.entropyCard.refresh();
		  this.graphCard.refresh();
		  this.infoCard.refresh();
		};
	}

	build() {
		this.dom = document.createElement('div');
		this.dom.className = 'mdl-grid demo-content';

		const rightPanelsContainer = document.createElement('div');
		rightPanelsContainer.className = 'demo-cards mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-grid mdl-grid--no-spacing';

		const separator = document.createElement('div');
		separator.className = 'demo-separator mdl-cell--1-col';

		rightPanelsContainer.appendChild(this.fortuneCard.DOM);
		rightPanelsContainer.appendChild(separator);
		rightPanelsContainer.appendChild(this.analysisCard.DOM);

		this.dom.appendChild(this.infoCard.DOM);
		this.dom.appendChild(rightPanelsContainer);
		this.dom.appendChild(this.entropyCard.DOM);
		this.dom.appendChild(this.graphCard.DOM);
	}

	refresh() {
		this.analysisCard.refresh();
		this.entropyCard.refresh();
		this.fortuneCard.refresh();
		this.graphCard.refresh();
		this.infoCard.refresh();
	}

	adjustLayout() {
		window.addEventListener('resize', () => this.infoCard.fixHeight(300), true);
		this.infoCard.fixHeight(300);
	}
}
