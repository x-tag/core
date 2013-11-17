module.exports = function (grunt) {
  'use strict';

  // Polymer Platform custom biuld
  var polyfillFiles = [
   'lib/platform-bootstrap.js',
   'lib/DOMTokenList.js',
   'lib/WeakMap/weakmap.js',
   'lib/CustomElements/src/sidetable.js',
   'lib/MutationObservers/MutationObserver.js',
   'lib/CustomElements/src/CustomElements.js',
   'lib/CustomElements/src/Observer.js',
   'lib/CustomElements/src/Parser.js',
   'lib/CustomElements/src/boot.js'
  ];

  // Project configuration.
  grunt.initConfig({
    meta : {
      src   : 'src/**/*.js',
      specs : 'spec/**/*.js'
    },
    jshint: {
      all: [
        'Gruntfile.js',
        '<%= meta.src %>',
        '<%= meta.specs %>'
      ],
      options: {
        jshintrc: '.jshintrc'
      }
    },
    concat: {
      core:{
        src:[
          'lib/web-components-polyfills.js',
          'src/core.js'
        ],
        dest: 'dist/x-tag-core.js'
      },
      polyfill: {
        src: polyfillFiles,
        dest: 'lib/web-components-polyfills.js'
      }
    },
    uglify: {
      all: {
        files :{
          'dist/x-tag-core.min.js': ['dist/x-tag-core.js']
        }
      }
    },
    bumpup: ['bower.json', 'package.json'],
    tagrelease: {
      file: 'package.json',
      prefix: '',
      commit: true
    }
  });

  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');

  grunt.registerTask('test', ['jshint']);

  // Default task.
  grunt.registerTask('default', ['test']);
  grunt.registerTask('polyfill', ['concat:polyfill']);
  grunt.registerTask('build', ['test','concat:core','uglify']);

};
