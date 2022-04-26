import React from 'react';
import iframePhone from 'iframe-phone';
import MODEL_ONLY_INTERACTIVE from './model-only-interactive';
import { generateEmbeddableHTML } from "./generate-embeddable-html";

const DEF_UPDATE_DELAY = 75; // ms

interface IProps {
  // Whether to use local iframe with "srcDoc" attribute or regular "src" attr pointing to standard Lab embeddable.html
  // page. It's recommended to keep this property equal to true unless there are some issues. When this property is
  // equal to false, Lab distribution needs to be under the same domain.
  useSrcDocIframe?: boolean;
  // Source to Lab distribution. This package is providing lab distribution that can be used (/lab).
  // It needs to end with `/`. When useSrcDocIframe = false, it needs to be hosted under the same domain.
  labDistPath?: string;
  // Lab model JSON (parsed).
  model: object;
  // Lab interactive JSON (parsed). If not provided, MODEL_ONLY_INTERACTIVE will be used.
  interactive?: object;
  // Lab properties.
  props?: object;
  // Batch Lab properties updates and send them to Lab after given time period.
  // You can provide value in ms or use true (the default delay value will be used).
  propsUpdateDelay?: boolean | number;
  // Lab observed properties (onPropChange will be called when any of them changes).
  observedProps?: string[];
  playing?: boolean;
  // Callbacks.
  onModelLoad?: () => void;
  onPropChange?: (propName: string, value: any) => void;
  onLogEvent?: (action: string, data: any) => void;
  // Iframe properties.
  width?: string | number;
  height?: string | number;
  allowFullScreen?: boolean;
  frameBorder?: string;
  // Lab lets you update interactive or model without reloading the iframe, but that might lead to memory leaks
  // and performance issues. Complete iframe reload is a safe option, but it increases loading time a bit.
  reloadIframeOnModelUpdate?: boolean;
}
interface IState {
  loading: boolean;
}

export default class Lab extends React.Component<IProps, IState> {
  static defaultProps = {
    interactive: MODEL_ONLY_INTERACTIVE,
    useSrcDocIframe: true,
    labDistPath: 'lab/',
    width: '565px',
    height: '435px',
    allowFullScreen: true,
    frameBorder: '0',
    props: {},
    observedProps: [],
    propsUpdateDelay: false,
    reloadIframeOnModelUpdate: true
  };

  public iframeRef = React.createRef<HTMLIFrameElement>();

  private _labUpdateTimeoutID: number | null = null;
  private _propsToSet = {};
  private _phone: any;

  constructor(props: IProps) {
    super(props);
    this.state = {
      loading: true
    };
    this._handleIframeLoad = this._handleIframeLoad.bind(this);
    this._asyncLabPropertiesUpdate = this._asyncLabPropertiesUpdate.bind(this);
  }

  componentDidMount() {
    const connectToIframe = () => {
      if (this.iframeRef.current) {
        this._phone = new iframePhone.ParentEndpoint(this.iframeRef.current);
        this._phone.addListener('log', (content: any) => {
          this.props.onLogEvent?.(content.action, content.data);
        });
        this.iframeRef.current.addEventListener('load', this._handleIframeLoad);
      } else {
        setTimeout(connectToIframe, 100);
      }
    }
    connectToIframe();
  }

  componentWillUnmount() {
    this._phone.disconnect();
    this.iframeRef.current?.removeEventListener('load', this._handleIframeLoad);
  }

  componentWillReceiveProps(nextProps: IProps) {
    if (nextProps.interactive !== this.props.interactive ||
        nextProps.model !== this.props.model) {
      // Complete iframe reload is slower, but more bulletproof and workarounds Lab issues related to memory leaks.
      if (nextProps.reloadIframeOnModelUpdate) {
        // Looks a bit magic, but interactive will be loaded and completely setup (including interactive and model jsons)
        // by the iframe "onload" handler. Take a look at _handleIframeLoad() method.
        this.iframeRef.current?.contentWindow?.location.reload();
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
      this._setLabPlaying(!!nextProps.playing);
    }
  }

  shouldComponentUpdate(nextProps: IProps, nextState: IState) {
    // List here everything that is used in render() method.
    // Other properties are sent directly to Lab using scriptingAPI, so we don't need to re-render component.
    const viewProps = ['width', 'height', 'useSrcDocIframe', 'labDistPath', 'frameBorder', 'allowFullScreen'];
    const viewState = ['loading'];
    for (const prop of viewProps) {
      if ((nextProps as any)[prop] !== (this.props as any)[prop]) return true;
    }
    for (const prop of viewState) {
      if ((nextState as any)[prop] !== (this.state as any)[prop]) return true;
    }
    return false;
  }

  render () {
    const { width, height, frameBorder, allowFullScreen, labDistPath, useSrcDocIframe } = this.props;
    const { loading } = this.state;
    const style = loading ? {visibility: 'hidden' as const} : {};
    const src = useSrcDocIframe ? "" : `${labDistPath}embeddable.html`;
    const srcDoc = useSrcDocIframe ? generateEmbeddableHTML(labDistPath) : undefined;
    return (
      <iframe ref={this.iframeRef} src={src} srcDoc={srcDoc} frameBorder={frameBorder} style={style}
        width={width} height={height} allowFullScreen={allowFullScreen}>
      </iframe>
    )
  }

  // Public API.

  get scriptingAPI() {
    // window.script is exported by Lab
    return (this.iframeRef.current?.contentWindow as any)?.script;
  }

  get interactiveController() {
    // Embeddable.controller is exported by Lab
    return (this.iframeRef.current?.contentWindow as any)?.Embeddable?.controller;
  }

  get iframe() {
    return this.iframeRef.current;
  }

  get phone() {
    return this._phone;
  }

  // Private methods. Use React properties instead.

  _handleIframeLoad() {
    this.interactiveController.on('modelLoaded.react-lab', () => {
      this._setLabProperties(this.props.props);
      this._addLabListeners(this.props.observedProps || []);
      this._setLabPlaying(!!this.props.playing);
      this.props.onModelLoad?.();
      this._handleModelLoad();
    });
    this._loadInteractive(this.props.interactive, this.props.model);
  }

  _handleModelLoad() {
    this.setState({loading: false});
  }

  _loadInteractive(interactive: any, model: any) {
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

  _setLabProperties(props: any) {
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
    this._labUpdateTimeoutID = window.setTimeout(this._asyncLabPropertiesUpdate, delay);
  }

  _asyncLabPropertiesUpdate() {
    // Iframe or model might be still loading. The props will be set when model is loaded.
    if (this.scriptingAPI) this.scriptingAPI.set(this._propsToSet);
    this._labUpdateTimeoutID = null;
    this._propsToSet = {};
  }

  _setLabPlaying(v: boolean) {
    // Iframe or model might be still loading. Model will be started or stopped when model is loaded.
    if (!this.scriptingAPI) return;
    if (v) {
      this.scriptingAPI.start();
    } else {
      this.scriptingAPI.stop();
    }
  }

  _addLabListeners(observedProps: string[]) {
    observedProps.forEach((propName) => {
      this.scriptingAPI.onPropertyChange(propName, (value: any) => {
        this.props.onPropChange?.(propName, value);
      });
    });
  }
}

function combineInteractiveAndModel(interactive: any, model: any) {
  delete interactive.models[0].url;
  interactive.models[0].model = model;
  return interactive;
}

function diff(newProps: any, oldProps: any = {}) {
  let result: Record<string, any> = {};
  Object.keys(newProps).forEach(function (key) {
    if (newProps[key] !== oldProps[key]) result[key] = newProps[key];
  });
  return result;
}

function extend(target: any, source: any) {
  for (var key in source) {
    if (source.hasOwnProperty(key)) {
      target[key] =source[key];
    }
  }
  return target;
}
