

(function(){

  // var root = document.documentElement;
  // var matches = function(node, selector) {
  //   return this.call(node, selector);
  // }.bind(root.matches || root.webkitMatchesSelector || root.mozMatchesSelector || root.msMatchesSelector || root.oMatchesSelector);

  // NodeList.prototype.forEach = NodeList.prototype.forEach || Array.prototype.forEach;

  var regexParseProperty = /(\w+)|(?:(:*)(\w+)(?:\((.+?(?=\)))\))?)/g;
  // var regexPseudoParens = /\(|\)/g;
  // var regexCapturePseudos = /(?::{2,}|(?::)(\w+)(\((.+?(?=\)))\))?)/g;

  var regexReplaceCommas = /,/g;
  var regexCamelToDash = /([a-z])([A-Z])/g;
  var regexCaptureDigits = /(\d+)/g;

  function mix(klass, key, obj, fn){
    Object.defineProperty(klass.prototype, key, {
      __proto__: obj.__proto__ = klass.__proto__.prototype,
      value (){
        return fn.apply(this, [...arguments, super[key]]);
      }
    });
  }

  xtag = {
    mixins: {},
    pseudos: {},
    customEvents: {},
    extensions: {
      attr: {
        onDeclare: function(klass){
          var proto = klass.prototype;
          Object.getOwnPropertyNames(proto).forEach(prop => {
            
          })

          for (let z in accessors) {
            mix(target, z, accessors, accessors[z]);
          }
        }
      },
      events: {
        onDeclare: function(klass){

          console.log('events added')
        }
      }
    },
    create: function(klass){

      processExtensions('onDeclare', klass); 
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
        processExtensions('onConstruct', this); 
      }
    };

    klass.extensions = {};
    klass.pseudos = {};  
    klass.mixins = {};

    klass.mix = function mix(...mixins){
      return class extends (mixins.reduce(mixin, current => {
        let mixed = mixin(current);
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

  function pseudoWrap(pseudo, fn, args){
    return function(){
      var output = pseudo.onInvoke.apply(this, [pseudo, ...args]);
      if (output === null || output === false) return output;
      return fn.apply(this, output instanceof Array ? output : arguments);
    };
  }

  var doubleColon = '::';
  function processExtensions(event, target){
    
    switch (event) {
      case 'onDeclare': {
        var processedProps = {};
        var descriptors = getDescriptors(target);
        for (let z in descriptors) {
          var property;
          var extension;
          var extensionArgs;
          var descriptor = descriptors[z];
          var pseudos = target.pseudos || xtag.pseudos;
          z.replace(regexParseProperty, function(match, prop, dots, name, args){
            property = prop || property;
            if (args) _args = JSON.parse('['+ args +']');
            if (dots == '::') {
              extension = extension || target.extensions[name] || xtag.extensions[name];
              extensionArgs = _args;
            }
            else {
              for (let z in descriptor) {
                if (typeof descriptor[z] == 'function') {
                  descriptor[z] = pseudoWrap(pseudos[name], descriptor[z], _args);
                }
              }
            }
          });

          if (extension) {
            var attachProperty = extension.onDeclare.call(target, property, args, descriptor);
            if (property && attachProperty !== false) {
              let prop = processedProps[property] || (processedProps[property] = {});
              
            }
          }
          else {
            
          }
          if (property && !extension.virtual && !processedProps[property]) processedProps[property] = {};

          match[1]
        }
        Object.getOwnPropertyNames(proto).forEach(key => {


        });

        break;
      }
    
      case 'onConstruct': {
        break;
      }

    }
    for (let z in options) {
      let extension = xtag.extensions[z];
      if (extension && extension[event]) extension[event](options[z], target);
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

// xtag.create(class Clock extends XTagElement() {

//   connectedCallback () {
//     var span = document.createElement('span');
//     span.textContent = 1;
//     this.appendChild(span)
//   }

//   'tap::event:once' (){

//   }

//   sum (a, b){
//     return a + b;
//   }

// });

// xtag.define('x-clock', Clock);

// xtag.create(class DigitalClock extends Clock {

//   connectedCallback () {
//     var span = document.createElement('span');
//     span.textContent = 1;
//     this.appendChild(span)
//   }

//   'tap::event' (){

//   }

//   sum (a, b){
//     return a + b;
//   }

// });

// xtag.define('x-clock2', DigitalClock);


function parseClass(c){
  var fn = c.prototype['foo::bar'];
  delete c.prototype['foo::bar'];
  c.prototype['foo'] = fn;
}

class foo {
  'foo::bar' (){ return 1; }
}

parseClass(foo);

class bar extends foo {
  'foo::bar' (){ return super.foo() + 1; }
}

parseClass(bar);
