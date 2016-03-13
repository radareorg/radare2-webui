var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower');


gulp.task('js', function() {

	gulp.src('js/*.js')
		.pipe(uglify())
		.pipe(concat('enyo_app.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('js/core/*.js')
		.pipe(uglify())
		.pipe(concat('r2core.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('css', function() {

	gulp.src('css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest('dist/'));
});

gulp.task('default', ['js', 'css'], function() {
	return bower({ cmd: 'install'});
});
