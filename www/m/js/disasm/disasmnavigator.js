// Should refactor with HexPairNav
DisasmNavigator.prototype = new BlockNavigator();
DisasmNavigator.prototype.constructor = DisasmNavigator;
function DisasmNavigator(howManyLines, startOffset) {
	this.currentOffset = startOffset;
	this.howManyLines = howManyLines;
	this.gap = this.howManyLines * 2;

	this.providerWorker = new Worker('disasmProvider.js');
	this.providerWorker.postMessage(this.howManyLines);

	this.init();
}
