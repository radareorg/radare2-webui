;(function() {
"use strict";

	var flags = undefined;

	function populateFlags() {
		r2.cmdj("fs *;fj", function (f) {
			flags = f;
		});
	}

	function resetFlags() {
		for (var i in flags) {
			flags[i].offset = -1;
		}
	}

	function getAutocomplete(str, limit) {
		limit = limit || 10;
		if (typeof flags == 'undefined')
			populateFlags();
		resetFlags();

		var selectedFlags = [];

		for (var i in flags) {
			if (i > limit) break;
			flags[i].offset = flags[i].name.indexOf(str, 0);
			if (flags[i].offset != -1) {
				selectedFlags.push(flags[i]);
			}
		}
		return selectedFlags;
	}

	function addNode(root, text, active) {
		var node = document.createElement("li");
		if (active) node.style.borderLeft = "2px solid red";
		node.appendChild(document.createTextNode(text));
		root.appendChild(node);
	}

	var activeChoice = 0;
	var prevLength = 0;
	var list;

	var UP = 38;
	var DOWN = 40;
	var ENTER = 13;

	document.getElementById('search').addEventListener('keyup', function(e) {
		if (e.keyCode == ENTER) {
			if (activeChoice != -1 && list.length > activeChoice)
			{
				console.log("Going to... "+list[activeChoice].offset);
				seek("0x"+list[activeChoice].offset.toString(16));
			}
		}

		if (e.keyCode == UP && activeChoice > 0) {
			console.log("UP")
			activeChoice--;
			e.preventDefault();
		}

		if (e.keyCode == DOWN && activeChoice < list.length-1) {
			console.log("DOWN");
			activeChoice++;
			e.preventDefault();
		}

		var autocomplete = document.getElementById("search_autocomplete");
		
		// Cleaning old completion
		while (autocomplete.firstChild) {
			autocomplete.removeChild(autocomplete.firstChild);
		}

		if (this.value.length >= 2) {
			list = getAutocomplete(this.value);
			if (prevLength != this.value.length)
				activeChoice = 0;

			// Add them to dropdown
			if (list.length == 0) {
				addNode(autocomplete, "No match...", false);
			} else {
				for (var i in list) {
					// TODO add eventListener (hover) for activeChoice
					addNode(autocomplete, list[i]['name'], i == activeChoice);
				}
			}

			prevLength = this.value.length;
		} else {
			addNode(autocomplete, "Autocompletion", false);
		}

	});
})();
