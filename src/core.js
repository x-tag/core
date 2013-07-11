(function () {

/*** Variables ***/

  var win = window,
    doc = document,
    noop = function(){},
    regexPseudoSplit = /([\w-]+(?:\([^\)]+\))?)/g,
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
        js: pre == 'ms' ? pre : pre[0].toUpperCase() + pre.substr(1)
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
    if (custom.listener.touched) {
      return custom.listener.touched = false;
    }
    else if (event.type.match('touch')){
     custom.listener.touched = true;
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
      method: attr.boolean && !value ? 'removeAttribute' : 'setAttribute'
    };
  }

  function modAttr(element, attr, name, value){
    var args = getArgs(attr, value);
    element[args.method](name, args.value);
  }

  function syncAttr(element, attr, name, value, method){
    var nodes = attr.property ? [element.xtag[attr.property]] : attr.selector ? xtag.query(element, attr.selector) : [],
        index = nodes.length;
    while (index--) nodes[index][method](name, value);
  }
  
  function updateTemplate(element, name, value){
    if (element.template){
      element.xtag.template.updateBindingValue(element, name, value);
    }
  }

  function attachProperties(tag, prop, z, accessor, attr, name){
    var key = z.split(':'), type = key[0];
    if (type == 'get') {
      key[0] = prop;
      tag.prototype[prop].get = xtag.applyPseudos(key.join(':'), accessor[z], tag.pseudos);
    }
    else if (type == 'set') {
      key[0] = prop; 
      var setter = tag.prototype[prop].set = xtag.applyPseudos(key.join(':'), attr ? function(value){
        this.xtag._skipSet = true;
        if (!this.xtag._skipAttr) modAttr(this, attr, name, value);
        if (this.xtag._skipAttr && attr.skip) delete this.xtag._skipAttr;
        accessor[z].call(this, attr.boolean ? !!value : value);
        updateTemplate(this, name, value);
        delete this.xtag._skipSet;
      } : accessor[z] ? function(value){
        accessor[z].call(this, value);
        updateTemplate(this, name, value);
      } : null, tag.pseudos);
      
      if (attr) attr.setter = setter;
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
        modAttr(this, attr, name, value);
        updateTemplate(this, name, value);
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
      accessors: {
        template: {
          attribute: {},
          set: function(value){
            var last = this.getAttribute('template');
            this.xtag.__previousTemplate__ = last;
            xtag.fireEvent(this, 'templatechange', { template: value });
          }
        }
      },
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
      var element, _name;
      if (typeof name == 'string') {
        _name = name.toLowerCase();
      } else if (name.nodeName == 'ELEMENT') {
        element = name;
        _name = element.getAttribute('name').toLowerCase();
      } else {
        return;
      }

      var tag = xtag.tags[_name] = applyMixins(xtag.merge({}, xtag.defaultOptions, options));

      for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
      for (z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z], tag.pseudos);
      for (z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z], tag.pseudos), enumerable: true };
      for (z in tag.accessors) parseAccessor(tag, z);

      var ready = tag.lifecycle.created || tag.lifecycle.ready;
      tag.prototype.readyCallback = {
        enumerable: true,
        value: function(){
          var element = this;
          var template = element.getAttribute('template');
          if (template){
            xtag.fireEvent(this, 'templatechange', { template: template });
          }
          xtag.addEvents(this, tag.events);
          tag.mixins.forEach(function(mixin){
            if (xtag.mixins[mixin].events) xtag.addEvents(element, xtag.mixins[mixin].events);
          });
          var output = ready ? ready.apply(this, toArray(arguments)) : null;
          for (var name in tag.attributes) {
            var attr = tag.attributes[name],
                hasAttr = this.hasAttribute(name);
            if (attr.setter && (attr.boolean || hasAttr)) {
              attr.setter.call(this, attr.boolean ? hasAttr : this.getAttribute(name));
            }
          }
          tag.pseudos.forEach(function(obj){
            obj.onAdd.call(element, obj);
          });
          return output;
        }
      };

      if (tag.lifecycle.inserted) tag.prototype.insertedCallback = { value: tag.lifecycle.inserted, enumerable: true };
      if (tag.lifecycle.removed) tag.prototype.removedCallback = { value: tag.lifecycle.removed, enumerable: true };
      if (tag.lifecycle.attributeChanged) tag.prototype.attributeChangedCallback = { value: tag.lifecycle.attributeChanged, enumerable: true };

      var setAttribute = tag.prototype.setAttribute || HTMLElement.prototype.setAttribute;
      tag.prototype.setAttribute = {
        writable: true,
        enumberable: true,
        value: function (name, value){
          var attr = tag.attributes[name.toLowerCase()];
          if (!this.xtag._skipAttr) setAttribute.call(this, name, attr && attr.boolean ? '' : value);
          if (attr) {
            if (attr.setter && !this.xtag._skipSet) {
              this.xtag._skipAttr = true;
              attr.setter.call(this, attr.boolean ? true : value);
            }
            value = attr.skip ? attr.boolean ? this.hasAttribute(name) : this.getAttribute(name) : value;
            syncAttr(this, attr, name, attr.boolean ? '' : value, 'setAttribute');
          }
          delete this.xtag._skipAttr;
        }
      };
      
      var removeAttribute = tag.prototype.removeAttribute || HTMLElement.prototype.removeAttribute;
      tag.prototype.removeAttribute = {
        writable: true,
        enumberable: true,
        value: function (name){
          var attr = tag.attributes[name.toLowerCase()];
          if (!this.xtag._skipAttr) removeAttribute.call(this, name);
          if (attr) {
            if (attr.setter && !this.xtag._skipSet) {
              this.xtag._skipAttr = true;
              attr.setter.call(this, attr.boolean ? false : undefined);
            }
            syncAttr(this, attr, name, undefined, 'removeAttribute');
          }
          delete this.xtag._skipAttr;
        }
      };

      if (element){
        element.register({
          'prototype': Object.create(Object.prototype, tag.prototype)
        });
      } else {
        return doc.register(_name, {
          'extends': options['extends'],
          'prototype': Object.create(Object.create((options['extends'] ?
            document.createElement(options['extends']).constructor :
            win.HTMLElement).prototype, tag.prototype), tag.prototype)
        });
      }
    },

    /* Exposed Variables */

    mixins: {},
    prefix: prefix,
    templates: {},
    captureEvents: ['focus', 'blur', 'scroll', 'underflow', 'overflow', 'overflowchanged'],
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

    uid: function(){
      return Math.random().toString(36).substr(2,10);
    },

    /* DOM */

    query: query,

    skipTransition: function(element, fn, bind){
      var prop = prefix.js + 'TransitionProperty';
      element.style[prop] = element.style.transitionProperty = 'none';
      xtag.requestFrame(function(){
        var callback;
        if (fn) callback = fn.call(bind);
        xtag.requestFrame(function(){
          element.style[prop] = element.style.transitionProperty = '';
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
        guid = element.id = id || 'x_' + xtag.uid(),
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
            if (!xtag.pseudos[name]) throw "pseudo not found: " + name + " " + split;
            var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
                pseudo.key = key;
                pseudo.name = name;
                pseudo.value = value;
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

    fireEvent: function(element, type, options, warn){
      var options = options || {},
          event = doc.createEvent('CustomEvent');
      if (warn) console.warn('fireEvent has been modified, more info here: ');
      event.initCustomEvent(type,
        options.bubbles == false ? false : true,
        options.cancelable == false ? false : true,
        options.detail
      );
      try { element.dispatchEvent(event); }
      catch (e) {
        console.warn('This error may have been caused by a change in the fireEvent method, more info here: ', e);
      }
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