(function(){

  var docElement = document.documentElement;
  if (!Element.prototype.matches) {
       Element.prototype.matches = docElement.webkitMatchesSelector ||
                                   docElement.mozMatchesSelector ||
                                   docElement.msMatchesSelector ||
                                   docElement.oMatchesSelector;
  }

  var regexParseProperty = /(\w+)|(?:(:*)(\w+)(?:\((.+?(?=\)))\))?)/g;
  var regexPseudoCapture = /(\w+)|:(\w+)\((.+?(?=\)?))?|:(\w+)/g;
  var regexCommaArgs = /,\s*/;
  var range = document.createRange();

  function delegateAction(node, pseudo, event) {
    var match,
        target = event.target,
        root = event.currentTarget;
    while (!match && target && target != root) {
      if (target.tagName && target.matches(pseudo.args)) match = target;
      target = target.parentNode;
    }
    if (!match && root.tagName && root.matches(pseudo.args)) match = root;
    if (match) pseudo.fn = pseudo.fn.bind(match);
    else return null;
  }


  var xtag = {
    events: {},
    pseudos: {
      delegate: {
        onInvoke: delegateAction
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
              val || val === '' ? this.setAttribute(prop, '') : this.removeAttribute(prop);
            },
            get: function(prop){
              return this.hasAttribute(prop);
            }
          }
        },
        onParse (klass, prop, args, descriptor, key){
          if (descriptor.value) throw 'Attribute accessor "'+ prop +'" was declared as a value, but must be declared as get or set';
          klass.getOptions('attributes')[prop] = descriptor;
          var type = this.types[args[0]] || {};
          let descSet = descriptor.set;
          let typeSet = type.set || HTMLElement.prototype.setAttribute;
          descriptor.set = function(val){
            if (!descriptor._skip){
              descriptor._skip = true;
              var output;
              if (descSet) output = descSet.call(this, val);
              typeSet.call(this, prop, typeof output == 'undefined' ? val : output);
              descriptor._skip = null;
            }
          }
          let descGet = descriptor.get;
          let typeGet = type.get || HTMLElement.prototype.getAttribute;
          descriptor.get = function(){
            var output;
            var val = typeGet.call(this, prop);
            if (descGet) output = descGet.call(this, val);
            return typeof output == 'undefined' ? val : output;
          }
          delete klass.prototype[key];
        },
        onCompiled (klass){
          klass.observedAttributes = Object.keys(klass.getOptions('attributes')).concat(klass.observedAttributes || [])
        }
      },
      event: {
        onParse (klass, property, args, descriptor, key){
          delete klass.prototype[key];
          return false;
        },
        onConstruct (node, property, args, descriptor){
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
          render (name){
            var _name = name || 'default';
            var template = this.templates[_name];
            if (template) {
              this.innerHTML = '';
              this.appendChild(range.createContextualFragment(template.call(this)));
            }
            else throw new ReferenceError('Template "' + _name + '" is undefined');
          }
        },
        onParse (klass, property, args, descriptor){
          klass.getOptions('templates')[property || 'default'] = descriptor.value;
          return false;
        },
        onConstruct (node, property, args){
          if (JSON.parse(args[0] || false)) node.render(property);
        }
      }
    },
    create (name, klass){
      var c = klass || name;
      processExtensions('onParse', c); 
      if (klass && name) customElements.define(name, c);
      return c;
    },
    register (name, klass) {
      customElements.define(name, klass);
    },
    addEvent (node, key, fn, capture){
      var type;  
      var stack = fn;
      var ref = { data: {}, capture: capture };
      var pseudos = node.constructor.getOptions('pseudos');
      key.replace(regexPseudoCapture, (match, name, pseudo1, args, pseudo2) => {
        if (name) type = name;
        else {
          var pseudo = pseudo1 || pseudo2,
              pseudo = pseudos[pseudo] || xtag.pseudos[pseudo];
          var _args = args ? args.split(regexCommaArgs) : [];
          stack = pseudoWrap(pseudo, _args, stack, ref);
          if (pseudo.onParse) pseudo.onParse(node, type, _args, stack, ref);
        }
      });
      node.addEventListener(type, stack, capture);
      ref.type = type;
      ref.listener = stack;
      var event = node.constructor.getOptions('events')[type] || xtag.events[type];
      if (event) {
        var listener = function(e){
          new Promise((resolve, reject) => {
            event.onFilter(this, e, ref, resolve, reject);
          }).then(() => {
            xtag.fireEvent(e.target, type);
          });
        }
        ref.attached = event.attach.map(key => {
          return xtag.addEvent(node, key, listener, true);
        });
        if (event.onAdd) event.onAdd(node, ref);
      }
      return ref;
    },
    removeEvent (node, ref){
      node.removeEventListener(ref.type, ref.listener, ref.capture);
      var event = node.constructor.getOptions('events')[ref.type] || xtag.events[ref.type];
      if (event && event.onRemove) event.onRemove(node, ref);
      if (ref.attached) ref.attached.forEach(attached => { xtag.removeEvent(node, ref) })
    },
    fireEvent (node, name, obj = {}){
      let options = Object.assign({
        bubbles: true,
        cancelable: true
      }, obj);
      node.dispatchEvent(new CustomEvent(name, options));
    }
  }

  function createClass(options = {}){
    var klass;
    klass = class extends (options.native ? Object.getPrototypeOf(document.createElement(options.native)).constructor : HTMLElement) {
      constructor () {
        super();
        if (!this._data) this._data = {};
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
      }, this);
    }

    klass.as = function(tag){
      return createClass({
        native: tag
      });
    }

    return klass.extensions('attr', 'event', 'template');
  }

  XTagElement = createClass();

  function pseudoWrap(pseudo, args, fn, detail){
    return function(){
      var _pseudo = { fn: fn, args: args, detail: detail };
      var output = pseudo.onInvoke(this, _pseudo, ...arguments);
      if (output === null || output === false) return output;
      return _pseudo.fn.apply(this, output instanceof Array ? output : arguments);
    };
  }

  function processExtensions(event, target){
    switch (event) {
      case 'onParse': {
        var processedProps = {};
        var descriptors = getDescriptors(target);
        var extensions = target.getOptions('extensions');
        var processed = target._processedExtensions = new Map();   
        for (let z in descriptors) {
          let matches = [];
          let property;
          let extension;
          let extensionArgs = [];
          let descriptor = descriptors[z];
          let pseudos = target._pseudos || xtag.pseudos;
          z.replace(regexParseProperty, function(){ matches.unshift(arguments);  });
          matches.forEach(a => function(match, prop, dots, name, args){
            property = prop || property;
            if (args) var _args = args.split(regexCommaArgs);
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
          }.apply(null, a));
          let attachProperty;
          if (extension) {
            processed.get(extension).push([property, extensionArgs, descriptor]);
            if (extension.onParse) attachProperty = extension.onParse(target, property, extensionArgs, descriptor, z);
          }
          if (!property) delete target.prototype[z];
          else if (attachProperty !== false) {
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