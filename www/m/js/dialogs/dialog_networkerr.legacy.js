'use strict';

(function() {
	var networkerrDialog = document.getElementById('networkerr');
	var isOpen = false;
	var attemps = 0;

	if (!networkerrDialog.showModal) {
		dialogPolyfill.registerDialog(networkerrDialog);
	}

	function retry() {
		attemps++;
		r2.cmdj('?V', function(j) {
			if (typeof j !== 'undefined') {
				attemps = 0;
			}
		});
	}

	networkerrDialog.querySelector('.retry').addEventListener('click', function() {
		networkerrDialog.close();
		retry();
		isOpen = false;
	});

	networkerrDialog.querySelector('.close').addEventListener('click', function() {
		networkerrDialog.close();
		isOpen = false;
	});

	networkerrDialog.querySelector('.ok').addEventListener('click', function() {
		networkerrDialog.close();
		isOpen = false;
	});

	function refresh() {
		if (attemps > 0) {
			var firstAttempt = document.getElementsByClassName('first-attempt');
			for (var i = 0 ; i < firstAttempt.length; i++) {
				firstAttempt[i].style.display = 'none';
			}

			var nextAttempts = document.getElementsByClassName('next-attempt');
			for (var i = 0 ; i < nextAttempts.length; i++) {
				nextAttempts[i].style.display = 'block';
			}
		}
	}

	r2.err = function() {
		if (!isOpen) {
			refresh();
			networkerrDialog.showModal();
		}
	};
})();
