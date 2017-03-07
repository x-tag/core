

(function(){

  // var root = document.documentElement;
  // var matches = function(node, selector) {
  //   return this.call(node, selector);
  // }.bind(root.matches || root.webkitMatchesSelector || root.mozMatchesSelector || root.msMatchesSelector || root.oMatchesSelector);

  // NodeList.prototype.forEach = NodeList.prototype.forEach || Array.prototype.forEach;

  // function delegateAction(pseudo, event) {
  //   var match,
  //       target = event.target,
  //       root = event.currentTarget;
  //   while (!match && target && target != root) {
  //     if (target.tagName && matches(target, pseudo.value)) match = target;
  //     target = target.parentNode;
  //   }
  //   if (!match && root.tagName && matches(root, pseudo.value)) match = root;
  //   return match ? pseudo.listener = pseudo.listener.bind(match) : null;
  //}

  var regexReplaceCommas = /,/g;
  var regexCamelToDash = /([a-z])([A-Z])/g;
  var regexPseudoParens = /\(|\)/g;
  var regexPseudoCapture = /:(\w+)\u276A(.+?(?=\u276B))|:(\w+)/g;
  var regexDigits = /(\d+)/g;

  xtag = {
    pseudos: {
      // delegate: {
      //   action: delegateAction
      // },
      preventable: {
        action: function (pseudo, event) {
          return !event.defaultPrevented;
        }
      },
      duration: {
        onAdd: function(pseudo){
          pseudo.source.duration = Number(pseudo.value);
        }
      },
      capture: {
        onCompile: function(fn, pseudo){
          if (pseudo.source) pseudo.source.capture = true;
        }
      }
    },
    customEvents: {

    },
    mixins: {},
    extensions: {
      reactions: {

      },
      methods: {
        onDeclare: function(base, methods){
          console.log(methods)
        }
      },
      accessors: {

      },
      events: {
        onConnect: function(){
          console.log('event added')
        }
      },
      pseudos: {

      },
      mixins: {

      }
    },
    define: function (name, def) {
      // customElements.define(name, def);
    },
    applyPseudos: function(key, fn, target, source) {
      var listener = fn,
          pseudos = {};
      if (key.match(':')) {
        var matches = [],
            valueFlag = 0;
        key.replace(regexPseudoParens, function(match){
          if (match == '(') return ++valueFlag == 1 ? '\u276A' : '(';
          return !--valueFlag ? '\u276B' : ')';
        }).replace(regexPseudoCapture, function(z, name, value, solo){
          matches.push([name || solo, value]);
        });
        var i = matches.length;
        while (i--) parsePseudo(function(){
          var name = matches[i][0],
              value = matches[i][1];
          if (!xtag.pseudos[name]) throw "pseudo not found: " + name + " " + value;
          value = (value === '' || typeof value == 'undefined') ? null : value;
          var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
          pseudo.key = key;
          pseudo.name = name;
          pseudo.value = value;
          pseudo['arguments'] = (value || '').split(',');
          pseudo.action = pseudo.action || trueop;
          pseudo.source = source;
          pseudo.onAdd = pseudo.onAdd || noop;
          pseudo.onRemove = pseudo.onRemove || noop;
          var original = pseudo.listener = listener;
          listener = function(){
            var output = pseudo.action.apply(this, [pseudo].concat(toArray(arguments)));
            if (output === null || output === false) return output;
            output = pseudo.listener.apply(this, arguments);
            pseudo.listener = original;
            return output;
          };
          if (!target) pseudo.onAdd.call(fn, pseudo);
          else target.push(pseudo);
        });
      }
      for (var z in pseudos) {
        if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]) || listener;
      }
      return listener;
    },
    removePseudos: function(target, pseudos){
      pseudos.forEach(function(obj){
        obj.onRemove.call(target, obj);
      });
    },
    fireEvent: function(node, name, obj = {}){
      node.dispatchEvent(new CustomEvent(name, obj));
    }
  }

  function createClass(name){

    var base = class extends (name ? Object.getPrototypeOf(document.createElement(name)).constructor : HTMLElement) {
      constructor () {
        super();
      }
      connectedCallback (){
        processExtensions(base.definition, this, 'onConnect'); 
      }
    });

    base.definition = {};

    base.with = function(def){ 
      base = def.native && base == XTagElement ? createClass(def.native) : createClass();
      base.definition = def;
      processExtensions(def, base, 'onDeclare');
      return base;
    };

    return base;

  };

  function processExtensions(def, obj, event){
    for (let z in def) {
      let extension = xtag.extensions[z];
      if (extension && extension[event]) extension[event](obj, def[z]);
    }
  }

  XTagElement = createClass();

})();

class Clock extends XTagElement.with({

  native: 'video',

  reactions: {
    constructed: function() {
      this.super();
    },
    connected: function() {
      
    }
  },

  events: {
    'tap:once': function(){

    }
  },

  methods: {
    start: function(){
      if (this.disabled) return;
      this.update();
      this.data.interval = setInterval(this.update.bind(this), 1000);
    },
    stop: function(){
      this.data.interval = clearInterval(this.data.interval);
    },
    update: function(){
      this.textContent = new Date().toLocaleTimeString();
    }
  }

}){};

//xtag.define('x-clock', Clock);