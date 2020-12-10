# react-lab

React component wrapping Lab interactive.

## Example

```javascript
<Lab interactive={interactive} model={model} labDistPath="lab/"
     width='450px' playing={true} props={this.state.labProps} observedProps={['targetTemperature']}
     onPropChange={this.labPropChanged}/>
```

See more at https://github.com/concord-consortium/react-lab-examples.

## Requirements

Lab component uses `labDistPath` path (which defaults to `lab/`).
Lab is included in the final package (`/lab`), so you can use it. Usually just by copying it directly 
from the NPM package. Check: https://github.com/concord-consortium/react-lab-examples/blob/master/webpack.config.js

## Development

This project is using [webpack](http://webpack.github.io/) to build the final JS file in `/dist` folder.

First, you need to make sure that webpack is installed and all the NPM packages required by this project are available:

```
npm install -g webpack
npm install
```
Then you can build JavaScript files using:
```
webpack
```
or:
```
webpack --watch
```

## Bundled Lab distribution

This package includes pre-built Lab framework. Users of this library should also use bundled Lab distribution, as
it's guaranteed to work with the current react-lab version. You can update it using:

```
./update.sh <version-number>
e.g.
./update.sh 1.14.0
```

It will download Lab 1.14.0 and replace library in `lab/lab` directory. You should always check if it still works,
as in some cases the embeddable page might need to be updated too (however it's not very likely).

## License 

[MIT](https://github.com/concord-consortium/grasp-seasons/blob/master/LICENSE)
