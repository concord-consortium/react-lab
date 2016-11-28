import React from 'react';
import iframePhone from 'iframe-phone';

const DEF_UPDATE_DELAY = 75; // ms

export default class Lab extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      loading: true
    };
    this._handleIframeLoad = this._handleIframeLoad.bind(this);
    this._asyncLabPropertiesUpdate = this._asyncLabPropertiesUpdate.bind(this);
    this._labUpdateTimeoutID = null;
    this._propsToSet = {};
  }

  componentDidMount() {
    this._phone = new iframePhone.ParentEndpoint(this.refs.iframe);
    this._phone.addListener('log', (content) => {
      this.props.onLogEvent(content.action, content.data);
    });
    this.refs.iframe.addEventListener('load', this._handleIframeLoad);
  }

  componentWillUnmount() {
    this._phone.disconnect();
    this.refs.iframe.removeEventListener('load', this._handleIframeLoad);
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.interactive !== this.props.interactive ||
        nextProps.model !== this.props.model) {
      // Complete iframe reload is slower, but more bulletproof and workarounds Lab issues related to memory leaks.
      if (nextProps.reloadIframeOnModelUpdate) {
        // Looks a bit magic, but interactive will be loaded and completely setup (including interactive and model jsons)
        // by the iframe "onload" handler. Take a look at _handleIframeLoad() method.
        this.refs.iframe.contentWindow.location.reload();
        this.setState({loading: true});
      } else {
        this._loadInteractive(nextProps.interactive, nextProps.model);
      }
    }
    if (nextProps.props !== this.props.props) {
      // Set only DIFF of new and old properties. It's quite important difference,
      // as Lab calls 'onChange' callbacks each time we set given property,
      // even if we set the same value.
      this._setLabProperties(diff(nextProps.props, this.props.props));
    }
    if (nextProps.playing !== this.props.playing) {
      this._setLabPlaying(nextProps.playing);
    }
  }

  shouldComponentUpdate(nextProps, nextState) {
    // List here everything that is used in render() method.
    // Other properties are sent directly to Lab using scriptingAPI, so we don't need to re-render component.
    const viewProps = ['width', 'height', 'embeddableSrc', 'frameBorder', 'allowFullScreen'];
    const viewState = ['loading'];
    for (const prop of viewProps) {
      if (nextProps[prop] !== this.props[prop]) return true;
    }
    for (const prop of viewState) {
      if (nextState[prop] !== this.state[prop]) return true;
    }
    return false;
  }

  render() {
    const { width, height, embeddableSrc, frameBorder, allowFullScreen } = this.props;
    const { loading } = this.state;
    const style = loading ? {visibility: 'hidden'} : {};
    return (
      <iframe ref='iframe' src={embeddableSrc} frameBorder={frameBorder} style={style}
              width={width} height={height} allowFullScreen={allowFullScreen}>
      </iframe>
    )
  }

  // Public API.

  get scriptingAPI() {
    return this.refs.iframe.contentWindow.script;
  }

  get interactiveController() {
    return this.refs.iframe.contentWindow.Embeddable.controller;
  }

  get iframe() {
    return this.refs.iframe;
  }

  get phone() {
    return this._phone;
  }

  // Private methods. Use React properties instead.

  _handleIframeLoad() {
    this.interactiveController.on('modelLoaded.react-lab', () => {
      this._setLabProperties(this.props.props);
      this._addLabListeners(this.props.observedProps);
      this._setLabPlaying(this.props.playing);
      this.props.onModelLoad();
      this._handleModelLoad();
    });
    this._loadInteractive(this.props.interactive, this.props.model);
  }

  _handleModelLoad() {
    this.setState({loading: false});
  }

  _loadInteractive(interactive, model) {
    // Iframe might be still loading. The interactive will be loaded when iframe is loaded.
    if (!this.interactiveController) return;
    if (interactive) {
      if (model) {
        interactive = combineInteractiveAndModel(interactive, model)
      }
      if (this.scriptingAPI) {
        // Stop the model before loading a new one to avoid performance issues.
        this.scriptingAPI.stop();
      }
      this.interactiveController.loadInteractive(interactive);
    }
  }

  _setLabProperties(props) {
    if (!this.props.propsUpdateDelay) {
      // Iframe or model might be still loading. The props will be set when model is loaded.
      if (this.scriptingAPI) this.scriptingAPI.set(props);
      return;
    }
    extend(this._propsToSet, props);
    if (this._labUpdateTimeoutID !== null) {
      return;
    }
    let delay = this.props.propsUpdateDelay === true ? DEF_UPDATE_DELAY : this.props.propsUpdateDelay;
    this._labUpdateTimeoutID = setTimeout(this._asyncLabPropertiesUpdate, delay);
  }

  _asyncLabPropertiesUpdate() {
    // Iframe or model might be still loading. The props will be set when model is loaded.
    if (this.scriptingAPI) this.scriptingAPI.set(this._propsToSet);
    this._labUpdateTimeoutID = null;
    this._propsToSet = {};
  }

  _setLabPlaying(v) {
    // Iframe or model might be still loading. Model will be started or stopped when model is loaded.
    if (!this.scriptingAPI) return;
    if (v) {
      this.scriptingAPI.start();
    } else {
      this.scriptingAPI.stop();
    }
  }

  _addLabListeners(observedProps) {
    observedProps.forEach((propName) => {
      this.scriptingAPI.onPropertyChange(propName, (value) => {
        this.props.onPropChange(propName, value);
      });
    });
  }
}

Lab.PropTypes = {
  // Lab interactive JSON (parsed).
  interactive: React.PropTypes.object.isRequired,
  // Lab model JSON (parsed).
  model: React.PropTypes.object.isRequired,
  // Source to Lab embeddable page. Needs to be under the same domain as the application.
  // This package is providing lab distribution that can be used (/lab).
  embeddableSrc: React.PropTypes.string,
  // Batch Lab properties updates and send them to Lab after given time period.
  // You can provide value in ms or use true (the default delay value will be used).
  propsUpdateDelay: React.PropTypes.oneOfType([React.PropTypes.bool, React.PropTypes.number]),
  // Lab properties.
  props: React.PropTypes.object,
  // Lab observed properties (onPropChange will be called when any of them changes).
  observedProps: React.PropTypes.array,
  // Iframe properties.
  width: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]),
  height: React.PropTypes.oneOfType([React.PropTypes.string, React.PropTypes.number]),
  allowFullScreen: React.PropTypes.bool,
  frameBorder: React.PropTypes.string,
  // Lab lets you update interactive or model without reloading the iframe, but that might lead to memory leaks
  // and performance issues. Complete iframe reload is a safe option, but it increases loading time a bit.
  reloadIframeOnModelUpdate: React.PropTypes.bool,
  // Callbacks.
  onModelLoad: React.PropTypes.func,
  onPropChange: React.PropTypes.func,
  onLogEvent: React.PropTypes.func,
};

Lab.defaultProps = {
  embeddableSrc: 'lab/embeddable.html',
  width: '565px',
  height: '435px',
  allowFullScreen: true,
  frameBorder: '0',
  props: {},
  observedProps: [],
  propsUpdateDelay: false,
  onModelLoad: function () {},
  onPropChange: function (name, value) {},
  onLogEvent: function (actionName, data) {},
  reloadIframeOnModelUpdate: true
};

function combineInteractiveAndModel(interactive, model) {
  delete interactive.models[0].url;
  interactive.models[0].model = model;
  return interactive;
}

function diff(newProps, oldProps={}) {
  let result = {};
  Object.keys(newProps).forEach(function (key) {
    if (newProps[key] !== oldProps[key]) result[key] = newProps[key];
  });
  return result;
}

function extend() {
  for (var i = 1; i < arguments.length; i++)
    for (var key in arguments[i])
      if (arguments[i].hasOwnProperty(key))
        arguments[0][key] = arguments[i][key];
  return arguments[0];
}
