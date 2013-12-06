###
  Created by Evgeny Bogdanov on 10.10.2013
  Copyright (c) 2013 Evgeny Bogdanov. All rights reserved.
###

module.exports = (grunt) ->

  # Project configuration.
  grunt.initConfig
    watch:
      # spawn: false - is needed to be able to change the grunt config on the fly

      # recompile jade/coffee/stylus templates when they change
      jade:
        files: ["./**/*.jade"]
        tasks: ["jade"]
        options:
          spawn: false
          livereload: true

      stylus:
        files: ["./**/*.styl"]
        tasks: ["stylus"]
        options:
          spawn: false
          livereload: true

      # tasks "coffee" and "test" will be called automatically via "watch" event
      coffee:
        files: ["./**/*.coffee"]
        options:
          spawn: false
          livereload: true

    jade:
      compile:
        options:
          pretty: true
        files: [
          expand: true           # Enable dynamic expansion.
          cwd: 'test/'    # Src matches are relative to this path.
          src: ['**/*.jade']     # Actual pattern(s) to match.
          dest: 'test/'  # Destination path prefix.
          ext: '.html'           # Dest filepaths will have this extension.
        ]

    stylus:
      compile:
        files: [
          expand: true           # Enable dynamic expansion.
          cwd: 'test/'  # Src matches are relative to this path.
          src: ['**/*.styl']     # Actual pattern(s) to match.
          dest: 'test/'    # Destination path prefix.
          ext: '.css'            # Dest filepaths will have this extension.
        ]
      options:
        compress: false

    coffee:
      compile:
        files: [
          expand: true
          cwd: '.'
          src: ['**/*.coffee']
          dest: '.'
          ext: '.js'
          filter: (filepath) ->
            return (not filepath.match /node_modules/)
        ]
      grunt:
        src: "gruntfile.coffee"
        dest: "gruntfile.js"

    cssmin:
      minify:
        expand: true
        cwd: "public/cdn/css/"
        src: ["*.css"]
        dest: "public/cdn/css/"
        ext: ".css"

    uglify:
      options:
        mangle: true
      minify:
        expand: true
        cwd: 'lib/'
        src: ['*.js']
        dest: 'lib/'
        ext: '.min.js'

    # Run all the tests (or a single test)
    simplemocha:
      options:
        globals: ["should"]
        timeout: 3000
        ignoreLeaks: false
        ui: "bdd"
        reporter: "dot"        # specify the reporter to use
        growl: true            # enable growl notification support
        bail: true             # bail after first test failure
        recursive: true        # include sub directories

      all:
        src: ["test/unit/**/*_test.js", "public/test/unit/**/*_test.js"]

    nodemon:
      dev:
        options:
          file: "server.js"
          args: []
          nodeArgs: ["--debug=5081"]
          ignoredFiles: ["README.md", "node_modules/**", ".DS_Store", "public/**", "test/**"]
          watchedExtensions: ["js"]
          watchedFolders: ["."]
          delayTime: 1
          cwd: __dirname
          env:
            PORT: 8000

    concurrent:
      target:
        tasks: ["watch"]
        options:
          logConcurrentOutput: true

    ###
    Custom tasks
    ###

    # default when grunt starts (calls concurrent:target internally)
    # $ grunt
    start:
      target: {}

    # mock task for testing (calls simplemocha internally)
    # $ grunt test
    test:
      run: {}

    shell:
      # runs a mocha test with --debug-brk
      debugTest:
        options:
          stdout: true
        command: ""

      # starts node-inspector processes for debuging the app and tests
      debug:
        options:
          stdout: true
        command:
          "make debug"

      # copy minified file to remote server
      publish:
        options:
          stdout: true
          stderr: true
        command: [
          # minify the ils.js file
          "grunt uglify:minify"
          # using rsync with compression
          "rsync -az --delete --force ./lib/*.min.js admin@graasp.epfl.ch:/Graaasp/shared/system/gadgets_src/libs/"
        ].join '&&'

      # Cleans up the repo after build is done and tests are run
      cleanUp:
        options:
          stdout: true
          stderr: true
        command: [
          # remove min files
          "rm -rf lib/*.min.js"
        ].join '&&'

  # Load NPM tasks
  grunt.loadNpmTasks "grunt-contrib-watch"
  grunt.loadNpmTasks "grunt-nodemon"
  grunt.loadNpmTasks "grunt-concurrent"
  grunt.loadNpmTasks 'grunt-contrib-stylus'
  grunt.loadNpmTasks 'grunt-contrib-coffee'
  grunt.loadNpmTasks 'grunt-shell'
  grunt.loadNpmTasks 'grunt-contrib-jade'
  grunt.loadNpmTasks 'grunt-contrib-cssmin'
  grunt.loadNpmTasks 'grunt-contrib-uglify'
  grunt.loadNpmTasks 'grunt-mocha'

  ###
  Register all tasks
  ###

  grunt.registerTask "default", ["start:target"]
  grunt.registerTask "debug", ["shell:debug"]
  grunt.registerTask "deploy", ["shell:publish", "shell:cleanUp"]
  # compiles all jade/styl/coffee
  grunt.registerTask "compile", ["jade", "stylus", "coffee:compile"]

  ###
  Graspio custom tasks
  ###

  # default task with some options
  # to run a single test or coffee from command line:
  # $ grunt --test=path_to_test.js
  # $ grunt --coffee=path_to_test.js
  #
  # $ grunt
  # -> starts concurrent for the whole development server
  grunt.registerMultiTask "start", "Starts the server", ->

    # process single test provided on command line
    if grunt.option("test")
      test = grunt.option("test")
      grunt.config "simplemocha.all.src", test
      grunt.task.run("simplemocha")
      return

    # process single test provided on command line
    if grunt.option("debugtest")
      test = grunt.option("debugtest")
      mochaCommand = "./node_modules/mocha/bin/mocha --debug-brk=5082 " + test
      grunt.config "shell.debugTest.command", mochaCommand
      grunt.task.run("shell:debugTest")
      return

    # process single coffee provided on command line
    if grunt.option("coffee")
      coffee = grunt.option("coffee")
      grunt.config "coffee.compile.src", coffee
      grunt.config "coffee.compile.dest", coffee.replace(".coffee", ".js")
      grunt.task.run("coffee:compile")
      return

    if grunt.option.flags().length is 0
      grunt.task.run "concurrent:target"

  # runs one test or all tests in the project
  grunt.registerMultiTask "test", "Runs unit mocha tests", ->

    # when src and dest are given, it runs only one test
    if @data.src

      # if file is .coffee, replace it into .js since we use .js for tests
      file = @data.src.replace ".coffee", ".js"
      test = file
      if not file.match /_test.js/
        # the file is not a test file, find the corresponding test

        # make it a test file
        test = test.replace /\.[\w]+$/, "_test.js"

        # file to test mapping
        if test.match /^app/
          test = test.replace /^app/, "test/unit"
        if test.match /^lib/
          test = test.replace /^lib/, "test/unit/lib"
        if test.match /^config/
          test = test.replace /^config/, "test/unit/config"
        if test.match /^public\/js/
          test = test.replace /^public\/js/, "public/test/unit"


      # run the test with mocha
      grunt.config "simplemocha.all.src", test
      grunt.task.run("simplemocha")
    else
      # run all tests
      grunt.task.run("simplemocha")

  ###
  Misc
  ###

  # on watch events configure coffee/jade/stylus to only run on a changed file
  #
  # it replaces the default behavior of the compile task by assigning to it
  # src and dest fields referencing the changed file
  # the paths for src and dest are taken from the corresponding compile task
  grunt.event.on 'watch', (action, filepath, target) ->

    # specific processing of the gruntfile
    if filepath.match /gruntfile.coffee/
      grunt.task.run("coffee:grunt")
      return

    srcExt = filepath.match(/\.[\w]+$/)[0] # file extension
    switch srcExt
      when ".styl"
        task = "stylus"
      when ".jade"
        task = "jade"
      when ".coffee"
        task = "coffee"
      else
        task = false

    if task
      taskConfig = grunt.config(task + ".compile.files")[0]
      srcDir = taskConfig.cwd   # directory with src files: public/jade/
      destDir = taskConfig.dest # directory for dest: public/views/
      destExt = taskConfig.ext  # file extension of destination files: .html

      # creat new target file path
      target = filepath.replace(srcExt, destExt)
        .replace(srcDir, destDir)
      grunt.config(task + '.compile.src', filepath)
      grunt.config(task + '.compile.dest', target)

    # compile coffee file
    if task == "coffee"
      grunt.task.run("coffee:compile")

    # run unit test if .coffee or .js file was changed
    if srcExt == ".coffee" or srcExt == ".js"
      grunt.config('test.run.src', filepath)
      grunt.task.run("test")

  requireUncache = require "require-uncache"
  # Modified grunt task taken from https://github.com/yaymukund/grunt-simple-mocha
  # added force require of mocha, otherwise tests don't run in watch
  grunt.registerMultiTask "simplemocha", "Run tests with mocha", ->
    # !!! force reloading of cached mocha module
    requireUncache("mocha")
    Mocha = require "mocha"

    options = @options()
    mocha_instance = new Mocha(options)
    @filesSrc.forEach mocha_instance.addFile.bind(mocha_instance)

    # We will now run mocha asynchronously and receive number of errors in a
    # callback, which we'll use to report the result of the async task by
    # calling done() with the appropriate value to indicate whether an error
    # occurred.
    done = @async()
    mocha_instance.run (errCount) ->
      withoutErrors = (errCount is 0)
      done withoutErrors

