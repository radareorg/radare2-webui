import {Widgets} from './Widgets';

import {OverviewWidget} from './OverviewWidget';
import {HexdumpWidget} from './HexdumpWidget';
import {DebuggerWidget} from './DebuggerWidget';
import {FunctionsWidget} from './FunctionsWidget';
import {FlagsWidget} from './FlagsWidget';
import {FlagsSpacesWidget} from './FlagsSpacesWidget';
import {SearchWidget} from './SearchWidget';
import {ScriptWidget} from './ScriptWidget';
import {CommentsWidget} from './CommentsWidget';
import {NotesWidget} from './NotesWidget';
import {SettingsWidget} from './SettingsWidget';

import {DisassemblyWidget} from './DisassemblyWidget';
import {DisassemblyGraphWidget} from './DisassemblyGraphWidget';
import {DisassemblyInfosWidget} from './DisassemblyInfosWidget';
import {DisassemblyFunctionsWidget} from './DisassemblyFunctionsWidget';
import {DisassemblyFunctionsFullWidget} from './DisassemblyFunctionsFullWidget';
import {DisassemblyBlocksWidget} from './DisassemblyBlocksWidget';
import {DisassemblyDecompileWidget} from './DisassemblyDecompileWidget';

export class WidgetFactory {

	constructor() {
		this.widgets = {};
	}

	get(widget) {
		if (!this.contains(widget)) {
			this.instanciate_(widget);
		}

		return this.widgets[widget];
	}

	contains(widget) {
		return typeof this.widgets[widget] !== 'undefined';
	}

	instanciate_(widget) {
		switch (widget) {
		case Widgets.OVERVIEW:
			this.widgets[widget] = new OverviewWidget();
			break;
		case Widgets.DISASSEMBLY:
			this.widgets[widget] = new DisassemblyWidget();
			break;
		case Widgets.DISASSEMBLY_GRAPH:
			this.widgets[widget] = new DisassemblyGraphWidget();
			break;
		case Widgets.DISASSEMBLY_INFOS:
			this.widgets[widget] = new DisassemblyInfosWidget();
			break;
		case Widgets.DISASSEMBLY_FUNCTIONS:
			this.widgets[widget] = new DisassemblyFunctionsWidget();
			break;
		case Widgets.DISASSEMBLY_FUNCTIONS_FULL:
			this.widgets[widget] = new DisassemblyFunctionsFullWidget();
			break;
		case Widgets.DISASSEMBLY_BLOCKS:
			this.widgets[widget] = new DisassemblyBlocksWidget();
			break;
		case Widgets.DISASSEMBLY_DECOMPILE:
			this.widgets[widget] = new DisassemblyDecompileWidget();
			break;
		case Widgets.HEXDUMP:
			this.widgets[widget] = new HexdumpWidget();
			break;
		case Widgets.DEBUGGER:
			this.widgets[widget] = new DebuggerWidget();
			break;
		case Widgets.FUNCTIONS:
			this.widgets[widget] = new FunctionsWidget();
			break;
		case Widgets.FLAGS:
			this.widgets[widget] = new FlagsWidget();
			break;
		case Widgets.FLAGS_SPACE:
			this.widgets[widget] = new FlagsSpacesWidget();
			break;
		case Widgets.SEARCH:
			this.widgets[widget] = new SearchWidget();
			break;
		case Widgets.SCRIPTS:
			this.widgets[widget] = new ScriptWidget();
			break;
		case Widgets.COMMENTS:
			this.widgets[widget] = new CommentsWidget();
			break;
		case Widgets.NOTES:
			this.widgets[widget] = new NotesWidget();
			break;
		case Widgets.SETTINGS:
			this.widgets[widget] = new SettingsWidget();
			break;
		default:
			console.error('Not instanciable widget: ' + widget);
		}
		
	}
}
