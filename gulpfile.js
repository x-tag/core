var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify-es').default;

var paths = {
  core: 'src/core.js',
  polyfill: 'polyfills/custom-elements.min.js',
  extensions: {
    'src-attr': ['extensions/src-attr/main.js'],
    'hyperHTML': ['extensions/hyperHTML/hyperHTML.min.js', 'extensions/hyperHTML/main.js'],
  },
  events: {
    'tap': ['events/tap/pep.min.js', 'events/tap/main.js']
  }
};

gulp.task('raw', function() {
  return gulp.src(paths.core)
    .pipe(uglify())
    .pipe(concat('x-tag-raw.js'))
    .pipe(gulp.dest('dist/'));
});

gulp.task('polyfilled', function() {
  return gulp.src([paths.polyfill, paths.core])
    .pipe(uglify())
    .pipe(concat('x-tag-polyfilled.js'))
    .pipe(gulp.dest('dist/'));
});

for (let z in paths.extensions) {
  gulp.task(z, function() {
    return gulp.src(paths.extensions[z])
      .pipe(uglify())
      .pipe(concat(z + '.js'))
      .pipe(gulp.dest('dist/extensions'));
  });
}

for (let z in paths.events) {
  gulp.task(z, function() {
    return gulp.src(paths.events[z])
      .pipe(uglify())
      .pipe(concat(z + '.js'))
      .pipe(gulp.dest('dist/events'));
  });
}

gulp.task('default', ['raw', 'polyfilled']);
gulp.task('extensions', Object.keys(paths.extensions));
gulp.task('events', Object.keys(paths.events));
gulp.task('all', ['default', 'extensions', 'events']);