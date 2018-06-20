/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Increase max listeners for event emitters
require('events').EventEmitter.defaultMaxListeners = 100;

var gulp = require('gulp');
var path = require('path');
var tsb = require('gulp-tsb');
var es = require('event-stream');
var cp = require('child_process');
var filter = require('gulp-filter');
var rename = require('gulp-rename');
var rimraf = require('rimraf');
var util = require('./build/lib/util');
var watcher = require('./build/lib/watch');
var createReporter = require('./build/lib/reporter');
var glob = require('glob');
var fs = require('fs');
var JSONC = require('json-comments');

function getTSConfig(plugin) {
	var script = (plugin.desc && plugin.desc.scripts && plugin.desc.scripts['vscode:prepublish']) || '';
	var match = /^node \.\.\/\.\.\/node\_modules\/gulp\/bin\/gulp\.js \-\-gulpfile \.\.\/\.\.\/gulpfile\.plugins\.js compile-plugin:([^ ]+) ?(.*tsconfig\.json)?/.exec(script);

	if (!match) {
		return;
	}

	var pluginRoot = path.join(__dirname, 'extensions', plugin.desc.name);

	if (match[2]) {
		return path.join(pluginRoot, match[2]);
	}

	return {
		noLib: true,
		target: 'ES5',
		module: 'amd',
		declaration: false,
		sourceMap: true,
		rootDir: path.join(pluginRoot, 'src'),
		sourceRoot: util.toFileUri(path.join(pluginRoot, 'src'))
	};
}

function noop() {}

function readAllPlugins() {
	var PLUGINS_FOLDER = path.join(__dirname, 'extensions');

	var extensions = glob.sync('*/package.json', {
		cwd: PLUGINS_FOLDER
	});

	var result = [];

	extensions.forEach(function (relativeJSONPath) {
		var relativePath = path.dirname(relativeJSONPath);
		var fullJSONPath = path.join(PLUGINS_FOLDER, relativeJSONPath);
		var contents = fs.readFileSync(fullJSONPath).toString();
		var desc = JSONC.parse(contents);

		result.push({
			relativePath: relativePath,
			desc: desc
		});
	});

	return result;
}

var tasks = readAllPlugins()
	.map(function (plugin) {
		var name = plugin.desc.name;
		var pluginRoot = path.join(__dirname, 'extensions', name);

		var clean = 'clean-plugin:' + name;
		var compile = 'compile-plugin:' + name;
		var watch = 'watch-plugin:' + name;
		var npmInstall = 'npm-install-plugin:' + name;

		var hasnpmTask = (plugin.desc.dependencies && Object.keys(plugin.desc.dependencies).length > 0);

		if (hasnpmTask) {
			gulp.task(npmInstall, function (cb) {
				cp.exec('npm install', { cwd: pluginRoot }, cb);
			});
		}

		var options = getTSConfig(plugin);
		if (options) {

			var sources = 'extensions/' + name + '/src/**';
			var deps = [
				'src/vs/vscode.d.ts',
				'src/typings/mocha.d.ts',
				'extensions/declares.d.ts',
				'extensions/node.d.ts',
				'extensions/lib.core.d.ts'
			];

			var pipeline = (function () {
				var reporter = createReporter();
				var compilation = tsb.create(options, true, null, function (err) { reporter(err.toString()); });

				return function () {
					var input = es.through();
					var tsFilter = filter(['**/*.ts', '!**/lib/lib*.d.ts'], { restore: true });

					var output = input
						.pipe(tsFilter)
						.pipe(compilation())
						.pipe(tsFilter.restore)
						.pipe(reporter());

					return es.duplex(input, output);
				};
			})();

			var sourcesRoot = path.join(pluginRoot, 'src');
			var sourcesOpts = { cwd: __dirname, base: sourcesRoot };
			var depsOpts = { cwd: __dirname	};

			gulp.task(clean, function (cb) {
				rimraf(path.join(pluginRoot, 'out'), cb);
			});

			gulp.task(compile, hasnpmTask ? [clean, npmInstall] : [clean], function () {
				var src = es.merge(gulp.src(sources, sourcesOpts), gulp.src(deps, depsOpts));

				return src
					.pipe(pipeline())
					.pipe(gulp.dest('extensions/' + name + '/out'));
			});

			gulp.task(watch, [clean], function () {
				var src = es.merge(gulp.src(sources, sourcesOpts), gulp.src(deps, depsOpts));
				var watchSrc = es.merge(watcher(sources, sourcesOpts), watcher(deps, depsOpts));

				return watchSrc
					.pipe(util.incremental(pipeline, src))
					.pipe(gulp.dest('extensions/' + name + '/out'));
			});
		} else {
			if (hasnpmTask) {
				gulp.task(clean, noop);
				gulp.task(compile, [npmInstall], noop);
				gulp.task(watch, noop);
			} else {
				return null;
			}
		}

		return {
			clean: clean,
			compile: compile,
			watch: watch
		};
	});

// remove null tasks
tasks = tasks.filter(function(task) {
	return !!task;
})

gulp.task('clean-plugins', tasks.map(function (t) { return t.clean; }));
gulp.task('compile-plugins', tasks.map(function (t) { return t.compile; }));
gulp.task('watch-plugins', tasks.map(function (t) { return t.watch; }));