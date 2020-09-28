var gulp = require('gulp'),
	tar = require('gulp-tar'),
	gzip = require('gulp-gzip'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	gulpUtil = require('gulp-util');

var R2 = '../lib/';
var DEST = '../../dist/t/'

gulp.task('default', async function() {
	await gulp.src(['js/tiled.js', R2 + 'r2.js', 'js/main.js'])
		// .pipe(uglify())
		.pipe(uglify().on('error', gulpUtil.log))
		.pipe(concat('app.js'))
		.pipe(gulp.dest(DEST));

	await gulp.src(['css/*.css'])
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest(DEST));

	return gulp.src(['./index.html', './rlogo.png'])
		.pipe(gulp.dest(DEST));
});
