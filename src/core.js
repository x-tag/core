(function () {

/*** Internal Variables ***/

  var win = window,
    doc = document,
    keypseudo = {
      listener: function (pseudo, fn, args) {
        if (~pseudo.value.match(/(\d+)/g).indexOf(String(args[0].keyCode)) == (pseudo.name == 'keypass')) {
          args.splice(args.length, 0, this);
          fn.apply(this, args);
        }
      }
    },
    touchFilter = function (pseudo, fn, args) {
      if (fn.touched) fn.touched = false;
      else {
      if (args[0].type.match('touch')) fn.touched = true;
      args.splice(args.length, 0, this);
      fn.apply(this, args);
      }
    },
    createFlowEvent = function (type) {
      var flow = type == 'over';
      return {
        base: 'OverflowEvent' in window ? 'overflowchanged' : type + 'flow',
        condition: function (event) {
          return event.type == (type + 'flow') ||
          ((event.orient === 0 && event.horizontalOverflow == flow) ||
          (event.orient == 1 && event.verticalOverflow == flow) ||
          (event.orient == 2 && event.horizontalOverflow == flow && event.verticalOverflow == flow));
        }
      };
    },
    prefix = (function () {
      var styles = win.getComputedStyle(doc.documentElement, ''),
        pre = (Array.prototype.slice
          .call(styles)
          .join('') 
          .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
        )[1],
        dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
      return {
        dom: dom,
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre[0].toUpperCase() + pre.substr(1)
      };

    })(),
    matchSelector = Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'];
  
/*** Internal Functions ***/

  // Mixins
  
  function mergeOne(source, key, current){
    var type = xtag.typeOf(current);
    if (type == 'object' && xtag.typeOf(source[key]) == 'object') xtag.merge(source[key], current);
    else source[key] = xtag.clone(current, type);
    return source;
  }
  
  function mergeMixin(type, mixin, option) {
    var original = {};
    for (var o in option) original[o.split(':')[0]] = true;
    for (var x in mixin) if (!original[x.split(':')[0]]) option[x] = mixin[x];
  }

  function applyMixins(tag) {
    tag.mixins.forEach(function (name) {
      var mixin = xtag.mixins[name];
      for (var type in mixin) {
        switch (type) {
          case 'lifecycle': case 'methods':
            mergeMixin(type, mixin[type], tag[type]);
            break;
          case 'accessors': case 'prototype':
            for (var z in mixin[type]) mergeMixin(z, mixin[type], tag.accessors);
            break;
          case 'events':
            break;
        }
      }
    });
    return tag;
  }
  
/*** X-Tag Object Definition ***/

  var xtag = {
    defaultOptions: {
      mixins: [],
      events: {},
      methods: {},
      accessors: {},
      lifecycle: {},
      'prototype': {
        xtag: {
          get: function(){
            return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = { data: {} });
          },
          set: function(){
            
          }
        }
      }
    },
    register: function (name, options) {
      var tag = xtag.merge({}, xtag.defaultOptions, options);
      tag = applyMixins(tag);
      for (var z in tag.events) tag.events[z.split(':')[0]] = xtag.parseEvent(z, tag.events[z]);
      for (z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z]);
      for (z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z]) };
      
      for (var prop in tag.accessors) {
        tag.prototype[prop] = {};
        var accessor = tag.accessors[prop];
        for (z in accessor) {
          var key = z.split(':'), type = key[0];
          if (type == 'get' || type == 'set') {
            key[0] = prop;
            tag.prototype[prop][type] = xtag.applyPseudos(key.join(':'), accessor[z]);
          }
          else tag.prototype[prop][z] = accessor[z];
        }
      }

      var created = tag.lifecycle.created;
      tag.lifecycle.created = function () {
        xtag.addEvents(this, tag.events);
        tag.mixins.forEach(function(mixin){
          if (xtag.mixins[mixin].events) xtag.addEvents(this, xtag.mixins[mixin].events);
        },this);
        return created ? created.apply(this, xtag.toArray(arguments)) : null;
      };
      
      var proto = doc.register(name, {
        'prototype': 'nodeName' in tag.prototype ? tag.prototype : Object.create((win.HTMLSpanElement || win.HTMLElement).prototype, tag.prototype),
        'lifecycle':  tag.lifecycle
      });

      return proto;
    },

  /*** Exposed Variables ***/
    mixins: {},
    prefix: prefix,
    captureEvents: ['focus', 'blur'],
    customEvents: {
      overflow: createFlowEvent('over'),
      underflow: createFlowEvent('under'),
      animationstart: {
        base: [
          'animationstart',
          'oAnimationStart',
          'MSAnimationStart',
          'webkitAnimationStart'
        ]
      },
      transitionend: {
        base: [
          'transitionend',
          'oTransitionEnd',
          'MSTransitionEnd',
          'webkitTransitionEnd'
        ]
      },
      tap: {
        base: ['click', 'touchend'],
        listener: touchFilter
      },
      tapstart: {
        base: ['mousedown', 'touchstart'],
        listener: touchFilter
      },
      tapend: {
        base: ['mouseup', 'touchend'],
        listener: touchFilter
      },
      tapenter: {
        base: ['mouseover', 'touchenter'],
        listener: touchFilter
      },
      tapleave: {
        base: ['mouseout', 'touchleave'],
        listener: touchFilter
      },
      tapmove: {
        base: ['mousemove', 'touchmove'],
        listener: touchFilter
      }
    },
    pseudos: {
      keypass: keypseudo,
      keyfail: keypseudo,
      delegate: {
        listener: function (pseudo, fn, args) {
          var target = xtag.query(this, pseudo.value).filter(function (node) {
          return node == args[0].target ||
            node.contains ? node.contains(args[0].target) : false;
          })[0];
          return target ? fn.apply(target, args) : false;
        }
      },
      preventable: {
        listener: function (pseudo, fn, args) {
          if (!args[0].defaultPrevented) fn.apply(this, args);
        }
      },
      attribute: {
        listener: function (pseudo, fn, args) {
          fn.call(this, args[0]);
          this.setAttribute(pseudo.value || pseudo.key.split(':')[0], args[0], true);
        }
      }
    },

  /*** Utilities ***/

    // JS Types
    
    wrap: function (original, fn) {
      return function () {
        var args = xtag.toArray(arguments),
          returned = original.apply(this, args);
        return returned === false ? false : fn.apply(this, typeof returned != 'undefined' ? xtag.toArray(returned) : args);
      };
    },
    
    merge: function(source, k, v){
      if (xtag.typeOf(k) == 'string') return mergeOne(source, k, v);
      for (var i = 1, l = arguments.length; i < l; i++){
        var object = arguments[i];
        for (var key in object) mergeOne(source, key, object[key]);
      }
      return source;
    },

    skipTransition: function(element, fn, bind){
      var duration = prefix.js + 'TransitionDuration';
      element.style[duration] = '0.001s';
      fn.call(bind);
      xtag.addEvent(element, 'transitionend', function(){
        element.style[duration] = '';
      });
    },

    // DOM
    matchSelector: function (element, selector) {
      return matchSelector.call(element, selector);
    },
    
    innerHTML: function (element, html) {
      element.innerHTML = html;
      if (xtag._polyfilled) {
        if (xtag.observerElement._observer) {
          xtag.parseMutations(xtag.observerElement, xtag.observerElement._observer.takeRecords());
        }
        else xtag._inserted(element);
      }
    },

    hasClass: function (element, klass) {
      return element.className.split(' ').indexOf(klass.trim())>-1;
    },

    addClass: function (element, klass) {
      var list = element.className.trim().split(' ');
      klass.trim().split(' ').forEach(function (name) {
        if (!~list.indexOf(name)) list.push(name);
      });
      element.className = list.join(' ').trim();
      return element;
    },

    removeClass: function (element, klass) {
      var classes = klass.trim().split(' ');
      element.className = element.className.trim().split(' ').filter(function (name) {
        return name && !~classes.indexOf(name);
      }).join(' ');
      return element;
    },
    toggleClass: function (element, klass) {
      return xtag[xtag.hasClass(element, klass) ? 'removeClass' : 'addClass'].call(null, element, klass);

    },
    query: function (element, selector) {
      return xtag.toArray(element.querySelectorAll(selector));
    },

    queryChildren: function (element, selector) {
      var id = element.id,
        guid = element.id = id || 'x_' + new Date().getTime(),
        attr = '#' + guid + ' > ';
      selector = attr + (selector + '').replace(',', ',' + attr, 'g');
      var result = element.parentNode.querySelectorAll(selector);
      if (!id) element.id = null;
      return xtag.toArray(result);
    },

    createFragment: function (content) {
      var frag = doc.createDocumentFragment();
      if (content) {
        var div = frag.appendChild(doc.createElement('div')),
          nodes = xtag.toArray(content.nodeName ? arguments : !(div.innerHTML = content) || div.children),
          index = nodes.length;
        while (index--) frag.insertBefore(nodes[index], div);
        frag.removeChild(div);
      }
      return frag;
    },

  /*** Pseudos ***/

    applyPseudos: function (key, fn) {
      var action = fn;
      if (key.match(':')) {
        var split = key.match(/(\w+(?:\([^\)]+\))?)/g);
        for (var i = split.length - 1; i > 0; i--) {
          split[i].replace(/(\w*)(?:\(([^\)]*)\))?/, function (match, name, value) {
            var lastPseudo = action,
              pseudo = xtag.pseudos[name],
              split = {
                key: key,
                name: name,
                value: value
              };
            if (!pseudo) throw "pseudo not found: " + name;
            action = function (e) {
              return pseudo.listener.apply(this, [
                split,
                lastPseudo,
                xtag.toArray(arguments)
              ]);
            };
          });
        }
      }
      return action;
    },

  /*** Events ***/

    parseEvent: function (type, fn) {
      var pseudos = type.split(':'),
        key = pseudos.shift(),
        event = xtag.merge({
          base: key,
          pseudos: '',
          onAdd: function () {},
          onRemove: function () {},
          condition: function () {}
        }, xtag.customEvents[key] || {});
      event.type = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
      if (fn) {
        var chained = xtag.applyPseudos(event.type, fn);
        event.compiled = function () {
          var args = xtag.toArray(arguments);
          if (event.condition.apply(this, args) === false) return false;
          return chained.apply(this, args);
        };
      }
      return event;
    },

    addEvent: function (element, type, fn) {
      var event = typeof fn == 'function' ? xtag.parseEvent(type, fn) : fn;
      event.onAdd.call(element, event, event.compiled);
      xtag.toArray(event.base).forEach(function (name) {
        element.addEventListener(name, event.compiled, xtag.captureEvents.indexOf(name) > -1);
      });
      return event.compiled;
    },

    addEvents: function (element, events) {
      for (var z in events) xtag.addEvent(element, z, events[z]);
    },

    removeEvent: function (element, type, fn) {
      var event = xtag.parseEvent(type);
      event.onRemove.call(element, event, fn);
      xtag.removePseudos(element, event.type, fn);
      xtag.toArray(event.base).forEach(function (name) {
        element.removeEventListener(name, fn);
      });
    }
  };
  
  xtag.typeOf = doc.register.__polyfill__.typeOf;
  xtag.clone = doc.register.__polyfill__.clone;
  xtag.merge(xtag, doc.register.__polyfill__);

  if (typeof define == 'function' && define.amd) define(xtag);
  else win.xtag = xtag;

})();
