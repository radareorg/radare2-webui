var gulp = require('gulp'),
	tar = require('gulp-tar'),
	gzip = require('gulp-gzip'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts');

gulp.task('js', ['filter'], function() {
	gulp.src('../lib/r2.js')
		.pipe(uglify())
		.pipe(concat('r2.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src(['./js/index.js', 'vendors/material-design-lite/material.min.js'])
		.pipe(uglify())
		.pipe(concat('index.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src(['./dist/**', './dist/*/*'])
		.pipe(tar('dist.tar'))
		.pipe(gzip())
		.pipe(gulp.dest('.'));
});

gulp.task('css', function() {
	gulp.src(['./css/*.css', 'cache/*.css', 'vendors/material-design-lite/material.min.css'])
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest('dist/'));
	gulp.src('./cache/*.ttf')
		.pipe(gulp.dest('dist/'));
	gulp.src('./css/images/**')
		.pipe(gulp.dest('dist/images/'));
});

gulp.task('default', ['js', 'css'], function() {
	return bower({ cmd: 'install'});
});

gulp.task('filter', function() {
	gulp.src(['index.html'])
		.pipe(replace(/dist\//g, ''))
		.pipe(gulp.dest('dist/'));
});
