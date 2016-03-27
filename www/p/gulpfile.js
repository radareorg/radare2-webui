var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower');

gulp.task('common', function() {
	gulp.src('../lib/*.js')
		.pipe(uglify())
		.pipe(concat('r2core.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('../lib/css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('r2core.css'))
		.pipe(gulp.dest('dist/'));
});

gulp.task('js', function() {
	
	gulp.src('./lib/js/panels/*.js')
		.pipe(uglify())
		.pipe(concat('panels.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('./lib/js/dependencies/*.js')
		.pipe(uglify())
		.pipe(concat('dependencies.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('./lib/js/*.js')
		.pipe(uglify())
		.pipe(concat('main.js'))
		.pipe(gulp.dest('dist/'));
});


gulp.task('css', function() {

	gulp.src(['./lib/css/jquery-ui.css', './lib/css/tree.jquery.css', './lib/css/index.css'])
		.pipe(cleanCSS())
		.pipe(concat('dependencies.css'))
		.pipe(gulp.dest('dist/'));
});

gulp.task('default', ['js', 'css', 'common'], function() {
	return bower({ cmd: 'install'});
});
