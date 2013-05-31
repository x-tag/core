(function () {

/*** Variables ***/

  var win = window,
    doc = document,
    noop = function(){},
    regexPseudoSplit = /(\w+(?:\([^\)]+\))?)/g,
    regexPseudoReplace = /(\w*)(?:\(([^\)]*)\))?/,
    regexDigits = /(\d+)/g,
    keypseudo = {
      action: function (pseudo, event) {
        return pseudo.value.match(regexDigits).indexOf(String(event.keyCode)) > -1 == (pseudo.name == 'keypass');
      }
    },
    prefix = (function () {
      var styles = win.getComputedStyle(doc.documentElement, ''),
          pre = (Array.prototype.slice
            .call(styles)
            .join('')
            .match(/-(moz|webkit|ms)-/) || (styles.OLink === '' && ['', 'o'])
          )[1];
      return {
        dom: pre == 'ms' ? pre.toUpperCase() : pre,
        lowercase: pre,
        css: '-' + pre + '-',
        js: pre[0].toUpperCase() + pre.substr(1)
      };

    })(),
    matchSelector = Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'];

/*** Functions ***/

// Utilities

  var typeObj = {};
  function typeOf(obj) {
    return typeObj.toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
  }

  function clone(item, type){
    var fn = clone[type || typeOf(item)];
    return fn ? fn(item) : item;
  }
    clone.object = function(src){
      var obj = {};
      for (var key in src) obj[key] = clone(src[key]);
      return obj;
    };
    clone.array = function(src){
      var i = src.length, array = new Array(i);
      while (i--) array[i] = clone(src[i]);
      return array;
    };

  var unsliceable = ['number', 'boolean', 'string', 'function'];
  function toArray(obj){
    return unsliceable.indexOf(typeOf(obj)) == -1 ?
    Array.prototype.slice.call(obj, 0) :
    [obj];
  }

// DOM
  var str = '';
  function query(element, selector){
    return (selector || str).length ? toArray(element.querySelectorAll(selector)) : [];
  }

  function parseMutations(element, mutations) {
    var diff = { added: [], removed: [] };
    mutations.forEach(function(record){
      record._mutation = true;
      for (var z in diff) {
        var type = element._records[(z == 'added') ? 'inserted' : 'removed'],
          nodes = record[z + 'Nodes'], length = nodes.length;
        for (var i = 0; i < length && diff[z].indexOf(nodes[i]) == -1; i++){
          diff[z].push(nodes[i]);
          type.forEach(function(fn){
            fn(nodes[i], record);
          });
        }
      }
    });
  }

// Mixins

  function mergeOne(source, key, current){
    var type = typeOf(current);
    if (type == 'object' && typeOf(source[key]) == 'object') xtag.merge(source[key], current);
    else source[key] = clone(current, type);
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

// Events

  function touchFilter(custom, event) {
    if (custom.listener.touched) return custom.listener.touched = false;
    else {
      if (event.type.match('touch')) custom.listener.touched = true;
    }
  }

  function createFlowEvent(type) {
    var flow = type == 'over';
    return {
      base: 'OverflowEvent' in win ? 'overflowchanged' : type + 'flow',
      condition: function (custom, event) {
        event.flow = type;
        return event.type == (type + 'flow') ||
        ((event.orient === 0 && event.horizontalOverflow == flow) ||
        (event.orient == 1 && event.verticalOverflow == flow) ||
        (event.orient == 2 && event.horizontalOverflow == flow && event.verticalOverflow == flow));
      }
    };
  }

// Accessors

  function getArgs(attr, value){
    return {
      value: attr.boolean ? '' : value,
      method: attr.boolean && (value === false || value === null) ? 'removeAttribute' : 'setAttribute'
    };
  }

  function setAttr(attr, name, value, skip){
    var args = getArgs(attr, value);
    this[args.method](name, args.value, skip);
  }

  function syncAttr(attr, name, value){
    var args = getArgs(attr, value),
        nodes = attr.property ? [this.xtag[attr.property]] : attr.selector ? xtag.query(this, attr.selector) : [],
        index = nodes.length;
    while (index--) nodes[index][args.method](name, args.value);
  }

  function wrapAttr(con, tag, method){
    var original = con.prototype[method];
    con.prototype[method] = function (name, value, skip){
      var attr = tag.attributes[name.toLowerCase()];
      original.call(this, name, attr && attr.boolean ? '' : value);
      if (attr) {
        syncAttr.call(this, attr, name, value);
        if (!skip && !attr.skip) {
          attr.setter.call(this, attr.boolean ? method == 'setAttribute' : this.getAttribute(name));
        }
      }
    };
  }

  function attachProperties(tag, prop, z, accessor, attr, name){
    var key = z.split(':'), type = key[0];
    if (type == 'get') {
      key[0] = prop;
      tag.prototype[prop].get = xtag.applyPseudos(key.join(':'), accessor[z], tag.pseudos);
    }
    else if (type == 'set') {
      key[0] = prop;
      if (attr) attr.setter = accessor[z];
      tag.prototype[prop].set = xtag.applyPseudos(key.join(':'), attr ? function(value, skip){
        if (!skip && !attr.skip) setAttr.call(this, attr, name, value, true);
        syncAttr.call(this, attr, name, value);
        accessor[z].call(this, value);
      } : accessor[z], tag.pseudos);
    }
    else tag.prototype[prop][z] = accessor[z];
  }

  function parseAccessor(tag, prop){
    tag.prototype[prop] = {};
    var accessor = tag.accessors[prop],
        attr = accessor.attribute,
        name = attr && attr.name ? attr.name.toLowerCase() : prop;

    if (attr) tag.attributes[name] = attr;
    for (var z in accessor) attachProperties(tag, prop, z, accessor, attr, name);

    if (attr) {
      if (!tag.prototype[prop].get) {
        var method = (attr.boolean ? 'has' : 'get') + 'Attribute';
        tag.prototype[prop].get = function(){
          return this[method](name);
        };
      }
      if (!tag.prototype[prop].set) tag.prototype[prop].set = function(value){
        setAttr.call(this, attr, name, value, true);
      };
    }
  }

/*** X-Tag Object Definition ***/

  var xtag = {
    tags: {},
    defaultOptions: {
      pseudos: [],
      mixins: [],
      events: {},
      methods: {},
      accessors: {},
      lifecycle: {},
      attributes: {},
      'prototype': {
        xtag: {
          get: function(){
            return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = { data: {} });
          }
        }
      }
    },
    register: function (name, options) {
      var _name = name.toLowerCase();
      var tag = xtag.tags[_name] = applyMixins(xtag.merge({}, xtag.defaultOptions, options));

      for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
      for (z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z], tag.pseudos);
      for (z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z], tag.pseudos) };
      for (z in tag.accessors) parseAccessor(tag, z);

      var ready = tag.lifecycle.created || tag.lifecycle.ready;
      tag.prototype.readyCallback = {
        value: function(){
          var element = this;
          xtag.addEvents(this, tag.events);
          tag.mixins.forEach(function(mixin){
            if (xtag.mixins[mixin].events) xtag.addEvents(element, xtag.mixins[mixin].events);
          });
          var output = ready ? ready.apply(this, toArray(arguments)) : null;
          for (var name in tag.attributes) {
            var attr = tag.attributes[name],
                hasAttr = this.hasAttribute(name),
                value = attr.boolean ? hasAttr : this.getAttribute(name);
            if (attr.boolean || hasAttr) {
              syncAttr.call(this, attr, name, value);
              if (attr.setter) attr.setter.call(this, value, true);
            }
          }
          tag.pseudos.forEach(function(obj){
            obj.onAdd.call(element, obj);
          });
          return output;
        }
      };

      if (tag.lifecycle.inserted) tag.prototype.insertedCallback = { value: tag.lifecycle.inserted };
      if (tag.lifecycle.removed) tag.prototype.removedCallback = { value: tag.lifecycle.removed };
      if (tag.lifecycle.attributeChanged) tag.prototype.attributeChangedCallback = { value: tag.lifecycle.attributeChanged };

      var constructor = doc.register(_name, {
        'extends': options['extends'],
        'prototype': Object.create((options['extends'] ? document.createElement(options['extends']).constructor : win.HTMLElement).prototype, tag.prototype)
      });

      wrapAttr(constructor, tag, 'setAttribute');
      wrapAttr(constructor, tag, 'removeAttribute');

      return constructor;
    },

    /* Exposed Variables */

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
        condition: touchFilter
      },
      tapstart: {
        base: ['mousedown', 'touchstart'],
        condition: touchFilter
      },
      tapend: {
        base: ['mouseup', 'touchend'],
        condition: touchFilter
      },
      tapenter: {
        base: ['mouseover', 'touchenter'],
        condition: touchFilter
      },
      tapleave: {
        base: ['mouseout', 'touchleave'],
        condition: touchFilter
      },
      tapmove: {
        base: ['mousemove', 'touchmove'],
        condition: touchFilter
      }
    },
    pseudos: {
      keypass: keypseudo,
      keyfail: keypseudo,
      delegate: {
        action: function (pseudo, event) {
          var target = query(this, pseudo.value).filter(function (node) {
            return node == event.target || node.contains ? node.contains(event.target) : false;
          })[0];
          return target ? pseudo.listener = pseudo.listener.bind(target) : false;
        }
      },
      preventable: {
        action: function (pseudo, event) {
          return !event.defaultPrevented;
        }
      }
    },

    /* UTILITIES */

    clone: clone,
    typeOf: typeOf,
    toArray: toArray,

    wrap: function (original, fn) {
      return function(){
        var args = toArray(arguments),
          returned = original.apply(this, args);
        return returned === false ? false : fn.apply(this, typeof returned != 'undefined' ? toArray(returned) : args);
      };
    },

    merge: function(source, k, v){
      if (typeOf(k) == 'string') return mergeOne(source, k, v);
      for (var i = 1, l = arguments.length; i < l; i++){
        var object = arguments[i];
        for (var key in object) mergeOne(source, key, object[key]);
      }
      return source;
    },

    /* DOM */

    query: query,

    skipTransition: function(element, fn, bind){
      var duration = prefix.js + 'TransitionDuration';
      element.style[duration] = '0.001s';
      element.style.transitionDuration = '0.001s';
      xtag.requestFrame(function(){
        var callback;
        if (fn) callback = fn.call(bind);
        xtag.requestFrame(function(){
          element.style[duration] = '';
          element.style.transitionDuration = '';
          if (callback) xtag.requestFrame(callback);
        });
      });
    },

    requestFrame: (function(){
      var raf = win.requestAnimationFrame ||
        win[prefix.lowercase + 'RequestAnimationFrame'] ||
        function(fn){ return win.setTimeout(fn, 20); };
      return function(fn){
        return raf.call(win, fn);
      };
    })(),

    matchSelector: function (element, selector) {
      return matchSelector.call(element, selector);
    },

    set: function (element, method, value) {
      element[method] = value;
      if (window.CustomElements) CustomElements.upgradeAll(element);
    },

    innerHTML: function(el, html){
      xtag.set(el, 'innerHTML', html);
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

    queryChildren: function (element, selector) {
      var id = element.id,
        guid = element.id = id || 'x_' + new Date().getTime(),
        attr = '#' + guid + ' > ';
      selector = attr + (selector + '').replace(',', ',' + attr, 'g');
      var result = element.parentNode.querySelectorAll(selector);
      if (!id) element.removeAttribute('id');
      return toArray(result);
    },

    createFragment: function(content) {
      var frag = doc.createDocumentFragment();
      if (content) {
        var div = frag.appendChild(doc.createElement('div')),
          nodes = toArray(content.nodeName ? arguments : !(div.innerHTML = content) || div.children),
          length = nodes.length,
          index = 0;
        while (index < length) frag.insertBefore(nodes[index++], div);
        frag.removeChild(div);
      }
      return frag;
    },

    manipulate: function(element, fn){
      var next = element.nextSibling,
        parent = element.parentNode,
        frag = doc.createDocumentFragment(),
        returned = fn.call(frag.appendChild(element), frag) || element;
      if (next) parent.insertBefore(returned, next);
      else parent.appendChild(returned);
    },

    /* PSEUDOS */

    applyPseudos: function(key, fn, element) {
      var listener = fn,
          pseudos = {};
      if (key.match(':')) {
        var split = key.match(regexPseudoSplit),
            i = split.length;
        while (--i) {
          split[i].replace(regexPseudoReplace, function (match, name, value) {
            var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
                pseudo.key = key;
                pseudo.name = name;
                pseudo.value = value;
            if (!pseudo) throw "pseudo not found: " + name;
            var last = listener;
            listener = function(){
              var args = toArray(arguments),
                  obj = {
                    key: key,
                    name: name,
                    value: value,
                    listener: last
                  };
              if (pseudo.action && pseudo.action.apply(this, [obj].concat(args)) === false) return false;
              return obj.listener.apply(this, args);
            };
            if (element && pseudo.onAdd) {
              if (element.getAttribute) {
                pseudo.onAdd.call(element, pseudo);
              } else {
                element.push(pseudo);
              }
            }
          });
        }
      }
      for (var z in pseudos) {
        if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]);
      }
      return listener;
    },

    removePseudos: function(element, event){
      event._pseudos.forEach(function(obj){
        obj.onRemove.call(element, obj);
      });
    },

  /*** Events ***/

    parseEvent: function(type, fn) {
      var pseudos = type.split(':'),
        key = pseudos.shift(),
        event = xtag.merge({
          base: key,
          pseudos: '',
          _pseudos: [],
          onAdd: noop,
          onRemove: noop,
          condition: noop
        }, xtag.customEvents[key] || {});
      event.type = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
      if (fn) {
        var chained = xtag.applyPseudos(event.type, fn, event._pseudos);
        event.listener = function(){
          var args = toArray(arguments);
          if (event.condition.apply(this, [event].concat(args)) === false) return false;
          return chained.apply(this, args);
        };
      }
      return event;
    },

    addEvent: function (element, type, fn) {
      var event = (typeof fn == 'function') ? xtag.parseEvent(type, fn) : fn;
      event.listener.event = event;
      event._pseudos.forEach(function(obj){
        obj.onAdd.call(element, obj);
      });
      event.onAdd.call(element, event, event.listener);
      toArray(event.base).forEach(function (name) {
        element.addEventListener(name, event.listener, xtag.captureEvents.indexOf(name) > -1);
      });
      return event.listener;
    },

    addEvents: function (element, events) {
      var listeners = {};
      for (var z in events) {
        listeners[z] = xtag.addEvent(element, z, events[z]);
      }
      return listeners;
    },

    removeEvent: function (element, type, fn) {
      var event = fn.event;
      event.onRemove.call(element, event, fn);
      xtag.removePseudos(element, event);
      toArray(event.base).forEach(function (name) {
        element.removeEventListener(name, fn);
      });
    },

    removeEvents: function(element, listeners){
      for (var z in listeners) xtag.removeEvent(element, z, listeners[z]);
    },

    fireEvent: function(element, type, data, options){
      options = options || {};
      var event = doc.createEvent('Event');
      event.initEvent(type, 'bubbles' in options ? options.bubbles : true, 'cancelable' in options ? options.cancelable : true);
      for (var z in data) event[z] = data[z];
      element.dispatchEvent(event);
    },

    addObserver: function(element, type, fn){
      if (!element._records) {
        element._records = { inserted: [], removed: [] };
        if (mutation){
          element._observer = new mutation(function(mutations) {
            parseMutations(element, mutations);
          });
          element._observer.observe(element, {
            subtree: true,
            childList: true,
            attributes: !true,
            characterData: false
          });
        }
        else ['Inserted', 'Removed'].forEach(function(type){
          element.addEventListener('DOMNode' + type, function(event){
            event._mutation = true;
            element._records[type.toLowerCase()].forEach(function(fn){
              fn(event.target, event);
            });
          }, false);
        });
      }
      if (element._records[type].indexOf(fn) == -1) element._records[type].push(fn);
    },

    removeObserver: function(element, type, fn){
      var obj = element._records;
      if (obj && fn){
        obj[type].splice(obj[type].indexOf(fn), 1);
      }
      else{
        obj[type] = [];
      }
    }

  };

  if (typeof define == 'function' && define.amd) define(xtag);
  else win.xtag = xtag;

  doc.addEventListener('WebComponentsReady', function(){
    xtag.fireEvent(doc.body, 'DOMComponentsLoaded');
  });

})();