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

  var browsers = [{
    browserName: "firefox",
    version: "14",
    platform: "XP"
  },
  {
    browserName: "firefox",
    version: "26",
    platform: "XP"
  },{
    browserName: "chrome",
    version: "26",
    platform: "XP"
  },{
    browserName: "chrome",
    version: "32",
    platform: "Windows 8.1"
  }
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
    },
    connect: {
      test:{
        options:{
          port: 9999,
          base: '.'
        }
      },
      dev:{
        options:{
          port: 9000,
          base: '.',
          keepalive: true
        }
      }
    },
    'saucelabs-jasmine': {
      all: {
        options: {
          urls: ["http://127.0.0.1:9999/test/index.html"],
          tunnelTimeout: 5,
          build: process.env.TRAVIS_JOB_ID,
          concurrency: 3,
          browsers: browsers,
          testname: "x-tag-core tests",
          tags: ["master"],
          onTestComplete: function(result){
            return JSON.stringify(result);
          }
        }
      }
    }
  });

  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-bumpup');
  grunt.loadNpmTasks('grunt-tagrelease');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-saucelabs');

  grunt.registerTask('test', ['']);

  // Default task.
  grunt.registerTask('default', ['test']);
  grunt.registerTask('polyfill', ['concat:polyfill']);
  grunt.registerTask('build', ['test','concat:core','uglify']);

  grunt.registerTask('test', ['jshint','connect:test', 'saucelabs-jasmine']);

};
