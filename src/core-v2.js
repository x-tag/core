

(function(){

  function delegateAction(pseudo, event) {
    var match,
        target = event.target,
        root = event.currentTarget;
    while (!match && target && target != root) {
      if (target.tagName && matchSelector.call(target, pseudo.value)) match = target;
      target = target.parentNode;
    }
    if (!match && root.tagName && matchSelector.call(root, pseudo.value)) match = root;
    return match ? pseudo.listener = pseudo.listener.bind(match) : null;
  }

  xtag = {
    pseudos: {
      delegate: {
        action: delegateAction
      },
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
      native: {
        onImplement: function(){}
      },
      reactions: {

      },
      methods: {

      },
      accessors: {

      },
      events: {

      },
      pseudos: {

      },
      mixins: {

      }
    },
    define: function (name, def) {
      //customElements.define(name, def);
    }
  }

  var protos = {}

  function createClass(name){

    var _name = name || 'HTMLElement';
    var base = protos[_name] || (protos[_name] = class extends (name ? Object.getPrototypeOf(document.createElement(name)) : HTMLElement) {
      constructor () {
        super();
        //construct(this);
      }
    });

    base.implements = function(obj){
      for (let z in obj) {
        let extension = xtag.extensions[z].onImplement;
        if (extension) extension(base, obj[z]);
      }
      return base;
    }

    return base;

  };

  XTagElement = createClass();

})();

// Test



class Clock extends XTagElement.implements({

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

xtag.define('x-clock', Clock);