export class FortunesCard {

	get DOM() { return this.card; }

	constructor() {
		this.build();
		this.refresh();
	}

	build() {
		this.card = document.createElement('div');
		this.card.className = 'demo-updates mdl-card mdl-shadow--2dp mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-cell--12-col-desktop';

		const title = document.createElement('div');
		title.className = 'mdl-card__title mdl-card--expand mdl-color--teal-300';
		title.innerHTML = '<h2 class="mdl-card__title-text">Fortunes</h2>';

		this.fortuneBlock = document.createElement('div');
		this.fortuneBlock.className = 'mdl-card__supporting-text mdl-color-text--grey-600';

		const action = document.createElement('div');
		action.className = 'mdl-card__actions mdl-card--border';
		
		const refreshButton = document.createElement('a');
		refreshButton.className = 'mdl-button mdl-js-button';
		refreshButton.innerHTML = 'Next';
		refreshButton.addEventListener('click', () => this.refresh());

		action.appendChild(refreshButton);

		this.card.appendChild(title);
		this.card.appendChild(this.fortuneBlock);
		this.card.appendChild(action);
	}

	refresh() {
		r2.cmd('fo', (fortune) => {
			this.fortuneBlock.textContent = fortune.trim();
		});
	}
}
