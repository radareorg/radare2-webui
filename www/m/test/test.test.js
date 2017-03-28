describe('Module', function () {
	describe('Method', function () {

		it('Should...', function () {
			// Arrange
			var op = () => 1 + 2;
			var infScrolling = new InfiniteScrolling(document.body, 3, 0.2);

			// Act
			var result = op();

			// Assert
			Assert.equal(result, 3);
		});
	});
});