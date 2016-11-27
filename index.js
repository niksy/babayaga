'use strict';

const path = require('path');
const _ = require('lodash');
const browserify = require('browserify');
const watchify = require('watchify');
const bra = require('browserify-require-async');
const collapser = require('bundle-collapser-extended/plugin');
const gulp = require('gulp');
const plumber = require('gulp-plumber');
const sourcemaps = require('gulp-sourcemaps');
const gulpif = require('gulp-if');
const source = require('vinyl-source-stream');
const buffer = require('vinyl-buffer');
const es = require('event-stream');

/**
 * @param {Object} opts
 */
function setCommonBundles ( opts ) {
	const bundle = opts.bundle;
	const key = opts.key;
	_.forEach(opts.commonBundles, ( item ) => {
		const commonBundles = item.modules;
		const isSharedModulesContainer = item.entry.indexOf(key) !== -1;
		_.forEach(commonBundles, ( sharedModule ) => {
			if ( key && isSharedModulesContainer ) {
				bundle.require(sharedModule);
			} else {
				bundle.external(sharedModule);
			}
		});
	});
}

module.exports = Bfy;

function Bfy ( opts ) {
	if (!(this instanceof Bfy)) {
		return new Bfy(opts);
	}

	this.opts = _.merge({}, {
		cwd: process.cwd(),
		watch: false,
		dev: false,
		verbose: false,
		paths: [],
		commonBundles: [],
		entries: {},
		output: {
			path: './',
			publicPath: '/',
			filename: ( key, file ) => {
				return `${key}.js`;
			},
			asyncFilename: ( hash, file ) => {
				return `${hash}.js`;
			}
		},
		asyncRequireLoaderEntry: [''],
		collapserPreset: [],
		asyncRequireOptions: {},
		verboseLog: ( file, message ) => {

		},
		onError: ( err ) => {

		},
		setupBundle: ( bundle, opts ) => {
			return bundle;
		},
		onStartWrite: ( stream, isAsyncTask, isWatchUpdate ) => {
			return stream;
		},
		onBeforeWrite: ( stream, isAsyncTask, isWatchUpdate ) => {
			return stream;
		},
		onAfterWrite: ( stream, isAsyncTask, isWatchUpdate ) => {
			return stream;
		},
		onStartBuild: ( stream, isAsyncTask ) => {
			return stream;
		},
		onBeforeBuild: ( stream, isAsyncTask ) => {
			return stream;
		},
		onAfterBuild: ( stream, isAsyncTask ) => {
			return stream;
		}
	}, opts);

	this.opts.output.path = path.resolve(this.opts.cwd, this.opts.output.path);

	this.tasks = [];
	this.subtasks = [];

}
Bfy.prototype.setup = function ( opts ) {

	let bundle = browserify(Object.assign({
		entries: opts.entry,
		debug: this.opts.dev,
		paths: this.opts.paths
	}, (this.opts.watch ? watchify.args : {})));

	setCommonBundles({
		commonBundles: this.opts.commonBundles,
		key: opts.key,
		bundle: bundle
	});

	if ( opts.key ) {
		if ( this.opts.asyncRequireLoaderEntry.indexOf(opts.key) !== -1 ) {
			bundle.require(require.resolve('browserify-require-async/loader'), { expose: 'browserify-require-async/loader' });
		} else {
			bundle.external('browserify-require-async/loader');
		}
	}

	if ( this.opts.watch ) {
		bundle.plugin(watchify);
		bundle.on('update', () => {
			this.write({
				bundle: bundle,
				outputFilename: opts.outputFilename,
				isAsyncTask: opts.isAsyncTask,
				isWatchUpdate: true
			});
		});
		if ( this.opts.verbose ) {
			bundle.on('log', ( message ) => {
				this.opts.verboseLog(opts.entry, message);
			});
		}
	} else {
		bundle.plugin(collapser, {
			preset: this.opts.collapserPreset
		});
		if ( this.opts.verbose ) {
			bundle.on('bundle', () => {
				this.opts.verboseLog(opts.entry, '');
			});
		}
	}

	bundle = this.opts.setupBundle(bundle, {
		key: opts.key,
		entry: opts.entry
	});

	bundle.transform(bra, _.merge({}, {
		url: `${this.opts.output.publicPath}`,
		outputDir: `${this.opts.output.path}`,
		setOutputFile: ( hash, bopts ) => {
			const entry = path.resolve(bopts.inputDir, bopts.inputFile);
			return this.opts.output.asyncFilename(hash, entry);
		},
		setup: ( b, bopts ) => {
			const entry = path.resolve(bopts.inputDir, bopts.inputFile);
			return this.setup({
				entry: entry,
				outputFilename: bopts.outputFile,
				isAsyncTask: true,
				isWatchUpdate: false
			});
		},
		bundle: ( b, bopts ) => {
			const stream = this.write({
				bundle: b,
				outputFilename: bopts.outputFile,
				isAsyncTask: true,
				isWatchUpdate: false
			});
			this.subtasks.push(stream);
		}
	}, this.opts.asyncRequireOptions));

	return bundle;

};
Bfy.prototype.write = function ( opts ) {

	const self = this;

	function onError ( err ) {
		self.opts.onError(err);
		this.emit('end');
	}

	const stream = opts.bundle.bundle()
			.on('error', onError)
			.pipe(plumber(onError))
			.pipe(source(opts.outputFilename))
			.pipe(buffer())
			.pipe(gulpif(this.opts.dev, sourcemaps.init({ loadMaps: true })));

	const stream1 = this.opts.onStartWrite(stream, Boolean(opts.isAsyncTask), Boolean(opts.isWatchUpdate))
		.pipe(gulpif(this.opts.dev, sourcemaps.write()))
		.pipe(plumber.stop());

	const stream2 = this.opts.onBeforeWrite(stream1, Boolean(opts.isAsyncTask), Boolean(opts.isWatchUpdate)).pipe(gulpif(() => { return true; }, gulp.dest(this.opts.output.path))); // gulp-if is needed for some reason for async tasks
	const stream3 = this.opts.onAfterWrite(stream2, Boolean(opts.isAsyncTask), Boolean(opts.isWatchUpdate));

	return stream3;

};
Bfy.prototype.build = function () {

	this.tasks = _.map(this.opts.entries, ( file, key ) => {
		const f = path.resolve(this.opts.cwd, file);
		const bundle = this.setup({
			key: key,
			entry: f,
			outputFilename: this.opts.output.filename(key, f),
			isAsyncTask: false,
			isWatchUpdate: false
		});
		return this.write({
			bundle: bundle,
			outputFilename: this.opts.output.filename(key, f),
			isAsyncTask: false,
			isWatchUpdate: false
		});
	});

	return Promise.resolve()
		.then(() => {
			return this._outputCombinedTasks(this.tasks, false);
		})
		.then(() => {
			return this._outputCombinedTasks(this.subtasks, true);
		});

};
Bfy.prototype._outputCombinedTasks = function ( tasks, isAsyncTask ) {

	const stream1 = this.opts.onStartBuild(es.merge(tasks), Boolean(isAsyncTask));
	const stream2 = this.opts.onBeforeBuild(stream1, Boolean(isAsyncTask));
	const stream3 = this.opts.onAfterBuild(stream2, Boolean(isAsyncTask));

	return new Promise(( resolve ) => {
		stream3
			.on('data', _.noop)
			.on('end', () => {
				resolve();
			});
	});

};
