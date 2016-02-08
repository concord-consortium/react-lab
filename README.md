# react-lab

React component wrapping Lab interactive.

## Example

```javascript
<Lab interactive={interactive} model={model} embeddableSrc="lab/embeddable.html"
     width='450px' playing={true} props={this.state.labProps} observedProps={['targetTemperature']}
     onPropChange={this.labPropChanged}/>
```

See more at https://github.com/concord-consortium/react-lab-examples.

## Requirements

Lab component uses `embeddableSrc` path (which defaults to `lab/embeddable.html`).
You need to serve Lab distribution under the same domain as your application.
Lab is included in the final package (`/lab`), so you can use it.

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

## License 

[MIT](https://github.com/concord-consortium/grasp-seasons/blob/master/LICENSE)
