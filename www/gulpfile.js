// builds r2core.js from lib/*.js

var gulp = require('gulp'),
	bower = require('gulp-bower');

var R2 = 'lib/';
var DEST = '../dist/'

gulp.task('default', function() {
	gulp.src(['./*.html', '*.png', '*.svg', 'favicon.ico', R2+'*.js'])
		.pipe(gulp.dest(DEST));

	return bower({ cmd: 'install'});
});
