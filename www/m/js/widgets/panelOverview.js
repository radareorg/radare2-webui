var headersCmd = {
	symbols: {
		cmd: 'isq',
		grep: '!imp',
		ready: false
	},
	imports: {
		cmd: 'isq',
		grep: 'imp.',
		ready: false
	},
	relocs: {
		cmd: 'ir',
		grep: null,
		ready: false
	},
	sections: {
		cmd: 'iSq',
		grep: null,
		ready: false
	},
	strings: {
		cmd: 'izq',
		grep: null,
		ready: false
	},
	sdb: {
		cmd: 'k bin/cur/***',
		grep: null,
		ready: false
	}
};

var infoCellHeight = -1;

function panelOverview() {
	var widget = widgetContainer.getWidget('Overview');
	var c = widgetContainer.getWidgetDOMWrapper(widget);

	lastViews.registerMethod(widget.getOffset(), panelDisasm);
	updates.registerMethod(widget.getOffset(), function() {});

	var out = '<div class="mdl-grid demo-content">';
	out += '<div class="demo-graphs mdl-shadow--2dp mdl-color--white mdl-cell mdl-cell--8-col" id="info-cell">';
	out += '	<div class="mdl-tabs mdl-js-tabs">';
	out += '		<div class="mdl-tabs__tab-bar" id="overview-tabs">';
	out += '			<a href="#tab-info" class="mdl-tabs__tab is-active">Headers</a>';
	out += '			<a href="#tab-symbols" class="mdl-tabs__tab" onclick="overviewLoad(this, headersCmd.symbols)">Symbols</a>';
	out += '			<a href="#tab-imports" class="mdl-tabs__tab" onclick="overviewLoad(this, headersCmd.imports)">Imports</a>';
	out += '			<a href="#tab-relocs" class="mdl-tabs__tab" onclick="overviewLoad(this, headersCmd.relocs)">Relocs</a>';
	out += '			<a href="#tab-sections" class="mdl-tabs__tab" onclick="overviewLoad(this, headersCmd.sections)">Sections</a>';
	out += '			<a href="#tab-strings" class="mdl-tabs__tab" onclick="overviewLoad(this, headersCmd.strings)">Strings</a>';
	out += '			<a href="#tab-sdb" class="mdl-tabs__tab" onclick="overviewLoad(this, headersCmd.sdb)">SDB</a>';
	out += '		</div>';
	out += '		<div id="overview-content">';
	out += '			<div class="mdl-tabs__panel is-active" id="tab-info"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-symbols"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-infos"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-imports"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-relocs"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-sections"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-strings"></div>';
	out += '			<div class="mdl-tabs__panel" id="tab-sdb"></div>';
	out += '		</div>';
	out += '	</div>';
	out += '</div>';

	out += '<div class="demo-cards mdl-cell mdl-cell--4-col mdl-cell--8-col-tablet mdl-grid mdl-grid--no-spacing">';
	out += '	<div class="demo-updates mdl-card mdl-shadow--2dp mdl-cell mdl-cell--4-col mdl-cell--4-col-tablet mdl-cell--12-col-desktop">';
	out += '		<div class="mdl-card__title mdl-card--expand mdl-color--teal-300">';
	out += '			<h2 class="mdl-card__title-text">Fortunes</h2>';
	out += '		</div>';
	out += '		<div class="mdl-card__supporting-text mdl-color-text--grey-600" id="fortune">';
	out += '			Always use r2 from git';
	out += '		</div>';
	out += '		<div class="mdl-card__actions mdl-card--border">';
	out += '			<a href="javascript:updateFortune()" class="mdl-button mdl-js-button mdl-js-ripple-effect">Next</a>';
	out += '		</div>';
	out += '	</div>';
	out += '	<div class="demo-separator mdl-cell--1-col"></div>';
	out += '	<div class="demo-options mdl-card mdl-color--teal-300 mdl-shadow--2dp mdl-cell mdl-cell--4-col mdl-cell--3-col-tablet mdl-cell--12-col-desktop">';
	out += '		<div class="mdl-card__supporting-text mdl-color-grey-600">';
	out += '			<h3 class="mdl-cart__title-text">Analysis Options</h3>';
	out += '			<ul>';
	out += '				<li>';
	out += '					<label for="anal_symbols" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">';
	out += '						<input type="checkbox" id="anal_symbols" class="mdl-checkbox__input" />';
	out += '						<span id="anal_symbols" class="mdl-checkbox__label">Analyze symbols</span>';
	out += '					</label>';
	out += '				</li>';
	out += '				<li>';
	out += '					<label for="anal_calls" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">';
	out += '						<input id="anal_calls" type="checkbox" class="mdl-checkbox__input" />';
	out += '						<span class="mdl-checkbox__label">Analyze calls</span>';
	out += '					</label>';
	out += '				</li>';
	out += '				<li>';
	out += '					<label for="anal_emu" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">';
	out += '						<input id="anal_emu" type="checkbox" class="mdl-checkbox__input" />';
	out += '						<span class="mdl-checkbox__label">Emulate code</span>';
	out += '					</label>';
	out += '				</li>';
	out += '				<li>';
	out += '					<label for="anal_prelude" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">';
	out += '						<input id="anal_prelude" type="checkbox" class="mdl-checkbox__input" />';
	out += '						<span class="mdl-checkbox__label">Find preludes</span>';
	out += '					</label>';
	out += '				</li>';
	out += '				<li>';
	out += '					<label for="anal_autoname" class="mdl-checkbox mdl-js-checkbox mdl-js-ripple-effect">';
	out += '						<input type="checkbox" id="anal_autoname" class="mdl-checkbox__input" />';
	out += '						<span id="anal_autoname" class="mdl-checkbox__label">Autoname fcns</span>';
	out += '					</label>';
	out += '				</li>';
	out += '			</ul>';
	out += '		</div>';
	out += '		<div class="mdl-card__actions mdl-card--border">';
	out += '			<a href="#" id="analyze_button" class="mdl-button mdl-js-button mdl-js-ripple-effect mdl-color--blue-grey-50 mdl-color-text--blue-greu-50">Analyze</a>';
	out += '			<div class="mdl-layout-spacer"></div>';
	out += '			<i class="material-icons">room</i>';
	out += '		</div>';
	out += '	</div>';
	out += '</div>';
	out += '<div class="demo-charts mdl-color--white mdl-shadow--2dp mdl-cell mdl-cell--12-col mdl-grid">';
	out += '	<h3>Entropy</h3>';
	out += '	<svg fill="currentColor" viewBox="0 0 500 80" id="entropy-graph"></svg>';
	out += '</div>';

	out += '<div class="demo-charts mdl-color--white mdl-shadow--2dp mdl-cell mdl-cell--12-col mdl-grid">';
	out += '	<svg fill="currentColor" width="200px" height="200px" viewBox="0 0 1 1" class="demo-chart mdl-cell mdl-cell--4-col mdl-cell--3-col-desktop clickable" onclick="panelDisasm();seek(\'entry0\');" title="Go to disassembly">';
	out += '		<use xlink:href="#piechart" mask="url(#piemask)" />';
	out += '		<text x="0.3" y="0.2" font-family="Roboto" font-size="0.1" fill="#888" text-anchor="top" dy="0.1">code</text>';
	out += '		<text x="0.5" y="0.5" font-family="Roboto" font-size="0.3" fill="#888" text-anchor="middle" dy="0.1">82<tspan font-size="0.2" dy="-0.07">%</tspan></text>';
	out += '	</svg>';
	out += '	<svg fill="currentColor" width="200px" height="200px" viewBox="0 0 1 1" class="demo-chart mdl-cell mdl-cell--4-col mdl-cell--3-col-desktop clickable" onclick="panelHexdump();seek(\'0x00\');" title="Go to hexdump">';
	out += '		<use xlink:href="#piechart2" mask="url(#piemask)" />';
	out += '		<text x="0.3" y="0.2" font-family="Roboto" font-size="0.1" fill="#888" text-anchor="top" dy="0.1">data</text>';
	out += '		<text x="0.5" y="0.5" font-family="Roboto" font-size="0.3" fill="#888" text-anchor="middle" dy="0.1">22<tspan dy="-0.07" font-size="0.2">%</tspan></text>';
	out += '	</svg>';
	out += '	<svg fill="currentColor" width="200px" height="200px" viewBox="0 0 1 1" class="demo-chart mdl-cell mdl-cell--4-col mdl-cell--3-col-desktop clickable" onclick="panelStrings()" title="Go to strings">';
	out += '		<use xlink:href="#piechart" mask="url(#piemask)" />';
	out += '		<text x="0.3" y="0.2" font-family="Roboto" font-size="0.1" fill="#888" text-anchor="top" dy="0.1">strings</text>';
	out += '		<text x="0.5" y="0.5" font-family="Roboto" font-size="0.3" fill="#888" text-anchor="middle" dy="0.1">4<tspan dy="-0.07" font-size="0.2">%</tspan></text>';
	out += '	</svg>';
	out += '	<svg fill="currentColor" width="200px" height="200px" viewBox="0 0 1 1" class="demo-chart mdl-cell mdl-cell--4-col mdl-cell--3-col-desktop clickable" onclick="panelFunctions()" title="Go to functions">';
	out += '		<use xlink:href="#piechart" mask="url(#piemask)" />';
	out += '		<text x="0.3" y="0.2" font-family="Roboto" font-size="0.1" fill="#888" text-anchor="top" dy="0.1">functions</text>';
	out += '		<text x="0.5" y="0.5" font-family="Roboto" font-size="0.3" fill="#888" text-anchor="middle" dy="0.1">82<tspan dy="-0.07" font-size="0.2">%</tspan></text>';
	out += '	</svg>';
	out += '</div>';
	out += '</div>';

	c.innerHTML = out;

	updateFortune();
	updateInfo();
	updateEntropy();
	
	componentHandler.upgradeDom();

	// Set max height with MDL behavior
	var infoCellHeight = document.getElementById('info-cell').getBoundingClientRect().height;
	var content = document.getElementById('overview-content');
	content.style.height = infoCellHeight - document.getElementById('overview-tabs').getBoundingClientRect().height + 'px';
	content.style.overflow = 'auto';
}

function updateFortune() {
	r2.cmd('fo', function(d) {
		document.getElementById('fortune').innerHTML = d;
		readFortune();
	});
}

// say a message
function speak(text, callback) {
	if (typeof SpeechSynthesisUtterance === 'undefined') {
		return;
	}
	var u = new SpeechSynthesisUtterance();
	u.text = text;
	u.lang = 'en-US';

	u.onend = function() {
		if (callback) {
			callback();
		}
	};

	u.onerror = function(e) {
		if (callback) {
			callback(e);
		}
	};

	speechSynthesis.speak(u);
}

function readFortune() {
	var f = document.getElementById('fortune').innerHTML;
	speak(f);
}

function updateInfo() {
	r2.cmd('i', function(d) {
		var lines = d.split(/\n/g);
		var lines1 = lines.slice(0,lines.length / 2);
		var lines2 = lines.slice(lines.length / 2);
		var body = '';

		body += '<table style=\'width:100%\'><tr><td>';
		for (var i in lines1) {
			var line = lines1[i].split(/ (.+)?/);
			if (line.length >= 2) {
				body += '<b>' + line[0] + '</b> ' + line[1] + '<br/>';
			}
		}
		body += '</td><td>';
		for (var i in lines2) {
			var line = lines2[i].split(/ (.+)?/);
			if (line.length >= 2) {
				body += '<b>' + line[0] + '</b> ' + line[1] + '<br/>';
			}
		}
		body += '</td></tr></table>';
		document.getElementById('tab-info').innerHTML = body;
	});
}

function updateEntropy() {
	var eg = document.getElementById('entropy-graph');
	var boxHeight = eg.viewBox.baseVal.height;
	var height = (0 | boxHeight) - 19;
	r2.cmd('p=ej 50 $s @ $M', function(d) {
		var body = '';
		var res = JSON.parse(d);
		var values = new Array();

		for (var i in res.entropy) {
			values.push(res.entropy[i].value);
		}

		var nbvals = values.length;
		var min = Math.min.apply(null, values);
		var max = Math.max.apply(null, values);
		var inc = 500.0 / nbvals;

		// Minimum entropy has 0.1 transparency. Max has 1.
		for (var i in values) {
			var y = 0.1 + (1 - 0.1) * ((values[i] - min) / (max - min));
			var addr = '0x' + res.entropy[i].addr.toString(16);
			body += '<rect x="' + (inc * i).toString();
			body += '" y="0" width="' + inc.toString();
			body += '" height="' + height + '" style="fill:black;fill-opacity:';
			body += y.toString() + ';"><title>';
			body += addr + ' </title></rect>' ;

			if (i % 8 == 0) {
				body += '<text transform="matrix(1 0 0 1 ';
				body += (i * inc).toString();
				body += ' ' + (height + 15) + ')" fill="ff8888" font-family="\'Roboto\'" font-size="9">';
				body += addr + '</text>';
			}
		}

		eg.innerHTML = body;
		eg.onclick = function(e) {
			var box = eg.getBoundingClientRect();
			var pos = e.clientX - box.left;
			var i = 0 | (pos / (box.width / nbvals));
			var addr = '0x' + res.entropy[i].addr.toString(16);
			seek(addr);
		};
	});
}

function overviewLoad(evt, args) {
	if (args.ready) {
		return;
	}

	var cmd = args[0];
	var grep = args[1];

	var cmd = args.cmd;
	if (args.grep) {
		cmd += '~' + args.grep;
	}

	r2.cmd(cmd, function(d) {
		var dest = document.getElementById(evt.href.split('#')[1]);
		dest.innerHTML = '<pre style=\'margin:1.2em;\'>' + clickableOffsets(d) + '<pre>';
	});

	args.ready = true;
}

