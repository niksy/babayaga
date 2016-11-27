# babayaga

Convenient Browserify builds. **Highly experimental**.

Features:

* multiple entry points
* code splitting
* common bundles definition
* bundle and build lifecycle methods
* streams wrapped with Gulp

## Install

```sh
npm install @niksy/babayaga --save
```

## Usage

```js
const babayaga = require('@niksy/babayaga');
const build = babayaga({
	entries: {
		bootstrap: './bootstrap.js',
		app: './app.js'
	},
	output: {
		path: './out',
		publicPath: 'http://example.com/'
	},
	paths: [
		'local_modules'
	],
	commonBundles: [
		{
			entry: ['bootstrap'],
			modules: [
				'whatwg-fetch'
			]
		}
	]
}).build();
```

## API

### babayaga(opts)

Returns: `Object`

Prepares build. Returns object with `build` method which creates build and returns Promise which resolves when build is completed.

#### opts

Type: `Object`

##### cwd

Type: `String`  
Default: `process.cwd()`

Current working directory of the build.

##### entries

Type: `Object`  
Default: `{}`

List of entry points where key is identifier of the entry point and value filename of the entry point.

##### output

Type: `Object`  
Default: `{}`

| Property | Type | Default | Description |
| --- | --- | --- | --- |
| `path` | `String` | `'./'` | Output path for the build. |
| `publicPath` | `String` | `'/'` | URL for async bundles. |
| `filename` | `Function` |  | Method to generate bundle filename. |
| `asyncFilename` | `Function` |  | Method to generate async bundle filename. |

###### filename

| Property | Type | Description |
| --- | --- | --- |
| `key` | `String` | Entry point key. |
| `file` | `String` | Filename of entry point. |

###### asyncFilename

| Property | Type | Description |
| --- | --- | --- |
| `hash` | `String` | [Hash of resolved file](https://github.com/niksy/browserify-require-async#setoutputfile). |
| `file` | `String` | Filename of resolved file. |

##### watch

Type: `Boolean`  
Default: `false`

Should the build watch for changes.

##### dev

Type: `Boolean`  
Default: `false`

Should the build be in development mode (e.g. output inline sourcemaps).

##### verbose

Type: `Boolean`  
Default: `false`

Should the build output verbose information.

##### paths

Type: `Array`  
Default: `[]`

See [`opts.paths`][browserify-opts].

##### commonBundles

Type: `Object[]`  
Default: `[]`

List of common bundles and their dependencies. Convenient wrapper arround [Browserify multiple bundles][browserify-multiple-bundles].

Following configuration will:

* have `whatwg-fetch` module required only in `bootstrap` entry point
* have `jquery` module required only in `core` entry point

When other entry points and their dependencies require `whatwg-fetch` or `jquery`, they won’t get bundled multiple times, but instead will be referenced from `bootstrap` or `core` entry point respectively.

```js
{
	entry: ['bootstrap'],
	modules: [
		'whatwg-fetch'
	]
},
{
	entry: ['core'],
	modules: [
		'jquery'
	]
}
```

##### asyncRequireLoaderEntry

Type: `String[]`  
Default: `['']`

Which entry point should be considered as [async require loader entry point](https://github.com/niksy/browserify-require-async#loader-slimming).

##### asyncRequireOptions

Type: `Object`  
Default: `{}`

[Async require options](https://github.com/niksy/browserify-require-async#api).

##### collapserPreset

Type: `String[]`  
Default: `[]`

[Preset list for bundle collapser](https://github.com/niksy/browserify-require-async#usage-with-bundle-collapser).

##### verboseLog

Type: `Function`

Output verbose log.

| Property | Type | Description |
| --- | --- | --- |
| `file` | `String` | File which generated log. |
| `message` | `String` | Log message. |

##### onError

Type: `Function`

Error callback.

| Property | Type | Description |
| --- | --- | --- |
| `err` | `Error` | Build error. |

##### setupBundle

Type: `Function`

Method to additionally setup Browserify bundle. It should return original or modified bundle instance.

| Property | Type | Description |
| --- | --- | --- |
| `bundle` | `Browserify` | Browserify bundle instance. |
| `opts` | `Object` | Additional options. |

##### onStartWrite

Type: `Function`

Method to call when bundle starts writing to filesystem. It should return original or modified stream.

| Property | Type | Description |
| --- | --- | --- |
| `stream` | `Stream` | Bundle stream. |
| `isAsyncTask` | `Boolean` | Is bundle stream async require stream. |
| `isWatchUpdate` | `Boolean` | Is current callback inside watch update mode. |

##### onBeforeWrite

Type: `Function`

Method to call before bundle gets written to filesystem. It should return original or modified stream.

| Property | Type | Description |
| --- | --- | --- |
| `stream` | `Stream` | Bundle stream. |
| `isAsyncTask` | `Boolean` | Is bundle stream async require stream. |
| `isWatchUpdate` | `Boolean` | Is current callback inside watch update mode. |

##### onAfterWrite

Type: `Function`

Method to call after bundle gets written to filesystem. It should return original or modified stream.

| Property | Type | Description |
| --- | --- | --- |
| `stream` | `Stream` | Bundle stream. |
| `isAsyncTask` | `Boolean` | Is bundle stream async require stream. |
| `isWatchUpdate` | `Boolean` | Is current callback inside watch update mode. |

##### onStartBuild

Type: `Function`

Method to call when build starts writing to filesystem. It should return original or modified stream.

| Property | Type | Description |
| --- | --- | --- |
| `stream` | `Stream` | Build stream. |
| `isAsyncTask` | `Boolean` | Is build stream async requires stream. |

##### onBeforeBuild

Type: `Function`

Method to call before build gets written to filesystem. It should return original or modified stream.

| Property | Type | Description |
| --- | --- | --- |
| `stream` | `Stream` | Build stream. |
| `isAsyncTask` | `Boolean` | Is build stream async requires stream. |

##### onAfterBuild

Type: `Function`

Method to call after build gets written to filesystem. It should return original or modified stream.

| Property | Type | Description |
| --- | --- | --- |
| `stream` | `Stream` | Build stream. |
| `isAsyncTask` | `Boolean` | Is build stream async requires stream. |

## License

MIT © [Ivan Nikolić](http://ivannikolic.com)

[browserify-opts]: https://github.com/substack/node-browserify#browserifyfiles--opts
[browserify-multiple-bundles]: https://github.com/substack/node-browserify#multiple-bundles
