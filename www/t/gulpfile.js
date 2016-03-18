var gulp = require('gulp'),
	uglify = require('gulp-uglify'),
	cleanCSS = require('gulp-clean-css'),
	concat = require('gulp-concat');

gulp.task('default', function() {
	gulp.src(['js/tiled.js', '../lib/r2.js', 'js/main.js'])
		.pipe(uglify())
		.pipe(concat('app.js'))
		.pipe(gulp.dest('dist/'));

	gulp.src('css/*.css')
		.pipe(cleanCSS())
		.pipe(concat('stylesheet.css'))
		.pipe(gulp.dest('dist/'));
});
