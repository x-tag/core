// We don't use the platform bootstrapper, so fake this stuff.

window.Platform = {};
var logFlags = {};



// DOMTokenList polyfill fir IE9
(function () {

if (typeof window.Element === "undefined" || "classList" in document.documentElement) return;

var prototype = Array.prototype,
    indexOf = prototype.indexOf,
    slice = prototype.slice,
    push = prototype.push,
    splice = prototype.splice,
    join = prototype.join;

function DOMTokenList(el) {
  this._element = el;
  if (el.className != this._classCache) {
    this._classCache = el.className;

    if (!this._classCache) return;

      // The className needs to be trimmed and split on whitespace
      // to retrieve a list of classes.
      var classes = this._classCache.replace(/^\s+|\s+$/g,'').split(/\s+/),
        i;
    for (i = 0; i < classes.length; i++) {
      push.call(this, classes[i]);
    }
  }
};

function setToClassName(el, classes) {
  el.className = classes.join(' ');
}

DOMTokenList.prototype = {
  add: function(token) {
    if(this.contains(token)) return;
    push.call(this, token);
    setToClassName(this._element, slice.call(this, 0));
  },
  contains: function(token) {
    return indexOf.call(this, token) !== -1;
  },
  item: function(index) {
    return this[index] || null;
  },
  remove: function(token) {
    var i = indexOf.call(this, token);
     if (i === -1) {
       return;
     }
    splice.call(this, i, 1);
    setToClassName(this._element, slice.call(this, 0));
  },
  toString: function() {
    return join.call(this, ' ');
  },
  toggle: function(token) {
    if (indexOf.call(this, token) === -1) {
      this.add(token);
    } else {
      this.remove(token);
    }
  }
};

window.DOMTokenList = DOMTokenList;

function defineElementGetter (obj, prop, getter) {
  if (Object.defineProperty) {
    Object.defineProperty(obj, prop,{
      get : getter
    })
  } else {
    obj.__defineGetter__(prop, getter);
  }
}

defineElementGetter(Element.prototype, 'classList', function () {
  return new DOMTokenList(this);
});

})();


/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

// SideTable is a weak map where possible. If WeakMap is not available the
// association is stored as an expando property.
var SideTable;
// TODO(arv): WeakMap does not allow for Node etc to be keys in Firefox
if (typeof WeakMap !== 'undefined' && navigator.userAgent.indexOf('Firefox/') < 0) {
  SideTable = WeakMap;
} else {
  (function() {
    var defineProperty = Object.defineProperty;
    var hasOwnProperty = Object.hasOwnProperty;
    var counter = new Date().getTime() % 1e9;

    SideTable = function() {
      this.name = '__st' + (Math.random() * 1e9 >>> 0) + (counter++ + '__');
    };

    SideTable.prototype = {
      set: function(key, value) {
        defineProperty(key, this.name, {value: value, writable: true});
      },
      get: function(key) {
        return hasOwnProperty.call(key, this.name) ? key[this.name] : undefined;
      },
      delete: function(key) {
        this.set(key, undefined);
      }
    }
  })();
}

/*
 * Copyright 2012 The Polymer Authors. All rights reserved.
 * Use of this source code is goverened by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(global) {

  var registrationsTable = new SideTable();

  // We use setImmediate or postMessage for our future callback.
  var setImmediate = window.msSetImmediate;

  // Use post message to emulate setImmediate.
  if (!setImmediate) {
    var setImmediateQueue = [];
    var sentinel = String(Math.random());
    window.addEventListener('message', function(e) {
      if (e.data === sentinel) {
        var queue = setImmediateQueue;
        setImmediateQueue = [];
        queue.forEach(function(func) {
          func();
        });
      }
    });
    setImmediate = function(func) {
      setImmediateQueue.push(func);
      window.postMessage(sentinel, '*');
    };
  }

  // This is used to ensure that we never schedule 2 callas to setImmediate
  var isScheduled = false;

  // Keep track of observers that needs to be notified next time.
  var scheduledObservers = [];

  /**
   * Schedules |dispatchCallback| to be called in the future.
   * @param {MutationObserver} observer
   */
  function scheduleCallback(observer) {
    scheduledObservers.push(observer);
    if (!isScheduled) {
      isScheduled = true;
      setImmediate(dispatchCallbacks);
    }
  }

  function wrapIfNeeded(node) {
    return window.ShadowDOMPolyfill &&
        window.ShadowDOMPolyfill.wrapIfNeeded(node) ||
        node;
  }

  function dispatchCallbacks() {
    // http://dom.spec.whatwg.org/#mutation-observers

    isScheduled = false; // Used to allow a new setImmediate call above.

    var observers = scheduledObservers;
    scheduledObservers = [];
    // Sort observers based on their creation UID (incremental).
    observers.sort(function(o1, o2) {
      return o1.uid_ - o2.uid_;
    });

    var anyNonEmpty = false;
    observers.forEach(function(observer) {

      // 2.1, 2.2
      var queue = observer.takeRecords();
      // 2.3. Remove all transient registered observers whose observer is mo.
      removeTransientObserversFor(observer);

      // 2.4
      if (queue.length) {
        observer.callback_(queue, observer);
        anyNonEmpty = true;
      }
    });

    // 3.
    if (anyNonEmpty)
      dispatchCallbacks();
  }

  function removeTransientObserversFor(observer) {
    observer.nodes_.forEach(function(node) {
      var registrations = registrationsTable.get(node);
      if (!registrations)
        return;
      registrations.forEach(function(registration) {
        if (registration.observer === observer)
          registration.removeTransientObservers();
      });
    });
  }

  /**
   * This function is used for the "For each registered observer observer (with
   * observer's options as options) in target's list of registered observers,
   * run these substeps:" and the "For each ancestor ancestor of target, and for
   * each registered observer observer (with options options) in ancestor's list
   * of registered observers, run these substeps:" part of the algorithms. The
   * |options.subtree| is checked to ensure that the callback is called
   * correctly.
   *
   * @param {Node} target
   * @param {function(MutationObserverInit):MutationRecord} callback
   */
  function forEachAncestorAndObserverEnqueueRecord(target, callback) {
    for (var node = target; node; node = node.parentNode) {
      var registrations = registrationsTable.get(node);

      if (registrations) {
        for (var j = 0; j < registrations.length; j++) {
          var registration = registrations[j];
          var options = registration.options;

          // Only target ignores subtree.
          if (node !== target && !options.subtree)
            continue;

          var record = callback(options);
          if (record)
            registration.enqueue(record);
        }
      }
    }
  }

  var uidCounter = 0;

  /**
   * The class that maps to the DOM MutationObserver interface.
   * @param {Function} callback.
   * @constructor
   */
  function JsMutationObserver(callback) {
    this.callback_ = callback;
    this.nodes_ = [];
    this.records_ = [];
    this.uid_ = ++uidCounter;
  }

  JsMutationObserver.prototype = {
    observe: function(target, options) {
      target = wrapIfNeeded(target);

      // 1.1
      if (!options.childList && !options.attributes && !options.characterData ||

          // 1.2
          options.attributeOldValue && !options.attributes ||

          // 1.3
          options.attributeFilter && options.attributeFilter.length &&
              !options.attributes ||

          // 1.4
          options.characterDataOldValue && !options.characterData) {

        throw new SyntaxError();
      }

      var registrations = registrationsTable.get(target);
      if (!registrations)
        registrationsTable.set(target, registrations = []);

      // 2
      // If target's list of registered observers already includes a registered
      // observer associated with the context object, replace that registered
      // observer's options with options.
      var registration;
      for (var i = 0; i < registrations.length; i++) {
        if (registrations[i].observer === this) {
          registration = registrations[i];
          registration.removeListeners();
          registration.options = options;
          break;
        }
      }

      // 3.
      // Otherwise, add a new registered observer to target's list of registered
      // observers with the context object as the observer and options as the
      // options, and add target to context object's list of nodes on which it
      // is registered.
      if (!registration) {
        registration = new Registration(this, target, options);
        registrations.push(registration);
        this.nodes_.push(target);
      }

      registration.addListeners();
    },

    disconnect: function() {
      this.nodes_.forEach(function(node) {
        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          var registration = registrations[i];
          if (registration.observer === this) {
            registration.removeListeners();
            registrations.splice(i, 1);
            // Each node can only have one registered observer associated with
            // this observer.
            break;
          }
        }
      }, this);
      this.records_ = [];
    },

    takeRecords: function() {
      var copyOfRecords = this.records_;
      this.records_ = [];
      return copyOfRecords;
    }
  };

  /**
   * @param {string} type
   * @param {Node} target
   * @constructor
   */
  function MutationRecord(type, target) {
    this.type = type;
    this.target = target;
    this.addedNodes = [];
    this.removedNodes = [];
    this.previousSibling = null;
    this.nextSibling = null;
    this.attributeName = null;
    this.attributeNamespace = null;
    this.oldValue = null;
  }

  function copyMutationRecord(original) {
    var record = new MutationRecord(original.type, original.target);
    record.addedNodes = original.addedNodes.slice();
    record.removedNodes = original.removedNodes.slice();
    record.previousSibling = original.previousSibling;
    record.nextSibling = original.nextSibling;
    record.attributeName = original.attributeName;
    record.attributeNamespace = original.attributeNamespace;
    record.oldValue = original.oldValue;
    return record;
  };

  // We keep track of the two (possibly one) records used in a single mutation.
  var currentRecord, recordWithOldValue;

  /**
   * Creates a record without |oldValue| and caches it as |currentRecord| for
   * later use.
   * @param {string} oldValue
   * @return {MutationRecord}
   */
  function getRecord(type, target) {
    return currentRecord = new MutationRecord(type, target);
  }

  /**
   * Gets or creates a record with |oldValue| based in the |currentRecord|
   * @param {string} oldValue
   * @return {MutationRecord}
   */
  function getRecordWithOldValue(oldValue) {
    if (recordWithOldValue)
      return recordWithOldValue;
    recordWithOldValue = copyMutationRecord(currentRecord);
    recordWithOldValue.oldValue = oldValue;
    return recordWithOldValue;
  }

  function clearRecords() {
    currentRecord = recordWithOldValue = undefined;
  }

  /**
   * @param {MutationRecord} record
   * @return {boolean} Whether the record represents a record from the current
   * mutation event.
   */
  function recordRepresentsCurrentMutation(record) {
    return record === recordWithOldValue || record === currentRecord;
  }

  /**
   * Selects which record, if any, to replace the last record in the queue.
   * This returns |null| if no record should be replaced.
   *
   * @param {MutationRecord} lastRecord
   * @param {MutationRecord} newRecord
   * @param {MutationRecord}
   */
  function selectRecord(lastRecord, newRecord) {
    if (lastRecord === newRecord)
      return lastRecord;

    // Check if the the record we are adding represents the same record. If
    // so, we keep the one with the oldValue in it.
    if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord))
      return recordWithOldValue;

    return null;
  }

  /**
   * Class used to represent a registered observer.
   * @param {MutationObserver} observer
   * @param {Node} target
   * @param {MutationObserverInit} options
   * @constructor
   */
  function Registration(observer, target, options) {
    this.observer = observer;
    this.target = target;
    this.options = options;
    this.transientObservedNodes = [];
  }

  Registration.prototype = {
    enqueue: function(record) {
      var records = this.observer.records_;
      var length = records.length;

      // There are cases where we replace the last record with the new record.
      // For example if the record represents the same mutation we need to use
      // the one with the oldValue. If we get same record (this can happen as we
      // walk up the tree) we ignore the new record.
      if (records.length > 0) {
        var lastRecord = records[length - 1];
        var recordToReplaceLast = selectRecord(lastRecord, record);
        if (recordToReplaceLast) {
          records[length - 1] = recordToReplaceLast;
          return;
        }
      } else {
        scheduleCallback(this.observer);
      }

      records[length] = record;
    },

    addListeners: function() {
      this.addListeners_(this.target);
    },

    addListeners_: function(node) {
      var options = this.options;
      if (options.attributes)
        node.addEventListener('DOMAttrModified', this, true);

      if (options.characterData)
        node.addEventListener('DOMCharacterDataModified', this, true);

      if (options.childList)
        node.addEventListener('DOMNodeInserted', this, true);

      if (options.childList || options.subtree)
        node.addEventListener('DOMNodeRemoved', this, true);
    },

    removeListeners: function() {
      this.removeListeners_(this.target);
    },

    removeListeners_: function(node) {
      var options = this.options;
      if (options.attributes)
        node.removeEventListener('DOMAttrModified', this, true);

      if (options.characterData)
        node.removeEventListener('DOMCharacterDataModified', this, true);

      if (options.childList)
        node.removeEventListener('DOMNodeInserted', this, true);

      if (options.childList || options.subtree)
        node.removeEventListener('DOMNodeRemoved', this, true);
    },

    /**
     * Adds a transient observer on node. The transient observer gets removed
     * next time we deliver the change records.
     * @param {Node} node
     */
    addTransientObserver: function(node) {
      // Don't add transient observers on the target itself. We already have all
      // the required listeners set up on the target.
      if (node === this.target)
        return;

      this.addListeners_(node);
      this.transientObservedNodes.push(node);
      var registrations = registrationsTable.get(node);
      if (!registrations)
        registrationsTable.set(node, registrations = []);

      // We know that registrations does not contain this because we already
      // checked if node === this.target.
      registrations.push(this);
    },

    removeTransientObservers: function() {
      var transientObservedNodes = this.transientObservedNodes;
      this.transientObservedNodes = [];

      transientObservedNodes.forEach(function(node) {
        // Transient observers are never added to the target.
        this.removeListeners_(node);

        var registrations = registrationsTable.get(node);
        for (var i = 0; i < registrations.length; i++) {
          if (registrations[i] === this) {
            registrations.splice(i, 1);
            // Each node can only have one registered observer associated with
            // this observer.
            break;
          }
        }
      }, this);
    },

    handleEvent: function(e) {
      // Stop propagation since we are managing the propagation manually.
      // This means that other mutation events on the page will not work
      // correctly but that is by design.
      e.stopImmediatePropagation();

      switch (e.type) {
        case 'DOMAttrModified':
          // http://dom.spec.whatwg.org/#concept-mo-queue-attributes

          var name = e.attrName;
          var namespace = e.relatedNode.namespaceURI;
          var target = e.target;

          // 1.
          var record = new getRecord('attributes', target);
          record.attributeName = name;
          record.attributeNamespace = namespace;

          // 2.
          var oldValue =
              e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;

          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            // 3.1, 4.2
            if (!options.attributes)
              return;

            // 3.2, 4.3
            if (options.attributeFilter && options.attributeFilter.length &&
                options.attributeFilter.indexOf(name) === -1 &&
                options.attributeFilter.indexOf(namespace) === -1) {
              return;
            }
            // 3.3, 4.4
            if (options.attributeOldValue)
              return getRecordWithOldValue(oldValue);

            // 3.4, 4.5
            return record;
          });

          break;

        case 'DOMCharacterDataModified':
          // http://dom.spec.whatwg.org/#concept-mo-queue-characterdata
          var target = e.target;

          // 1.
          var record = getRecord('characterData', target);

          // 2.
          var oldValue = e.prevValue;


          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            // 3.1, 4.2
            if (!options.characterData)
              return;

            // 3.2, 4.3
            if (options.characterDataOldValue)
              return getRecordWithOldValue(oldValue);

            // 3.3, 4.4
            return record;
          });

          break;

        case 'DOMNodeRemoved':
          this.addTransientObserver(e.target);
          // Fall through.
        case 'DOMNodeInserted':
          // http://dom.spec.whatwg.org/#concept-mo-queue-childlist
          var target = e.relatedNode;
          var changedNode = e.target;
          var addedNodes, removedNodes;
          if (e.type === 'DOMNodeInserted') {
            addedNodes = [changedNode];
            removedNodes = [];
          } else {

            addedNodes = [];
            removedNodes = [changedNode];
          }
          var previousSibling = changedNode.previousSibling;
          var nextSibling = changedNode.nextSibling;

          // 1.
          var record = getRecord('childList', target);
          record.addedNodes = addedNodes;
          record.removedNodes = removedNodes;
          record.previousSibling = previousSibling;
          record.nextSibling = nextSibling;

          forEachAncestorAndObserverEnqueueRecord(target, function(options) {
            // 2.1, 3.2
            if (!options.childList)
              return;

            // 2.2, 3.3
            return record;
          });

      }

      clearRecords();
    }
  };

  global.JsMutationObserver = JsMutationObserver;

})(this);

/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

if (!window.MutationObserver) {
  window.MutationObserver = 
      window.WebKitMutationObserver || 
      window.JsMutationObserver;
  if (!MutationObserver) {
    throw new Error("no mutation observer support");
  }
}

/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

/**
 * Implements `document.register`
 * @module CustomElements
*/

/**
 * Polyfilled extensions to the `document` object.
 * @class Document
*/

(function(scope) {

// imports

if (!scope) {
  scope = window.CustomElements = {flags:{}};
}
var flags = scope.flags;

// native document.register?

var hasNative = Boolean(document.webkitRegister || document.register);
var useNative = !flags.register && hasNative;

if (useNative) {

  // normalize
  document.register = document.register || document.webkitRegister;

  // stub
  var nop = function() {};

  // exports
  scope.registry = {};
  scope.upgradeElement = nop;
  
  scope.watchShadow = nop;
  scope.watchAllShadows = nop;
  scope.upgrade = nop;
  scope.upgradeAll = nop;
  scope.upgradeSubtree = nop;
  scope.observeDocument = nop;
  scope.upgradeDocument = nop;
  scope.takeRecords = nop;

} else {

  /**
   * Registers a custom tag name with the document.
   *
   * When a registered element is created, a `readyCallback` method is called
   * in the scope of the element. The `readyCallback` method can be specified on
   * either `inOptions.prototype` or `inOptions.lifecycle` with the latter taking
   * precedence.
   *
   * @method register
   * @param {String} inName The tag name to register. Must include a dash ('-'),
   *    for example 'x-component'.
   * @param {Object} inOptions
   *    @param {String} [inOptions.extends]
   *      (_off spec_) Tag name of an element to extend (or blank for a new
   *      element). This parameter is not part of the specification, but instead
   *      is a hint for the polyfill because the extendee is difficult to infer.
   *      Remember that the input prototype must chain to the extended element's
   *      prototype (or HTMLElement.prototype) regardless of the value of
   *      `extends`.
   *    @param {Object} inOptions.prototype The prototype to use for the new
   *      element. The prototype must inherit from HTMLElement.
   *    @param {Object} [inOptions.lifecycle]
   *      Callbacks that fire at important phases in the life of the custom
   *      element.
   *
   * @example
   *      FancyButton = document.register("fancy-button", {
   *        extends: 'button',
   *        prototype: Object.create(HTMLButtonElement.prototype, {
   *          readyCallback: {
   *            value: function() {
   *              console.log("a fancy-button was created",
   *            }
   *          }
   *        })
   *      });
   * @return {Function} Constructor for the newly registered type.
   */
  function register(inName, inOptions) {
    //console.warn('document.register("' + inName + '", ', inOptions, ')');
    // construct a defintion out of options
    // TODO(sjmiles): probably should clone inOptions instead of mutating it
    var definition = inOptions || {};
    if (!inName) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('Name argument must not be empty');
    }
    // record name
    definition.name = inName;
    // must have a prototype, default to an extension of HTMLElement
    // TODO(sjmiles): probably should throw if no prototype, check spec
    if (!definition.prototype) {
      // TODO(sjmiles): replace with more appropriate error (EricB can probably
      // offer guidance)
      throw new Error('Options missing required prototype property');
    }
    // ensure a lifecycle object so we don't have to null test it
    definition.lifecycle = definition.lifecycle || {};
    // build a list of ancestral custom elements (for native base detection)
    // TODO(sjmiles): we used to need to store this, but current code only
    // uses it in 'resolveTagName': it should probably be inlined
    definition.ancestry = ancestry(definition.extends);
    // extensions of native specializations of HTMLElement require localName
    // to remain native, and use secondary 'is' specifier for extension type
    resolveTagName(definition);
    // some platforms require modifications to the user-supplied prototype
    // chain
    resolvePrototypeChain(definition);
    // overrides to implement attributeChanged callback
    overrideAttributeApi(definition.prototype);
    // 7.1.5: Register the DEFINITION with DOCUMENT
    registerDefinition(inName, definition);
    // 7.1.7. Run custom element constructor generation algorithm with PROTOTYPE
    // 7.1.8. Return the output of the previous step.
    definition.ctor = generateConstructor(definition);
    definition.ctor.prototype = definition.prototype;
    // force our .constructor to be our actual constructor
    definition.prototype.constructor = definition.ctor;
    // if initial parsing is complete
    if (scope.ready) {
      // upgrade any pre-existing nodes of this type
      scope.upgradeAll(document);
    }
    return definition.ctor;
  }

  function ancestry(inExtends) {
    var extendee = registry[inExtends];
    if (extendee) {
      return ancestry(extendee.extends).concat([extendee]);
    }
    return [];
  }

  function resolveTagName(inDefinition) {
    // if we are explicitly extending something, that thing is our
    // baseTag, unless it represents a custom component
    var baseTag = inDefinition.extends;
    // if our ancestry includes custom components, we only have a
    // baseTag if one of them does
    for (var i=0, a; (a=inDefinition.ancestry[i]); i++) {
      baseTag = a.is && a.tag;
    }
    // our tag is our baseTag, if it exists, and otherwise just our name
    inDefinition.tag = baseTag || inDefinition.name;
    if (baseTag) {
      // if there is a base tag, use secondary 'is' specifier
      inDefinition.is = inDefinition.name;
    }
  }

  function resolvePrototypeChain(inDefinition) {
    // if we don't support __proto__ we need to locate the native level
    // prototype for precise mixing in
    if (!Object.__proto__) {
      // default prototype
      var native = HTMLElement.prototype;
      // work out prototype when using type-extension
      if (inDefinition.is) {
        var inst = document.createElement(inDefinition.tag);
        native = Object.getPrototypeOf(inst);
      }
      // ensure __proto__ reference is installed at each point on the prototype
      // chain.
      // NOTE: On platforms without __proto__, a mixin strategy is used instead
      // of prototype swizzling. In this case, this generated __proto__ provides
      // limited support for prototype traversal.
      var proto = inDefinition.prototype, ancestor;
      while (proto && (proto !== native)) {
        var ancestor = Object.getPrototypeOf(proto);
        proto.__proto__ = ancestor;
        proto = ancestor;
      }
    }
    // cache this in case of mixin
    inDefinition.native = native;
  }

  // SECTION 4

  function instantiate(inDefinition) {
    // 4.a.1. Create a new object that implements PROTOTYPE
    // 4.a.2. Let ELEMENT by this new object
    //
    // the custom element instantiation algorithm must also ensure that the
    // output is a valid DOM element with the proper wrapper in place.
    //
    return upgrade(domCreateElement(inDefinition.tag), inDefinition);
  }

  function upgrade(inElement, inDefinition) {
    // some definitions specify an 'is' attribute
    if (inDefinition.is) {
      inElement.setAttribute('is', inDefinition.is);
    }
    // make 'element' implement inDefinition.prototype
    implement(inElement, inDefinition);
    // flag as upgraded
    inElement.__upgraded__ = true;
    // there should never be a shadow root on inElement at this point
    // we require child nodes be upgraded before `created`
    scope.upgradeSubtree(inElement);
    // lifecycle management
    created(inElement);
    // OUTPUT
    return inElement;
  }

  function implement(inElement, inDefinition) {
    // prototype swizzling is best
    if (Object.__proto__) {
      inElement.__proto__ = inDefinition.prototype;
    } else {
      // where above we can re-acquire inPrototype via
      // getPrototypeOf(Element), we cannot do so when
      // we use mixin, so we install a magic reference
      customMixin(inElement, inDefinition.prototype, inDefinition.native);
      inElement.__proto__ = inDefinition.prototype;
    }
  }

  function customMixin(inTarget, inSrc, inNative) {
    // TODO(sjmiles): 'used' allows us to only copy the 'youngest' version of
    // any property. This set should be precalculated. We also need to
    // consider this for supporting 'super'.
    var used = {};
    // start with inSrc
    var p = inSrc;
    // sometimes the default is HTMLUnknownElement.prototype instead of
    // HTMLElement.prototype, so we add a test
    // the idea is to avoid mixing in native prototypes, so adding
    // the second test is WLOG
    while (p !== inNative && p !== HTMLUnknownElement.prototype) {
      var keys = Object.getOwnPropertyNames(p);
      for (var i=0, k; k=keys[i]; i++) {
        if (!used[k]) {
          Object.defineProperty(inTarget, k,
              Object.getOwnPropertyDescriptor(p, k));
          used[k] = 1;
        }
      }
      p = Object.getPrototypeOf(p);
    }
  }

  function created(inElement) {
    // invoke createdCallback
    if (inElement.createdCallback) {
      inElement.createdCallback();
    }
  }

  // attribute watching

  function overrideAttributeApi(prototype) {
    // overrides to implement callbacks
    // TODO(sjmiles): should support access via .attributes NamedNodeMap
    // TODO(sjmiles): preserves user defined overrides, if any
    var setAttribute = prototype.setAttribute;
    prototype.setAttribute = function(name, value) {
      changeAttribute.call(this, name, value, setAttribute);
    }
    var removeAttribute = prototype.removeAttribute;
    prototype.removeAttribute = function(name, value) {
      changeAttribute.call(this, name, value, removeAttribute);
    }
  }

  function changeAttribute(name, value, operation) {
    var oldValue = this.getAttribute(name);
    operation.apply(this, arguments);
    if (this.attributeChangedCallback 
        && (this.getAttribute(name) !== oldValue)) {
      this.attributeChangedCallback(name, oldValue);
    }
  }

  // element registry (maps tag names to definitions)

  var registry = {};

  function registerDefinition(inName, inDefinition) {
    registry[inName] = inDefinition;
  }

  function generateConstructor(inDefinition) {
    return function() {
      return instantiate(inDefinition);
    };
  }

  function createElement(tag, typeExtension) {
    // TODO(sjmiles): ignore 'tag' when using 'typeExtension', we could
    // error check it, or perhaps there should only ever be one argument
    var definition = registry[typeExtension || tag];
    if (definition) {
      return new definition.ctor();
    }
    return domCreateElement(tag);
  }

  function upgradeElement(inElement) {
    if (!inElement.__upgraded__ && (inElement.nodeType === Node.ELEMENT_NODE)) {
      var type = inElement.getAttribute('is') || inElement.localName;
      var definition = registry[type];
      return definition && upgrade(inElement, definition);
    }
  }

  function cloneNode(deep) {
    // call original clone
    var n = domCloneNode.call(this, deep);
    // upgrade the element and subtree
    scope.upgradeAll(n);
    // return the clone
    return n;
  }
  // capture native createElement before we override it

  var domCreateElement = document.createElement.bind(document);

  // capture native cloneNode before we override it

  var domCloneNode = Node.prototype.cloneNode;

  // exports

  document.register = register;
  document.createElement = createElement; // override
  Node.prototype.cloneNode = cloneNode; // override

  scope.registry = registry;

  /**
   * Upgrade an element to a custom element. Upgrading an element
   * causes the custom prototype to be applied, an `is` attribute 
   * to be attached (as needed), and invocation of the `readyCallback`.
   * `upgrade` does nothing if the element is already upgraded, or
   * if it matches no registered custom tag name.
   *
   * @method ugprade
   * @param {Element} inElement The element to upgrade.
   * @return {Element} The upgraded element.
   */
  scope.upgrade = upgradeElement;
}

scope.hasNative = hasNative;
scope.useNative = useNative;

})(window.CustomElements);

 /*
Copyright 2013 The Polymer Authors. All rights reserved.
Use of this source code is governed by a BSD-style
license that can be found in the LICENSE file.
*/

(function(scope){

/*
if (HTMLElement.prototype.webkitShadowRoot) {
  Object.defineProperty(HTMLElement.prototype, 'shadowRoot', {
    get: function() {
      return this.webkitShadowRoot;
    }
  };
}
*/

// walk the subtree rooted at node, applying 'find(element, data)' function 
// to each element
// if 'find' returns true for 'element', do not search element's subtree  
function findAll(node, find, data) {
  var e = node.firstElementChild;
  if (!e) {
    e = node.firstChild;
    while (e && e.nodeType !== Node.ELEMENT_NODE) {
      e = e.nextSibling;
    }
  }
  while (e) {
    if (find(e, data) !== true) {
      findAll(e, find, data);
    }
    e = e.nextElementSibling;
  }
  return null;
}

// walk all shadowRoots on a given node.
function forRoots(node, cb) {
  var root = node.webkitShadowRoot;
  while(root) {
    forSubtree(root, cb);
    root = root.olderShadowRoot;
  }
}

// walk the subtree rooted at node, including descent into shadow-roots, 
// applying 'cb' to each element
function forSubtree(node, cb) {
  //logFlags.dom && node.childNodes && node.childNodes.length && console.group('subTree: ', node);
  findAll(node, function(e) {
    if (cb(e)) {
      return true;
    }
    forRoots(e, cb);
  });
  forRoots(node, cb);
  //logFlags.dom && node.childNodes && node.childNodes.length && console.groupEnd();
}

// manage lifecycle on added node
function added(node) {
  if (upgrade(node)) {
    insertedNode(node);
    return true; 
  }
  inserted(node);
}

// manage lifecycle on added node's subtree only
function addedSubtree(node) {
  forSubtree(node, function(e) {
    if (added(e)) {
      return true; 
    }
  });
}

// manage lifecycle on added node and it's subtree
function addedNode(node) {
  return added(node) || addedSubtree(node);
}

// upgrade custom elements at node, if applicable
function upgrade(node) {
  if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
    var type = node.getAttribute('is') || node.localName;
    var definition = scope.registry[type];
    if (definition) {
      logFlags.dom && console.group('upgrade:', node.localName);
      scope.upgrade(node);
      logFlags.dom && console.groupEnd();
      return true;
    }
  }
}

function insertedNode(node) {
  inserted(node);
  if (inDocument(node)) {
    forSubtree(node, function(e) {
      inserted(e);
    });
  }
}

// TODO(sjmiles): if there are descents into trees that can never have inDocument(*) true, fix this

function inserted(element) {
  // TODO(sjmiles): it's possible we were inserted and removed in the space
  // of one microtask, in which case we won't be 'inDocument' here
  // But there are other cases where we are testing for inserted without
  // specific knowledge of mutations, and must test 'inDocument' to determine
  // whether to call inserted
  // If we can factor these cases into separate code paths we can have
  // better diagnostics.
  // TODO(sjmiles): when logging, do work on all custom elements so we can
  // track behavior even when callbacks not defined
  //console.log('inserted: ', element.localName);
  if (element.enteredDocumentCallback || (element.__upgraded__ && logFlags.dom)) {
    logFlags.dom && console.group('inserted:', element.localName);
    if (inDocument(element)) {
      element.__inserted = (element.__inserted || 0) + 1;
      // if we are in a 'removed' state, bluntly adjust to an 'inserted' state
      if (element.__inserted < 1) {
        element.__inserted = 1;
      }
      // if we are 'over inserted', squelch the callback
      if (element.__inserted > 1) {
        logFlags.dom && console.warn('inserted:', element.localName,
          'insert/remove count:', element.__inserted)
      } else if (element.enteredDocumentCallback) {
        logFlags.dom && console.log('inserted:', element.localName);
        element.enteredDocumentCallback();
      }
    }
    logFlags.dom && console.groupEnd();
  }
}

function removedNode(node) {
  removed(node);
  forSubtree(node, function(e) {
    removed(e);
  });
}

function removed(element) {
  // TODO(sjmiles): temporary: do work on all custom elements so we can track
  // behavior even when callbacks not defined
  if (element.leftDocumentCallback || (element.__upgraded__ && logFlags.dom)) {
    logFlags.dom && console.log('removed:', element.localName);
    if (!inDocument(element)) {
      element.__inserted = (element.__inserted || 0) - 1;
      // if we are in a 'inserted' state, bluntly adjust to an 'removed' state
      if (element.__inserted > 0) {
        element.__inserted = 0;
      }
      // if we are 'over removed', squelch the callback
      if (element.__inserted < 0) {
        logFlags.dom && console.warn('removed:', element.localName,
            'insert/remove count:', element.__inserted)
      } else if (element.leftDocumentCallback) {
        element.leftDocumentCallback();
      }
    }
  }
}

function inDocument(element) {
  var p = element;
  while (p) {
    if (p == element.ownerDocument) {
      return true;
    }
    p = p.parentNode || p.host;
  }
}

function watchShadow(node) {
  if (node.webkitShadowRoot && !node.webkitShadowRoot.__watched) {
    logFlags.dom && console.log('watching shadow-root for: ', node.localName);
    // watch all unwatched roots...
    var root = node.webkitShadowRoot;
    while (root) {
      watchRoot(root);
      root = root.olderShadowRoot;
    }
  }
}

function watchRoot(root) {
  if (!root.__watched) {
    observe(root);
    root.__watched = true;
  }
}

function watchAllShadows(node) {
  watchShadow(node);
  forSubtree(node, function(e) {
    watchShadow(node);
  });
}

function filter(inNode) {
  switch (inNode.localName) {
    case 'style':
    case 'script':
    case 'template':
    case undefined:
      return true;
  }
}

function handler(mutations) {
  //
  if (logFlags.dom) {
    var mx = mutations[0];
    if (mx && mx.type === 'childList' && mx.addedNodes) {
        if (mx.addedNodes) {
          var d = mx.addedNodes[0];
          while (d && d !== document && !d.host) {
            d = d.parentNode;
          }
          var u = d && (d.URL || d._URL || (d.host && d.host.localName)) || '';
          u = u.split('/?').shift().split('/').pop();
        }
    }
    console.group('mutations (%d) [%s]', mutations.length, u || '');
  }
  //
  mutations.forEach(function(mx) {
    //logFlags.dom && console.group('mutation');
    if (mx.type === 'childList') {
      forEach(mx.addedNodes, function(n) {
        //logFlags.dom && console.log(n.localName);
        if (filter(n)) {
          return;
        }
        // watch shadow-roots on nodes that have had them attached manually
        // TODO(sjmiles): remove if createShadowRoot is overridden
        // TODO(sjmiles): removed as an optimization, manual shadow roots
        // must be watched explicitly
        //watchAllShadows(n);
        // nodes added may need lifecycle management
        addedNode(n);
      });
      // removed nodes may need lifecycle management
      forEach(mx.removedNodes, function(n) {
        //logFlags.dom && console.log(n.localName);
        if (filter(n)) {
          return;
        }
        removedNode(n);
      });
    }
    //logFlags.dom && console.groupEnd();
  });
  logFlags.dom && console.groupEnd();
};

var observer = new MutationObserver(handler);

function takeRecords() {
  // TODO(sjmiles): ask Raf why we have to call handler ourselves
  handler(observer.takeRecords());
}

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

function observe(inRoot) {
  observer.observe(inRoot, {childList: true, subtree: true});
}

function observeDocument(document) {
  observe(document);
}

function upgradeDocument(document) {
  logFlags.dom && console.group('upgradeDocument: ', (document.URL || document._URL || '').split('/').pop());
  addedNode(document);
  logFlags.dom && console.groupEnd();
}

// exports

scope.watchShadow = watchShadow;
scope.watchAllShadows = watchAllShadows;

scope.upgradeAll = addedNode;
scope.upgradeSubtree = addedSubtree;

scope.observeDocument = observeDocument;
scope.upgradeDocument = upgradeDocument;

scope.takeRecords = takeRecords;

})(window.CustomElements);

/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(scope) {

if (!scope) {
  scope = window.HTMLImports = {flags:{}};
}

// imports

var xhr = scope.xhr;

// importer

var IMPORT_LINK_TYPE = 'import';
var STYLE_LINK_TYPE = 'stylesheet';

// highlander object represents a primary document (the argument to 'load')
// at the root of a tree of documents

// for any document, importer:
// - loads any linked documents (with deduping), modifies paths and feeds them back into importer
// - loads text of external script tags
// - loads text of external style tags inside of <element>, modifies paths

// when importer 'modifies paths' in a document, this includes
// - href/src/action in node attributes
// - paths in inline stylesheets
// - all content inside templates

// linked style sheets in an import have their own path fixed up when their containing import modifies paths
// linked style sheets in an <element> are loaded, and the content gets path fixups
// inline style sheets get path fixups when their containing import modifies paths

var loader;

var importer = {
  documents: {},
  cache: {},
  preloadSelectors: [
    'link[rel=' + IMPORT_LINK_TYPE + ']',
    'element link[rel=' + STYLE_LINK_TYPE + ']',
    'template',
    'script[src]:not([type])',
    'script[src][type="text/javascript"]'
  ].join(','),
  loader: function(inNext) {
    // construct a loader instance
    loader = new Loader(importer.loaded, inNext);
    // alias the loader cache (for debugging)
    loader.cache = importer.cache;
    return loader;
  },
  load: function(inDocument, inNext) {
    // construct a loader instance
    loader = importer.loader(inNext);
    // add nodes from document into loader queue
    importer.preload(inDocument);
  },
  preload: function(inDocument) {
    // all preloadable nodes in inDocument
    var nodes = inDocument.querySelectorAll(importer.preloadSelectors);
    // from the main document, only load imports
    // TODO(sjmiles): do this by altering the selector list instead
    nodes = this.filterMainDocumentNodes(inDocument, nodes);
    // extra link nodes from templates, filter templates out of the nodes list
    nodes = this.extractTemplateNodes(nodes);
    // add these nodes to loader's queue
    loader.addNodes(nodes);
  },
  filterMainDocumentNodes: function(inDocument, nodes) {
    if (inDocument === document) {
      nodes = Array.prototype.filter.call(nodes, function(n) {
        return !isScript(n);
      });
    }
    return nodes;
  },
  extractTemplateNodes: function(nodes) {
    var extra = [];
    nodes = Array.prototype.filter.call(nodes, function(n) {
      if (n.localName === 'template') {
        if (n.content) {
          var l$ = n.content.querySelectorAll('link[rel=' + STYLE_LINK_TYPE +
            ']');
          if (l$.length) {
            extra = extra.concat(Array.prototype.slice.call(l$, 0));
          }
        }
        return false;
      }
      return true;
    });
    if (extra.length) {
      nodes = nodes.concat(extra);
    }
    return nodes;
  },
  loaded: function(url, elt, resource) {
    if (isDocumentLink(elt)) {
      var document = importer.documents[url];
      // if we've never seen a document at this url
      if (!document) {
        // generate an HTMLDocument from data
        document = makeDocument(resource, url);
        // resolve resource paths relative to host document
        path.resolvePathsInHTML(document);
        // cache document
        importer.documents[url] = document;
        // add nodes from this document to the loader queue
        importer.preload(document);
      }
      // store import record
      elt.import = {
        href: url,
        ownerNode: elt,
        content: document
      };
      // store document resource
      elt.content = resource = document;
    }
    // store generic resource
    // TODO(sorvell): fails for nodes inside <template>.content
    // see https://code.google.com/p/chromium/issues/detail?id=249381.
    elt.__resource = resource;
    // css path fixups
    if (isStylesheetLink(elt)) {
      path.resolvePathsInStylesheet(elt);
    }
  }
};

function isDocumentLink(elt) {
  return isLinkRel(elt, IMPORT_LINK_TYPE);
}

function isStylesheetLink(elt) {
  return isLinkRel(elt, STYLE_LINK_TYPE);
}

function isLinkRel(elt, rel) {
  return elt.localName === 'link' && elt.getAttribute('rel') === rel;
}

function isScript(elt) {
  return elt.localName === 'script';
}

function makeDocument(resource, url) {
  // create a new HTML document
  var doc = resource;
  if (!(doc instanceof Document)) {
    doc = document.implementation.createHTMLDocument(IMPORT_LINK_TYPE);
    // install html
    doc.body.innerHTML = resource;
  }
  // cache the new document's source url
  doc._URL = url;
  // establish a relative path via <base>
  var base = doc.createElement('base');
  base.setAttribute('href', document.baseURI);
  doc.head.appendChild(base);
  // TODO(sorvell): MDV Polyfill intrusion: boostrap template polyfill
  if (window.HTMLTemplateElement && HTMLTemplateElement.bootstrap) {
    HTMLTemplateElement.bootstrap(doc);
  }
  return doc;
}

var Loader = function(inOnLoad, inOnComplete) {
  this.onload = inOnLoad;
  this.oncomplete = inOnComplete;
  this.inflight = 0;
  this.pending = {};
  this.cache = {};
};

Loader.prototype = {
  addNodes: function(inNodes) {
    // number of transactions to complete
    this.inflight += inNodes.length;
    // commence transactions
    forEach(inNodes, this.require, this);
    // anything to do?
    this.checkDone();
  },
  require: function(inElt) {
    var url = path.nodeUrl(inElt);
    // TODO(sjmiles): ad-hoc
    inElt.__nodeUrl = url;
    // deduplication
    if (!this.dedupe(url, inElt)) {
      // fetch this resource
      this.fetch(url, inElt);
    }
  },
  dedupe: function(inUrl, inElt) {
    if (this.pending[inUrl]) {
      // add to list of nodes waiting for inUrl
      this.pending[inUrl].push(inElt);
      // don't need fetch
      return true;
    }
    if (this.cache[inUrl]) {
      // complete load using cache data
      this.onload(inUrl, inElt, loader.cache[inUrl]);
      // finished this transaction
      this.tail();
      // don't need fetch
      return true;
    }
    // first node waiting for inUrl
    this.pending[inUrl] = [inElt];
    // need fetch (not a dupe)
    return false;
  },
  fetch: function(url, elt) {
    var receiveXhr = function(err, resource) {
      this.receive(url, elt, err, resource);
    }.bind(this);
    xhr.load(url, receiveXhr);
    // TODO(sorvell): blocked on 
    // https://code.google.com/p/chromium/issues/detail?id=257221
    // xhr'ing for a document makes scripts in imports runnable; otherwise
    // they are not; however, it requires that we have doctype=html in
    // the import which is unacceptable. This is only needed on Chrome
    // to avoid the bug above.
    /*
    if (isDocumentLink(elt)) {
      xhr.loadDocument(url, receiveXhr);
    } else {
      xhr.load(url, receiveXhr);
    }
    */
  },
  receive: function(inUrl, inElt, inErr, inResource) {
    if (!inErr) {
      loader.cache[inUrl] = inResource;
    }
    loader.pending[inUrl].forEach(function(e) {
      if (!inErr) {
        this.onload(inUrl, e, inResource);
      }
      this.tail();
    }, this);
    loader.pending[inUrl] = null;
  },
  tail: function() {
    --this.inflight;
    this.checkDone();
  },
  checkDone: function() {
    if (!this.inflight) {
      this.oncomplete();
    }
  }
};

var URL_ATTRS = ['href', 'src', 'action'];
var URL_ATTRS_SELECTOR = '[' + URL_ATTRS.join('],[') + ']';
var URL_TEMPLATE_SEARCH = '{{.*}}';

var path = {
  nodeUrl: function(inNode) {
    return path.resolveUrl(path.getDocumentUrl(document), path.hrefOrSrc(inNode));
  },
  hrefOrSrc: function(inNode) {
    return inNode.getAttribute("href") || inNode.getAttribute("src");
  },
  documentUrlFromNode: function(inNode) {
    return path.getDocumentUrl(inNode.ownerDocument || inNode);
  },
  getDocumentUrl: function(inDocument) {
    var url = inDocument &&
        // TODO(sjmiles): ShadowDOMPolyfill intrusion
        (inDocument._URL || (inDocument.impl && inDocument.impl._URL)
            || inDocument.baseURI || inDocument.URL)
                || '';
    // take only the left side if there is a #
    return url.split('#')[0];
  },
  resolveUrl: function(inBaseUrl, inUrl, inRelativeToDocument) {
    if (this.isAbsUrl(inUrl)) {
      return inUrl;
    }
    var url = this.compressUrl(this.urlToPath(inBaseUrl) + inUrl);
    if (inRelativeToDocument) {
      url = path.makeRelPath(path.getDocumentUrl(document), url);
    }
    return url;
  },
  isAbsUrl: function(inUrl) {
    return /(^data:)|(^http[s]?:)|(^\/)/.test(inUrl);
  },
  urlToPath: function(inBaseUrl) {
    var parts = inBaseUrl.split("/");
    parts.pop();
    parts.push('');
    return parts.join("/");
  },
  compressUrl: function(inUrl) {
    var parts = inUrl.split("/");
    for (var i=0, p; i<parts.length; i++) {
      p = parts[i];
      if (p === "..") {
        parts.splice(i-1, 2);
        i -= 2;
      }
    }
    return parts.join("/");
  },
  // make a relative path from source to target
  makeRelPath: function(inSource, inTarget) {
    var s, t;
    s = this.compressUrl(inSource).split("/");
    t = this.compressUrl(inTarget).split("/");
    while (s.length && s[0] === t[0]){
      s.shift();
      t.shift();
    }
    for(var i = 0, l = s.length-1; i < l; i++) {
      t.unshift("..");
    }
    var r = t.join("/");
    return r;
  },
  resolvePathsInHTML: function(root, url) {
    url = url || path.documentUrlFromNode(root)
    path.resolveAttributes(root, url);
    path.resolveStyleElts(root, url);
    // handle template.content
    var templates = root.querySelectorAll('template');
    if (templates) {
      forEach(templates, function(t) {
        if (t.content) {
          path.resolvePathsInHTML(t.content, url);
        }
      });
    }
  },
  resolvePathsInStylesheet: function(inSheet) {
    var docUrl = path.nodeUrl(inSheet);
    inSheet.__resource = path.resolveCssText(inSheet.__resource, docUrl);
  },
  resolveStyleElts: function(inRoot, inUrl) {
    var styles = inRoot.querySelectorAll('style');
    if (styles) {
      forEach(styles, function(style) {
        style.textContent = path.resolveCssText(style.textContent, inUrl);
      });
    }
  },
  resolveCssText: function(inCssText, inBaseUrl) {
    return inCssText.replace(/url\([^)]*\)/g, function(inMatch) {
      // find the url path, ignore quotes in url string
      var urlPath = inMatch.replace(/["']/g, "").slice(4, -1);
      urlPath = path.resolveUrl(inBaseUrl, urlPath, true);
      return "url(" + urlPath + ")";
    });
  },
  resolveAttributes: function(inRoot, inUrl) {
    // search for attributes that host urls
    var nodes = inRoot && inRoot.querySelectorAll(URL_ATTRS_SELECTOR);
    if (nodes) {
      forEach(nodes, function(n) {
        this.resolveNodeAttributes(n, inUrl);
      }, this);
    }
  },
  resolveNodeAttributes: function(inNode, inUrl) {
    URL_ATTRS.forEach(function(v) {
      var attr = inNode.attributes[v];
      if (attr && attr.value &&
         (attr.value.search(URL_TEMPLATE_SEARCH) < 0)) {
        var urlPath = path.resolveUrl(inUrl, attr.value, true);
        attr.value = urlPath;
      }
    });
  }
};

xhr = xhr || {
  async: true,
  ok: function(inRequest) {
    return (inRequest.status >= 200 && inRequest.status < 300)
        || (inRequest.status === 304)
        || (inRequest.status === 0);
  },
  load: function(url, next, nextContext) {
    var request = new XMLHttpRequest();
    if (scope.flags.debug || scope.flags.bust) {
      url += '?' + Math.random();
    }
    request.open('GET', url, xhr.async);
    request.addEventListener('readystatechange', function(e) {
      if (request.readyState === 4) {
        next.call(nextContext, !xhr.ok(request) && request,
          request.response, url);
      }
    });
    request.send();
    return request;
  },
  loadDocument: function(url, next, nextContext) {
    this.load(url, next, nextContext).responseType = 'document';
  }
};

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

// exports

scope.path = path;
scope.xhr = xhr;
scope.importer = importer;
scope.getDocumentUrl = path.getDocumentUrl;
scope.IMPORT_LINK_TYPE = IMPORT_LINK_TYPE;

})(window.HTMLImports);

/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function(scope) {

var IMPORT_LINK_TYPE = 'import';

// highlander object for parsing a document tree

var importParser = {
  selectors: [
    'link[rel=' + IMPORT_LINK_TYPE + ']',
    'link[rel=stylesheet]',
    'style',
    'script:not([type])',
    'script[type="text/javascript"]'
  ],
  map: {
    link: 'parseLink',
    script: 'parseScript',
    style: 'parseGeneric'
  },
  parse: function(inDocument) {
    if (!inDocument.__importParsed) {
      // only parse once
      inDocument.__importParsed = true;
      // all parsable elements in inDocument (depth-first pre-order traversal)
      var elts = inDocument.querySelectorAll(importParser.selectors);
      // for each parsable node type, call the mapped parsing method
      forEach(elts, function(e) {
        importParser[importParser.map[e.localName]](e);
      });
    }
  },
  parseLink: function(linkElt) {
    if (isDocumentLink(linkElt)) {
      if (linkElt.content) {
        importParser.parse(linkElt.content);
      }
    } else {
      this.parseGeneric(linkElt);
    }
  },
  parseGeneric: function(elt) {
    if (needsMainDocumentContext(elt)) {
      document.head.appendChild(elt);
    }
  },
  parseScript: function(scriptElt) {
    if (needsMainDocumentContext(scriptElt)) {
      // acquire code to execute
      var code = (scriptElt.__resource || scriptElt.textContent).trim();
      if (code) {
        // calculate source map hint
        var moniker = scriptElt.__nodeUrl;
        if (!moniker) {
          var moniker = scope.path.documentUrlFromNode(scriptElt);
          // there could be more than one script this url
          var tag = '[' + Math.floor((Math.random()+1)*1000) + ']';
          // TODO(sjmiles): Polymer hack, should be pluggable if we need to allow 
          // this sort of thing
          var matches = code.match(/Polymer\(['"]([^'"]*)/);
          tag = matches && matches[1] || tag;
          // tag the moniker
          moniker += '/' + tag + '.js';
        }
        // source map hint
        code += "\n//# sourceURL=" + moniker + "\n";
        // evaluate the code
        eval.call(window, code);
      }
    }
  }
};

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

function isDocumentLink(elt) {
  return elt.localName === 'link'
      && elt.getAttribute('rel') === IMPORT_LINK_TYPE;
}

function needsMainDocumentContext(node) {
  // nodes can be moved to the main document:
  // if they are in a tree but not in the main document and not children of <element>
  return node.parentNode && !inMainDocument(node) 
      && !isElementElementChild(node);
}

function inMainDocument(elt) {
  return elt.ownerDocument === document ||
    // TODO(sjmiles): ShadowDOMPolyfill intrusion
    elt.ownerDocument.impl === document;
}

function isElementElementChild(elt) {
  return elt.parentNode && elt.parentNode.localName === 'element';
}

// exports

scope.parser = importParser;

})(HTMLImports);
/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */
(function(){

// bootstrap

// IE shim for CustomEvent
if (typeof window.CustomEvent !== 'function') {
  window.CustomEvent = function(inType) {
     var e = document.createEvent('HTMLEvents');
     e.initEvent(inType, true, true);
     return e;
  };
}

function bootstrap() {
  // preload document resource trees
  HTMLImports.importer.load(document, function() {
    HTMLImports.parser.parse(document);
    HTMLImports.readyTime = new Date().getTime();
    // send HTMLImportsLoaded when finished
    document.dispatchEvent(
      new CustomEvent('HTMLImportsLoaded', {bubbles: true})
    );
  });
};

if (document.readyState === 'complete') {
  bootstrap();
} else {
  window.addEventListener('DOMContentLoaded', bootstrap);
}

})();

/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */

(function() {

// import

var IMPORT_LINK_TYPE = window.HTMLImports ? HTMLImports.IMPORT_LINK_TYPE : 'none';

// highlander object for parsing a document tree

var parser = {
  selectors: [
    'link[rel=' + IMPORT_LINK_TYPE + ']'
  ],
  map: {
    link: 'parseLink'
  },
  parse: function(inDocument) {
    if (!inDocument.__parsed) {
      // only parse once
      inDocument.__parsed = true;
      // all parsable elements in inDocument (depth-first pre-order traversal)
      var elts = inDocument.querySelectorAll(parser.selectors);
      // for each parsable node type, call the mapped parsing method
      forEach(elts, function(e) {
        parser[parser.map[e.localName]](e);
      });
      // upgrade all upgradeable static elements, anything dynamically
      // created should be caught by observer
      CustomElements.upgradeDocument(inDocument);
      // observe document for dom changes
      CustomElements.observeDocument(inDocument);
    }
  },
  parseLink: function(linkElt) {
    // imports
    if (isDocumentLink(linkElt)) {
      this.parseImport(linkElt);
    }
  },
  parseImport: function(linkElt) {
    if (linkElt.content) {
      parser.parse(linkElt.content);
    }
  }
};

function isDocumentLink(inElt) {
  return (inElt.localName === 'link'
      && inElt.getAttribute('rel') === IMPORT_LINK_TYPE);
}

var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);

// exports

CustomElements.parser = parser;

})();
/*
 * Copyright 2013 The Polymer Authors. All rights reserved.
 * Use of this source code is governed by a BSD-style
 * license that can be found in the LICENSE file.
 */
(function(){

// bootstrap parsing

function bootstrap() {
  // go async so call stack can unwind
  setTimeout(function() {
    // parse document
    CustomElements.parser.parse(document);
    // one more pass before register is 'live'
    CustomElements.upgradeDocument(document);  
    // set internal 'ready' flag, now document.register will trigger 
    // synchronous upgrades
    CustomElements.ready = true;
    // capture blunt profiling data
    CustomElements.readyTime = Date.now();
    if (window.HTMLImports) {
      CustomElements.elapsed = CustomElements.readyTime - HTMLImports.readyTime;
    }
    // notify the system that we are bootstrapped
    document.body.dispatchEvent(
      new CustomEvent('WebComponentsReady', {bubbles: true})
    );
  }, 0);
}

// CustomEvent shim for IE
if (typeof window.CustomEvent !== 'function') {
  window.CustomEvent = function(inType) {
     var e = document.createEvent('HTMLEvents');
     e.initEvent(inType, true, true);
     return e;
  };
}

if (document.readyState === 'complete') {
  bootstrap();
} else {
  var loadEvent = window.HTMLImports ? 'HTMLImportsLoaded' : 'DOMContentLoaded';
  window.addEventListener(loadEvent, bootstrap);
}

})();
