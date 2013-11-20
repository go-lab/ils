/*
  Created by Evgeny Bogdanov on 10.10.2013
  Copyright (c) 2013 Evgeny Bogdanov. All rights reserved.
*/


(function() {
  module.exports = function(grunt) {
    var requireUncache;
    grunt.initConfig({
      watch: {
        jade: {
          files: ["./**/*.jade"],
          tasks: ["jade"],
          options: {
            spawn: false,
            livereload: true
          }
        },
        stylus: {
          files: ["./**/*.styl"],
          tasks: ["stylus"],
          options: {
            spawn: false,
            livereload: true
          }
        },
        coffee: {
          files: ["./**/*.coffee"],
          options: {
            spawn: false,
            livereload: true
          }
        }
      },
      jade: {
        compile: {
          options: {
            pretty: true
          },
          files: [
            {
              expand: true,
              cwd: 'test/',
              src: ['**/*.jade'],
              dest: 'test/',
              ext: '.html'
            }
          ]
        }
      },
      stylus: {
        compile: {
          files: [
            {
              expand: true,
              cwd: 'test/',
              src: ['**/*.styl'],
              dest: 'test/',
              ext: '.css'
            }
          ]
        },
        options: {
          compress: false
        }
      },
      coffee: {
        compile: {
          files: [
            {
              expand: true,
              cwd: '.',
              src: ['**/*.coffee'],
              dest: '.',
              ext: '.js',
              filter: function(filepath) {
                return !filepath.match(/node_modules/);
              }
            }
          ]
        },
        grunt: {
          src: "gruntfile.coffee",
          dest: "gruntfile.js"
        }
      },
      cssmin: {
        minify: {
          expand: true,
          cwd: "public/cdn/css/",
          src: ["*.css"],
          dest: "public/cdn/css/",
          ext: ".css"
        }
      },
      uglify: {
        options: {
          mangle: true
        },
        minify: {
          expand: true,
          cwd: 'lib/',
          src: ['*.js'],
          dest: 'lib/',
          ext: '.min.js'
        }
      },
      simplemocha: {
        options: {
          globals: ["should"],
          timeout: 3000,
          ignoreLeaks: false,
          ui: "bdd",
          reporter: "dot",
          growl: true,
          bail: true,
          recursive: true
        },
        all: {
          src: ["test/unit/**/*_test.js", "public/test/unit/**/*_test.js"]
        }
      },
      nodemon: {
        dev: {
          options: {
            file: "server.js",
            args: [],
            nodeArgs: ["--debug=5081"],
            ignoredFiles: ["README.md", "node_modules/**", ".DS_Store", "public/**", "test/**"],
            watchedExtensions: ["js"],
            watchedFolders: ["."],
            delayTime: 1,
            cwd: __dirname,
            env: {
              PORT: 8000
            }
          }
        }
      },
      concurrent: {
        target: {
          tasks: ["watch"],
          options: {
            logConcurrentOutput: true
          }
        }
      },
      /*
      Custom tasks
      */

      start: {
        target: {}
      },
      test: {
        run: {}
      },
      shell: {
        debugTest: {
          options: {
            stdout: true
          },
          command: ""
        },
        debug: {
          options: {
            stdout: true
          },
          command: "make debug"
        },
        publish: {
          options: {
            stdout: true,
            stderr: true
          },
          command: ["grunt uglify:minify", "rsync -az --delete --force ./lib/*.min.js admin@graasp.epfl.ch:/Graaasp/shared/system/gadgets_src/libs/"].join('&&')
        },
        cleanUp: {
          options: {
            stdout: true,
            stderr: true
          },
          command: ["rm -rf lib/*.min.js"].join('&&')
        }
      }
    });
    grunt.loadNpmTasks("grunt-contrib-watch");
    grunt.loadNpmTasks("grunt-nodemon");
    grunt.loadNpmTasks("grunt-concurrent");
    grunt.loadNpmTasks('grunt-contrib-stylus');
    grunt.loadNpmTasks('grunt-contrib-coffee');
    grunt.loadNpmTasks('grunt-shell');
    grunt.loadNpmTasks('grunt-contrib-jade');
    grunt.loadNpmTasks('grunt-contrib-cssmin');
    grunt.loadNpmTasks('grunt-contrib-uglify');
    grunt.loadNpmTasks('grunt-mocha');
    /*
    Register all tasks
    */

    grunt.registerTask("default", ["start:target"]);
    grunt.registerTask("debug", ["shell:debug"]);
    grunt.registerTask("deploy", ["shell:publish", "shell:cleanUp"]);
    grunt.registerTask("compile", ["jade", "stylus", "coffee:compile"]);
    /*
    Graspio custom tasks
    */

    grunt.registerMultiTask("start", "Starts the server", function() {
      var coffee, mochaCommand, test;
      if (grunt.option("test")) {
        test = grunt.option("test");
        grunt.config("simplemocha.all.src", test);
        grunt.task.run("simplemocha");
        return;
      }
      if (grunt.option("debugtest")) {
        test = grunt.option("debugtest");
        mochaCommand = "./node_modules/mocha/bin/mocha --debug-brk=5082 " + test;
        grunt.config("shell.debugTest.command", mochaCommand);
        grunt.task.run("shell:debugTest");
        return;
      }
      if (grunt.option("coffee")) {
        coffee = grunt.option("coffee");
        grunt.config("coffee.compile.src", coffee);
        grunt.config("coffee.compile.dest", coffee.replace(".coffee", ".js"));
        grunt.task.run("coffee:compile");
        return;
      }
      if (grunt.option.flags().length === 0) {
        return grunt.task.run("concurrent:target");
      }
    });
    grunt.registerMultiTask("test", "Runs unit mocha tests", function() {
      var file, test;
      if (this.data.src) {
        file = this.data.src.replace(".coffee", ".js");
        test = file;
        if (!file.match(/_test.js/)) {
          test = test.replace(/\.[\w]+$/, "_test.js");
          if (test.match(/^app/)) {
            test = test.replace(/^app/, "test/unit");
          }
          if (test.match(/^lib/)) {
            test = test.replace(/^lib/, "test/unit/lib");
          }
          if (test.match(/^config/)) {
            test = test.replace(/^config/, "test/unit/config");
          }
          if (test.match(/^public\/js/)) {
            test = test.replace(/^public\/js/, "public/test/unit");
          }
        }
        grunt.config("simplemocha.all.src", test);
        return grunt.task.run("simplemocha");
      } else {
        return grunt.task.run("simplemocha");
      }
    });
    /*
    Misc
    */

    grunt.event.on('watch', function(action, filepath, target) {
      var destDir, destExt, srcDir, srcExt, task, taskConfig;
      if (filepath.match(/gruntfile.coffee/)) {
        grunt.task.run("coffee:grunt");
        return;
      }
      srcExt = filepath.match(/\.[\w]+$/)[0];
      switch (srcExt) {
        case ".styl":
          task = "stylus";
          break;
        case ".jade":
          task = "jade";
          break;
        case ".coffee":
          task = "coffee";
          break;
        default:
          task = false;
      }
      if (task) {
        taskConfig = grunt.config(task + ".compile.files")[0];
        srcDir = taskConfig.cwd;
        destDir = taskConfig.dest;
        destExt = taskConfig.ext;
        target = filepath.replace(srcExt, destExt).replace(srcDir, destDir);
        grunt.config(task + '.compile.src', filepath);
        grunt.config(task + '.compile.dest', target);
      }
      if (task === "coffee") {
        grunt.task.run("coffee:compile");
      }
      if (srcExt === ".coffee" || srcExt === ".js") {
        grunt.config('test.run.src', filepath);
        return grunt.task.run("test");
      }
    });
    requireUncache = require("require-uncache");
    return grunt.registerMultiTask("simplemocha", "Run tests with mocha", function() {
      var Mocha, done, mocha_instance, options;
      requireUncache("mocha");
      Mocha = require("mocha");
      options = this.options();
      mocha_instance = new Mocha(options);
      this.filesSrc.forEach(mocha_instance.addFile.bind(mocha_instance));
      done = this.async();
      return mocha_instance.run(function(errCount) {
        var withoutErrors;
        withoutErrors = errCount === 0;
        return done(withoutErrors);
      });
    });
  };

}).call(this);
