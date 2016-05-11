var gulp = require('gulp'),
	tar = require('gulp-tar'),
	gzip = require('gulp-gzip'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat'),
	bower = require('gulp-bower'),
	replace = require('gulp-replace'),
	googleWebFonts = require('gulp-google-webfonts'),
	jscs = require('gulp-jscs');

gulp.task('jscs', function() {
	return gulp.src("js/*")
		.pipe(jscs())
		.pipe(jscs.reporter());
});

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
	gulp.src([
			'./css/*.css',
			'./vendors/material-design-lite/material.min.css',
			'./vendors/material-design-icons-iconfont/dist/material-design-icons.css'])
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest('dist/'));

	gulp.src('./css/images/**')
		.pipe(gulp.dest('dist/images/'));
});

gulp.task('fonts', function() {
	gulp.src('./fonts.list')
		.pipe(googleWebFonts({}))
		.pipe(gulp.dest('dist/fonts'));

	gulp.src(['./vendors/material-design-icons-iconfont/dist/fonts/*'])
		.pipe(gulp.dest('dist/fonts'));
})

gulp.task('default', ['jscs', 'js', 'fonts', 'css'], function() {
	gulp.src('./images/*')
		.pipe(gulp.dest('dist/images/'))
	return bower({ cmd: 'install'});
});

gulp.task('filter', function() {
	gulp.src(['index.html'])
		.pipe(replace(/dist\//g, ''))
		.pipe(gulp.dest('dist/'));
});
