import gulp from 'gulp';
import tar from 'gulp-tar';
import uglify from 'gulp-uglify';
import cleanCSS from 'gulp-clean-css';
import concat from 'gulp-concat';
import gulpUtil from 'gulp-util';

const R2 = '../lib/';
const DEST = '../../dist/t/'

gulp.task('default', async function() {
	await gulp.src(['js/tiled.js', 'js/modals.js', R2 + 'r2.js', 'js/main.js'])
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
