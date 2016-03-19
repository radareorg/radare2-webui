var gulp = require('gulp'),
	tar = require('gulp-tar'),
	gzip = require('gulp-gzip'),
	uglify = require('gulp-uglify'),
	replace = require('gulp-replace'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat');

gulp.task('default', ['filter'], function() {
	gulp.src(['js/tiled.js', '../lib/r2.js', 'js/main.js'])
		.pipe(uglify())
		.pipe(concat('app.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest('dist/'));

	gulp.src(['dist/*', 'rlogo.png'])
		.pipe(tar('dist.tar'))
		.pipe(gzip())
		.pipe(gulp.dest('.'));
});

gulp.task('filter', function() {
	gulp.src(['index.html'])
		.pipe(replace(/dist\//g, ''))
		.pipe(gulp.dest('dist/'));
});
