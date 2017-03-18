

(function(){

  // var root = document.documentElement;
  // var matches = function(node, selector) {
  //   return this.call(node, selector);
  // }.bind(root.matches || root.webkitMatchesSelector || root.mozMatchesSelector || root.msMatchesSelector || root.oMatchesSelector);

  // NodeList.prototype.forEach = NodeList.prototype.forEach || Array.prototype.forEach;

  var regexParseProperty = /(\w+)|(?:(:*)(\w+)(?:\((.+?(?=\)))\))?)/g;
  var regexReplaceCommas = /,/g;
  var regexCamelToDash = /([a-z])([A-Z])/g;
  var regexCaptureDigits = /(\d+)/g;

  var createFragment = document.createRange.createContextualFragment;

  xtag = {
    mixins: {},
    pseudos: {},
    customEvents: {},
    extensions: {
      attr: {
        types: {
          undefined: {
            set: function(prop, val){
              this.setAttribute(prop, val);
            },
            get: function(prop){
              return this.getAttribute(prop);
            }
          },
          boolean: {
            set: function(prop, val){
              val ? this.setAttribute(prop, '') : this.removeAttribute(prop);
            },
            get: function(prop){
              return this.hasAttribute(prop);
            }
          }
        },
        onDeclare: function(extension, prop, args, descriptor){
          var type = extension.types[args[0]];
          if (descriptor.set || type && type.set) {
            let descFn = descriptor.set;
            let typeFn = type.set || HTMLElement.prototype.setAttribute;
            descriptor.set = function(val){
              var output;
              if (descFn) output = descFn.call(this, val);
              typeFn.call(this, prop, typeof output == 'undefined' ? val : output) ;
            }
          }
          if (descriptor.get || type && type.get) {
            let descFn = descriptor.get;
            let typeFn = type.get || HTMLElement.prototype.getAttribute;
            descriptor.get = function(){
              if (descFn) descFn.call(this);
              return typeFn.call(this, prop);
            }
          }
          delete descriptor.value;
          delete descriptor.writable;
        }
      },
      event: {
        onDeclare: function(){
          return false;
        },
        onConstruct: function(extension, property, args, descriptor){
          this.addEventListener(property, descriptor.value);
        }
      },
      template: {
        onDeclare: function(extension, property, args, descriptor){
          descriptor.value = createFragment(descriptor.value).firstChild;
          return false;
        },
        onConstruct: function(){}
      }
    },
    create: function(klass){
      processExtensions('onDeclare', klass); 
      return klass;
    },
    define: function (name, klass) {
      customElements.define(name, klass);
    },
    fireEvent: function(node, name, obj = {}){
      node.dispatchEvent(new CustomEvent(name, obj));
    }
  }

  function createClass(options = {}){
    var klass = class extends (options.native ? Object.getPrototypeOf(document.createElement(options.native)).constructor : HTMLElement) {
      constructor () {
        super();
        console.log('onConstruct');
        processExtensions('onConstruct', this);
      }

      static get observedAttributes(){ return []; }

      attributeChangedCallback(){

      }
    };

    klass._onConstruct = {};
    klass._extensions = {}; 
    klass._pseudos = {};
    klass._mixins = {};

    klass.mix = function mix(...mixins){
      return class extends (mixins.reduce(mixin, current => {
        let mixed = mixin instanceof String ? klass._mixins[mixin] || xtag.mixins[mixin] : mixin(current);
        processExtendsions('onDeclare', mixed);
        return mixed;
      }, this)){}
    }

    return klass;
  }

  XTagElement = function(tag){
    return createClass({
      native: tag
    });
  }

  function pseudoWrap(pseudo, args, fn){
    return function(){
      var output = pseudo.onInvoke.apply(this, [pseudo, args]);
      if (output === null || output === false) return output;
      return fn.apply(this, output instanceof Array ? output : arguments);
    };
  }

  var doubleColon = '::';
  function processExtensions(event, target){
    
    switch (event) {
      case 'onDeclare': {
        let processedProps = {};
        let descriptors = getDescriptors(target);
        for (let z in descriptors) {
          let property;
          let extension;
          let extensionName;
          let extensionArgs = [];
          let descriptor = descriptors[z];
          let pseudos = target._pseudos || xtag.pseudos;
          z.replace(regexParseProperty, function(match, prop, dots, name, args){
            property = prop || property;
            if (args) var _args = JSON.parse('['+ args +']');
            if (dots == doubleColon) {
              extensionName = name;
              extension = extension || target._extensions[name] || xtag.extensions[name];
              extensionArgs = _args || [];
            }
            else if (!prop){
              for (let y in descriptor) {
                var pseudo = pseudos[name];
                if (typeof descriptor[y] == 'function') {
                  if (pseudo.onInvoke) descriptor[y] = pseudoWrap(pseudo, _args, descriptor[y]);
                }
              }
              if (pseudo.onDeclare) pseudo.onDeclare.apply(target, [pseudo, property, args, descriptor]);
            }
          });

          let attachProperty;
          if (extension) {
            let args = [extension, property, extensionArgs, descriptor];
            if (extension.onConstruct) {
              (target._onConstruct[extensionName] = (target._onConstruct[extensionName] || [])).push(args);
            }
            attachProperty = extension.onDeclare.apply(target, args);
          }
          if (!property || attachProperty === false) delete target.prototype[z];
          if (property && attachProperty !== false) {
            let prop = processedProps[property] || (processedProps[property] = {});
            for (let y in descriptor) {
              processedProps[property][y] = descriptor[y];
            }
          }
        }

        Object.defineProperties(target.prototype, processedProps);

        break;
      }
    
      case 'onConstruct': {
        
        var constructEntries = target.constructor._onConstruct;
        for (let z in constructEntries) {
          constructEntries[z].forEach(item => {
            item[0].onConstruct.call(target, ...item);
          })
        }
        break;
      }

    }
  }

  function getDescriptors(target){
    var descriptors = {};
    var proto = target.prototype;
    Object.getOwnPropertyNames(proto).forEach(key => {
      descriptors[key] = Object.getOwnPropertyDescriptor(proto, key);
    });
    return descriptors;
  }

})();

Article = xtag.create(class Article extends XTagElement() {
  '::template' (){ return
    `
      <h1>Great Post</h1>
      <h3>Actually, it's the greatest</h3>
      <ul>
        <li>1</li>
        <li>2</li>
        <li>3</li>
      </ul>
    `
  }

Clock = xtag.create(class Clock extends XTagElement() {
  connectedCallback (){
    this.start();
  }
  start (){
    this.update();
    this.interval = setInterval(this.update.bind(this), 1000);
  }
  stop (){
    this.interval = clearInterval(this.interval);
  }
  update (){
    this.textContent = new Date().toLocaleTimeString();
  }
  'click::event' (){
    if (this.interval) this.stop();
    else this.start();
  }
});

xtag.define('x-clock', Clock);

DigitalClock = xtag.create(class DigitalClock extends Clock {

  connectedCallback () {
    super.connectedCallback();
    var span = document.createElement('span');
    span.textContent = 2;
    this.appendChild(span)
  }

  'tap::event' (){

  }

});

xtag.define('x-clock2', DigitalClock);
