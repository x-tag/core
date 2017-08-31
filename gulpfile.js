var gulp = require('gulp');
var concat = require('gulp-concat');
var uglify = require('gulp-uglify-es').default;

var paths = {
  core: 'src/core.js',
  polyfill: 'polyfills/custom-elements.min.js',
  plugins: {
    attributes: {
      src: ['plugins/attributes/src/main.js']
    },
    events: {
      tap: ['plugins/events/tap/pep.min.js', 'plugins/events/tap/main.js']
    },
    rendering: {
      hyperHTML: ['plugins/rendering/hyperHTML/hyperHTML.min.js', 'plugins/rendering/hyperHTML/main.js']
    }
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

Object.keys(paths.plugins).forEach(type => {
  var tasks = [];
  var plugins = paths.plugins[type];
  for (let z in plugins) {
    tasks.push(type + ':' + z);
    gulp.task(type + ':' + z, function() {
      return gulp.src(plugins[z])
                 .pipe(uglify())
                 .pipe(concat(z + '.js'))
                 .pipe(gulp.dest('dist/plugins/' + type));
    });
  }
  gulp.task(type, tasks);
});

gulp.task('default', ['raw', 'polyfilled']);
gulp.task('plugins', Object.keys(paths.plugins));
gulp.task('all', ['default', 'plugins']);