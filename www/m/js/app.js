import {r2Wrapper, r2Settings} from './core/R2Wrapper';
import {uiContext} from './core/UIContext';

import {Autocompletion} from './helpers/Autocompletion';

import {ContainerZone} from './layout/ContainerZone';
import {Layouts} from './layout/Layouts';
import {WidgetFactory} from './widgets/WidgetFactory';
import {Widgets} from './widgets/Widgets';

let inColor = true;
let twice = false;

/** Entry point */
function ready() {
	if (twice) {
		return;
	}
	twice = true;

	// Loading configuration from localStorage (see widgetSettings)
	r2Settings.loadAll();

	// Define Widget container
	const factory = new WidgetFactory();
	uiContext.init(factory, 'content', 'ruler', 'title');
	// widgetContainer.fallbackWidget(() => { factory.get(Widgets.DISASSEMBLY).draw(); });

	// Default situation
	// factory.get(Factory.OVERVIEW).draw();
	uiContext.navigateTo(Widgets.OVERVIEW);

	// Left menu
	onClick('demo_avatar', () => uiContext.navigateTo(Widgets.OVERVIEW));
	onClick('menu_overview', () => uiContext.navigateTo(Widgets.OVERVIEW));
	onClick('menu_disasm', () => uiContext.navigateTo(Widgets.DISASSEMBLY));
	onClick('menu_hexdump', () => uiContext.navigateTo(Widgets.HEXDUMP));
	onClick('menu_debug', () => uiContext.navigateTo(Widgets.DEBUGGER));
	onClick('menu_functions', () => uiContext.navigateTo(Widgets.FUNCTIONS));
	onClick('menu_flags', () => uiContext.navigateTo(Widgets.FLAGS));
	onClick('menu_search', () => uiContext.navigateTo(Widgets.SEARCH));
	onClick('menu_script', () => uiContext.navigateTo(Widgets.SCRIPTS));
	onClick('menu_comments', () => uiContext.navigateTo(Widgets.COMMENTS));
	onClick('menu_help', () => alert('todo'));

	// Left sub-menu
	// onClick('menu_project_save', saveProject);
	// onClick('menu_project_delete', deleteProject);
	// onClick('menu_project_close', closeProject);

	// Right menu
	onClick('menu_seek', () => r2Wrapper.seek());
	onClick('menu_settings', () => uiContext.navigateTo(Widgets.SETTINGS));
	onClick('menu_about', () => {
		r2.cmd('?V', function(version) {
			alert('radare2 material webui by --pancake @ 2015-2017\n\n' + version.trim());
		});
	});
	onClick('menu_mail', function() {
		window.location = 'mailto:pancake@nopcode.org';
	});

	// Layout
	onClick('layout_single', () => uiContext.merge());
	onClick('layout_vertical', () => uiContext.split(Layouts.VERTICAL));

	// Set autocompletion
	const autocompletion = new Autocompletion('search', 'search_autocomplete', 'fs *;fj');
	autocompletion.setPrepareView(function() {
		// If not splitted we split the view
		if (!uiContext.isSplitted) {
			uiContext.split(Layouts.VERTICAL);
		}
		uiContext.navigateTo(Widgets.DISASSEMBLY);
	});

	// Close the drawer on click with small screens
	document.querySelector('.mdl-layout__drawer').addEventListener('click', function() {
		document.querySelector('.mdl-layout__obfuscator').classList.remove('is-visible');
		this.classList.remove('is-visible');
	}, false);
}

window.onload = ready;

document.addEventListener('DOMContentLoaded', ready, false);

document.body.onkeypress = function(e) {
	if (e.ctrlKey) {
		const keys = [
			// panelConsole,
			// panelDisasm,
			// panelDebug,
			// panelHexdump,
			// panelFunctions,
			// panelFlags,
			// panelOverview,
			// panelSettings,
			// panelSearch
		];
		if (e.charCode === 'o'.charCodeAt(0)) {
			r2Wrapper.seek();
		}
		let k = e.charCode - 0x30;
		if (k >= 0 && k < keys.length) {
			let fn = keys[k];
			if (fn) {
				fn();
			}
		}
	}
};

/**
 * Add an onClick listener
 * @param {string} nodeId Node concerned
 * @param {function} fn Callback function
 */
function onClick(nodeId, fn) {
	const h = document.getElementById(nodeId);
	if (h) {
		h.addEventListener('click', function() {
			fn();
		});
	} else {
		console.error('onclick-error', nodeId);
	}
}
