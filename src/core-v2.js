

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

  var range = document.createRange();

  var xtag = {
    events: {},
    pseudos: {},
    extensions: {
      attr: {
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
        onParse: function(extension, prop, args, descriptor){
          var type = extension.types[args[0]] || {};
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
        }
      },
      event: {
        onParse: function(){
          return false;
        },
        onConstruct: function(extension, property, args, descriptor){
          this.addEventListener(property, descriptor.value);
        }
      },
      template: {
        mixin: (base) => class extends base {
          set 'template::attr' (name){
            this.render(name);
          }
          get templates (){
            return this.baseClass._templates;
          }
          render(name){
            var _name = name || 'default';
            var template = this.baseClass._templates[_name];
            if (template) {
              this.innerHTML = '';
              this.appendChild(range.createContextualFragment(template.call(this)));
            }
            else throw new ReferenceError('Template "' + _name + '" is undefined');
          }
        },
        onDeclare: function(){
          if (!this.baseClass._templates) this.baseClass._templates = {};
        },
        onParse: function(extension, property, args, descriptor){
          this.baseClass._templates[property || 'default'] = descriptor.value;
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

      get baseClass(){ return klass }

      attributeChangedCallback(){

      }
    };

    klass.baseClass = klass;
    klass._extensions = {};
    klass._pseudos = {};

    klass.extensions = function extensions(...extensions){
      return extensions.reduce((current, extension) => {
        var mixin;
        var extended = current;
        if (!klass._extensions[extension.name]) {
          if (typeof extension == 'string') {
            mixin = xtag.extensions[extension].mixin;
            klass._extensions[extension] = xtag.extensions[extension];
          }
          else {
            mixin = extension.mixin;
            klass._extensions[extension.name] = extension;
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
      var output = pseudo.onInvoke.apply(this, [pseudo, args]);
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
        var extensions = target._processedExtensions = {};   
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
            if (dots && dots == '::') {
              extensionName = name;
              extensionArgs = _args || [];
              extension = target._extensions[name] || xtag.extensions[name];             
              if (!extensions[name]) {
                extensions[name] = [];
                if (extension.onDeclare) extension.onDeclare.call(target, descriptors);
              }
            }
            else if (!prop){
              let pseudo = pseudos[name];
              if (pseudo) {
                for (let y in descriptor) {
                  if (typeof descriptor[y] == 'function' && pseudo.onInvoke) {
                    descriptor[y] = pseudoWrap(pseudo, _args, descriptor[y]);
                  }
                }
                if (pseudo.onParse) pseudo.onParse.apply(target, [pseudo, property, args, descriptor]);
              }
            }
          });
          let attachProperty;
          if (extension) {
            let args = [extension, property, extensionArgs, descriptor];
            extensions[extensionName].push(args);
            if (extension.onParse) attachProperty = extension.onParse.apply(target, args);
          }
          if (!property || attachProperty === false) delete target.prototype[z];
          if (property && attachProperty !== false) {
            let prop = processedProps[property] || (processedProps[property] = {});
            for (let y in descriptor) prop[y] = descriptor[y];
          }
        }
        Object.defineProperties(target.prototype, processedProps);
        break;
      }
    
      case 'onConstruct': {
        let extensions = target.constructor._processedExtensions;
        for (let z in extensions) {
          extensions[z].forEach(item => {
            if (item[0].onConstruct) item[0].onConstruct.call(target, ...item);
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

  if (typeof define === 'function' && define.amd) {
    define(xtag);
    define(XTagElement);
  }
  else if (typeof module !== 'undefined' && module.exports) {
    module.exports = { xtag: xtag, XTagElement: XTagElement };
  }
  else window.xtag = xtag;

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



// Clock = xtag.create(class Clock extends XTagElement {
//   connectedCallback (){
//     this.start();
//   }
//   start (){
//     this.update();
//     this.interval = setInterval(this.update.bind(this), 1000);
//   }
//   stop (){
//     this.interval = clearInterval(this.interval);
//   }
//   update (){
//     this.textContent = new Date().toLocaleTimeString();
//   }
//   'click::event' (){
//     if (this.interval) this.stop();
//     else this.start();
//   }
// });

// xtag.register('x-clock', Clock);

// DigitalClock = xtag.create(class DigitalClock extends Clock {

//   connectedCallback () {
//     super.connectedCallback();
//     var span = document.createElement('span');
//     span.textContent = 2;
//     this.appendChild(span)
//   }

//   'tap::event' (){

//   }

// });

// xtag.register('x-clock2', DigitalClock);
