CONTRIBUTING
============

How to contribute on the *material* UI?

This UI use extensively `gulp` to be built. In an abstraction concern for the main build system, we have abstracted the whole process inside npm scripts.

Run UI from dev
---------------

The webserver is handled by `radare2`. From the root folder, you would run:

```sh
make run
```

This command will open your browser at http://localhost:9090/m pointing to `dev/m/` folder.

Development
-----------

You would develop modifying files inside this folder and having your updated inside your browser. The build process is fairly simple:

```sh
npm run build
```

You can make the choice to run the `watcher` instead to have the file processed at the same time you save them:

```sh
npm run watch # gulp watch
```

Tests
-----

Tests run against the `dev` version.

You can run the tests both ways, inside your commandline:

```sh
npm run test # calling mocha
```

Or into your browser if you need to debug:

```sh
npm run testbrowser # gulp test
```

As a part of the test, you can also run ESLint:

```sh
npm run checkstyle # gulp checkstyle
```

Release
-------

The release process stricly use the development but compress the output by minifying HTML, CSS and JS.

```sh
make dist
```

or

```sh
npm run release
```
