module.exports = function (grunt) {
  'use strict';

  // Polymer Platform custom biuld
  var polyfillFiles = [
   'lib/platform.bootstrap.js',
   'lib/PolymerPlatform/CustomElements/src/sidetable.js',
   'lib/PolymerPlatform/lib/patches-shadowdom-native.js',
   'lib/PolymerPlatform/lib/lang.js',
   'lib/PolymerPlatform/lib/dom.js',
   'lib/PolymerPlatform/lib/template.js',
   'lib/PolymerPlatform/HTMLImports/src/HTMLImports.js',
   'lib/PolymerPlatform/CustomElements/MutationObservers/MutationObserver.js',
   'lib/PolymerPlatform/CustomElements/src/MutationObserver.js',
   'lib/PolymerPlatform/CustomElements/src/CustomElements.js',
   'lib/PolymerPlatform/CustomElements/src/Observer.js',
   'lib/PolymerPlatform/CustomElements/src/HTMLElementElement.js',
   'lib/PolymerPlatform/CustomElements/src/Parser.js',
   'lib/PolymerPlatform/CustomElements/src/boot.js',
   'lib/PolymerPlatform/lib/patches-custom-elements.js'
  ];

  // Project configuration.
  grunt.initConfig({
    meta : {
      src   : 'src/**/*.js',
      specs : 'spec/**/*.js'
    },
    watch: {
      test : {
        files: ['<%= meta.src %>', '<%= meta.specs %>'],
        tasks: 'test'
      }
    },
    jasmine : {
      src : '<%= meta.src %>',
      options : {
        specs : '<%= meta.specs %>',
        vendor: ['components/document.register/src/document.register.js'],
        outfile: '_spec_results.html'
      }
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
          'lib/web-components-polyfill.js',
          'src/core.js'
        ],
        dest: 'dist/x-tag-core.js'
      },
      platform: {
        src: polyfillFiles,
        dest: 'lib/web-components-polyfill.js'
      }
    },
    uglify: {
      all: {
        files :{
          'dist/x-tag-core.min.js': ['dist/x-tag-core.js']
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jasmine');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-watch');

  //grunt.registerTask('test', ['jshint', 'jasmine']);
  grunt.registerTask('test', ['jshint']);

  // Default task.
  grunt.registerTask('default', ['test']);
  grunt.registerTask('platform', ['concat:platform']);
  grunt.registerTask('build', ['test','concat:core','uglify']);

};
