var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	googleWebFonts = require('gulp-google-webfonts');

gulp.task('js', function() {
	gulp.src('../lib/r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('./js/index.js')
		.pipe(uglify())
		.pipe(concat('index.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('css', function() {

	gulp.src('./css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest('dist/'));

	gulp.src('./css/images/**')
		.pipe(gulp.dest('dist/images/'));
});

gulp.task('default', ['js', 'css'], function() {
	return bower({ cmd: 'install'});
});
