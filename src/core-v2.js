

(function(){

  // var root = document.documentElement;
  // var matches = function(node, selector) {
  //   return this.call(node, selector);
  // }.bind(root.matches || root.webkitMatchesSelector || root.mozMatchesSelector || root.msMatchesSelector || root.oMatchesSelector);

  // NodeList.prototype.forEach = NodeList.prototype.forEach || Array.prototype.forEach;

  var regexParseProperty = /(\w+)|(?:(:*)(\w+)(?:\((.+?(?=\)))\))?)/g;
  var regexPseudoCapture = /(\w+)|:(\w+)\((.+?(?=\)?))?|:(\w+)/g;
  var regexCamelToDash = /([a-z])([A-Z])/g;
  var regexCaptureDigits = /(\d+)/g;
  var emptyObj = {};
  var range = document.createRange();

  var xtag = {
    events: {
      tap: {
        attach: ['pointerdown', 'pointerup'],
        onFilter: function(node, event, data){
          if (event.type == 'pointerdown') {
            data.startX = event.clientX;
            data.startY = event.clientY;
          }
          else return (event.button === 0 &&
                       Math.abs(data.startX - event.clientX) < 10 &&
                       Math.abs(data.startY - event.clientY) < 10) || null;
        }
      }
    },
    pseudos: {
      log: {
        onInvoke: function(){
          console.log(arguments);
        }
      }
    },
    extensions: {
      attr: {
        mixin: (base) => class extends base {
          attributeChangedCallback(attr, last, current){
            var desc = this.constructor.getOptions('attributes')[attr];
            if (desc && desc.set && !desc._skip) {
              desc._skip = true;
              desc.set.call(this, current);
              desc._skip = null;
            }
          }
        },
        types: {
          boolean: {
            set: function(prop, val){
              val ? this.setAttribute(prop, '') : this.removeAttribute(prop);
            },
            get: function(prop){
              return this.hasAttribute(prop);
            }
          }
        },
        onParse: function(klass, prop, args, descriptor){
          klass.getOptions('attributes')[prop] = descriptor;
          var type = this.types[args[0]] || {};
          let descSet = descriptor.set;
          let typeSet = type.set || HTMLElement.prototype.setAttribute;
          descriptor.set = function(val){
            var output;
            if (descSet) output = descSet.call(this, val);
            typeSet.call(this, prop, typeof output == 'undefined' ? val : output) ;
          }
          let descGet = descriptor.get;
          let typeGet = type.get || HTMLElement.prototype.getAttribute;
          descriptor.get = function(){
            var output;
            var val = typeGet.call(this, prop);
            if (descGet) output = descGet.call(this, val);
            return typeof output == 'undefined' ? val : output;
          }
          delete descriptor.value;
          delete descriptor.writable;
        },
        onCompiled: function(klass, descriptors){
          klass.observedAttributes = Object.keys(klass.getOptions('attributes')).concat(klass.observedAttributes || [])
        }
      },
      event: {
        onParse: function(klass, property, args, descriptor){
          return false;
        },
        onConstruct: function(node, property, args, descriptor){
          xtag.addEvent(node, property, descriptor.value);
        }
      },
      template: {
        mixin: (base) => class extends base {
          set 'template::attr' (name){
            this.render(name);
          }
          get templates (){
            return this.constructor.getOptions('templates');
          }
          render(name){
            var _name = name || 'default';
            var template = this.templates[_name];
            if (template) {
              this.innerHTML = '';
              this.appendChild(range.createContextualFragment(template.call(this)));
            }
            else throw new ReferenceError('Template "' + _name + '" is undefined');
          }
        },
        onParse: function(klass, property, args, descriptor){
          klass.getOptions('templates')[property || 'default'] = descriptor.value;
          return false;
        }
      }
    },
    create: function(klass){
      processExtensions('onParse', klass); 
      return klass;
    },
    register: function (name, klass) {
      customElements.define(name, klass);
    },
    addEvent: function(node, key, fn, capture){
      var type;
      var _fn = fn;
      var pseudos = node.constructor.getOptions('pseudos');
      key.replace(regexPseudoCapture, (match, name, pseudo1, args, pseudo2) => {
        if (name) type = name;
        else {
          var pseudo = pseudo1 || pseudo2,
              pseudo = pseudos[pseudo] || xtag.pseudos[pseudo];
          var _args = args ? JSON.parse('['+ args +']') : [];
          _fn = pseudoWrap(pseudo, _args, _fn);
          if (pseudo.onParse) pseudo.onParse(node, type, _args, _fn);
        }
      })

      node.addEventListener(type, _fn, capture);
      var ref = { type: type, listener: _fn, capture: capture, data: {} };
      var event = node.constructor.getOptions('events')[type] || xtag.events[type];
      if (event) {
        var listener = function(e){
          var output = event.onFilter(this, e, ref.data);
          if (!output) return output;
          xtag.fireEvent(e.target, type);
        }
        ref.attached = event.attach.map(type => {
          return xtag.addEvent(node, type, listener);
        });
      }
      return ref;
    },
    removeEvent: function(node, ref){
      node.removeEventListener(ref.type, ref.listener, ref.capture);
      if (ref.attached) ref.attached.forEach(attached => { xtag.removeEvent(node, ref) })
    },
    fireEvent: function(node, name, obj = {}){
      node.dispatchEvent(new CustomEvent(name, obj));
    }
  }

  function createClass(options = {}){
    var klass;
    klass = class extends (options.native ? Object.getPrototypeOf(document.createElement(options.native)).constructor : HTMLElement) {
      constructor () {
        super();
        processExtensions('onConstruct', this);
      }
    };

    klass.options = {};
    klass.getOptions = function(name){
      return this.options[name] || (this.options[name] = Object.assign({}, this.__proto__.options ? this.__proto__.options[name] : {}));
    }
    
    klass.getOptions('extensions');
    klass.getOptions('pseudos');

    klass.extensions = function extensions(...extensions){
      var exts = this.getOptions('extensions');
      return extensions.reduce((current, extension) => {
        var mixin;
        var extended = current;
        if (!exts[extension.name]) {
          if (typeof extension == 'string') {
            mixin = xtag.extensions[extension].mixin;
            exts[extension] = xtag.extensions[extension];
          }
          else {
            mixin = extension.mixin;
            exts[extension.name] = extension;
          }
          if (mixin) {
            extended = mixin(current);
            processExtensions('onParse', extended);
          }
        }
        return extended;
      }, klass);
    }

    klass.as = function(tag){
      return createClass({
        native: tag
      });
    }

    return klass.extensions('attr', 'event', 'template');
  }

  XTagElement = createClass();

  function pseudoWrap(pseudo, args, fn){
    return function(){
      var output = pseudo.onInvoke(this, args, fn);
      if (output === null || output === false) return output;
      return fn.apply(this, output instanceof Array ? output : arguments);
    };
  }

  var doubleColon = '::';
  function processExtensions(event, target){
    switch (event) {
      case 'onParse': {
        var processedProps = {};
        var descriptors = getDescriptors(target);
        var extensions = target.getOptions('extensions');
        var processed = target._processedExtensions = new Map();   
        for (let z in descriptors) {
          let property;
          let extension;
          let extensionArgs = [];
          let descriptor = descriptors[z];
          let pseudos = target._pseudos || xtag.pseudos;   
          z.replace(regexParseProperty, function(match, prop, dots, name, args){ 
            property = prop || property;
            if (args) var _args = JSON.parse('['+ args +']');
            if (dots && dots == '::') {
              extensionArgs = _args || [];
              extension = extensions[name] || xtag.extensions[name];             
              if (!processed.get(extension)) processed.set(extension, []);
            }
            else if (!prop){
              let pseudo = pseudos[name];
              if (pseudo) {
                for (let y in descriptor) {
                  let fn = descriptor[y];
                  if (typeof fn == 'function' && pseudo.onInvoke) {
                    fn = descriptor[y] = pseudoWrap(pseudo, _args, fn);
                    if (pseudo.onParse) pseudo.onParse(target, property, _args, fn);
                  }
                }
              }
            }
          });
          let attachProperty;
          if (extension) {
            processed.get(extension).push([property, extensionArgs, descriptor]);
            if (extension.onParse) attachProperty = extension.onParse(target, property, extensionArgs, descriptor);
          }
          if (!property || attachProperty === false) delete target.prototype[z];
          if (property && attachProperty !== false) {
            let prop = processedProps[property] || (processedProps[property] = {});
            for (let y in descriptor) prop[y] = descriptor[y];
          }
        }
        for (let ext of processed.keys()) {
          if (ext.onCompiled) ext.onCompiled(target, processedProps);
        }
        Object.defineProperties(target.prototype, processedProps);
        break;
      }
    
      case 'onConstruct': {
        var processed = target.constructor._processedExtensions;
        for (let [ext, items] of processed) {
          if (ext.onConstruct) items.forEach(item => ext.onConstruct(target, ...item))
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

  if (typeof define === 'function' && define.amd) {
    define(xtag);
    define(XTagElement);
  }
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { xtag: xtag, XTagElement: XTagElement };
  }
  else {
    window.xtag = xtag;
    window.XTagElement = XTagElement;
  }

})();



Post = xtag.create(class Post extends XTagElement {
  'title::attr'(val){}
  'byline::attr'(val){}
  get 'listItems'(){
    return [1,2,3];
  }
  'basic::template' (){ return `<h1>${this.title}</h1>
      <h3>${this.byline}</h3>
      <ul>${this.listItems.map(item => `<li>${item}</li>`).join('')}</ul>`;
  }
});

xtag.register('x-post', Post);


Article = xtag.create(class Article extends Post {
  get test(){ return 'Test'; }
});

xtag.register('x-article', Article);



Clock = xtag.create(class Clock extends XTagElement {
  set 'test::attr("boolean")'(val){ console.log('setting test to: ' + val); }
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
  'tap::event:log' (){
    if (this.interval) this.stop();
    else this.start();
  }
});

xtag.register('x-clock', Clock);

DigitalClock = xtag.create(class DigitalClock extends Clock {

  static get observedAttributes(){
    return ['foo'];
  }

});

xtag.register('x-clock2', DigitalClock);
