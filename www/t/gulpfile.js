var gulp = require('gulp'),
	tar = require('gulp-tar'),
	gzip = require('gulp-gzip'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat');

var R2 = '../lib/';
var DEST = '../../dist/t/'

gulp.task('default', function() {
	gulp.src(['js/tiled.js', R2+'r2.js', 'js/main.js', 'vendors/material-design-lite/material.min.js'])
		.pipe(uglify())
		.pipe(concat('app.js'))
		.pipe(gulp.dest(DEST));

	gulp.src(['css/*.css', 'vendors/material-design-lite/material.min.css'])
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(DEST));

	gulp.src(['./index.html', './rlogo.png'])
		.pipe(gulp.dest(DEST));
});
