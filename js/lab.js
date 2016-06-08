import React from 'react';
import iframePhone from 'iframe-phone';

const DEF_UPDATE_DELAY = 75; // ms

export default class Lab extends React.Component {
  componentDidMount() {
    this._phone = new iframePhone.ParentEndpoint(this.refs.iframe);
    this._labUpdateTimeoutID = null;
    this._propsToSet = {};
    this._asyncLabPropertiesUpdate = this._asyncLabPropertiesUpdate.bind(this);

    this.refs.iframe.onload = () => {
      this.interactiveController.on('modelLoaded.react-lab', () => {
        this.props.onModelLoad();
        this._setLabProperties(this.props.props);
        this._addLabListeners(this.props.observedProps);
        this._setLabPlaying(this.props.playing);
      });
      this._loadInteractive(this.props.interactive, this.props.model);
    };
    this._phone.addListener('log', (content) => {
      this.props.onLogEvent(content.action, content.data);
    });
  }

  componentWillUnmount() {
    this._phone.disconnect();
  }

  componentWillReceiveProps(nextProps) {
    if (nextProps.interactive !== this.props.interactive ||
        nextProps.model !== this.props.model) {
      this._loadInteractive(nextProps.interactive, nextProps.model)
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

  shouldComponentUpdate(nextProps) {
    // Update component only if it's width or height is changed.
    return nextProps.width !== this.props.width ||
           nextProps.height !== this.props.height;
  }

  render() {
     const { width, height, embeddableSrc, frameBorder, allowFullScreen } = this.props;
    return (
      <iframe ref='iframe' src={embeddableSrc} frameBorder={frameBorder}
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

  _loadInteractive(interactive, model) {
    // Iframe might be still loading. The interactive will be loaded when iframe is loaded.
    if (!this.interactiveController) return;
    if (interactive) {
      if (model) {
        interactive = combineInteractiveAndModel(interactive, model)
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

Lab.defaultProps = {
  // Source to Lab embeddable page. Needs to be under the same domain as the application.
  // This package is providing lab distribution that can be used (/lab).
  embeddableSrc: 'lab/embeddable.html',
  width: '565px',
  height: '435px',
  allowFullScreen: true,
  frameBorder: '0',
  props: {},
  observedProps: [],
  // Batch Lab properties updates and send them to Lab after given time period.
  // You can provide value in ms or use true (the default delay value will be used).
  propsUpdateDelay: false,
  onModelLoad: function () {},
  onPropChange: function (name, value) {},
  onLogEvent: function (actionName, data) {}
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
