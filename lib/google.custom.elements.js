var SideTable;

if (typeof WeakMap !== "undefined" && navigator.userAgent.indexOf("Firefox/") < 0) {
    SideTable = WeakMap;
} else {
    (function() {
        var defineProperty = Object.defineProperty;
        var hasOwnProperty = Object.hasOwnProperty;
        var counter = new Date().getTime() % 1e9;
        SideTable = function() {
            this.name = "__st" + (Math.random() * 1e9 >>> 0) + (counter++ + "__");
        };
        SideTable.prototype = {
            set: function(key, value) {
                defineProperty(key, this.name, {
                    value: value,
                    writable: true
                });
            },
            get: function(key) {
                return hasOwnProperty.call(key, this.name) ? key[this.name] : undefined;
            }
        };
    })();
}

(function(global) {
    var registrationsTable = new SideTable("registrations");
    var setImmediate = window.msSetImmediate;
    if (!setImmediate) {
        var setImmediateQueue = [];
        var sentinel = String(Math.random());
        window.addEventListener("message", function(e) {
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
            window.postMessage(sentinel, "*");
        };
    }
    var isScheduled = false;
    var scheduledObservers = [];
    function scheduleCallback(observer) {
        scheduledObservers.push(observer);
        if (!isScheduled) {
            isScheduled = true;
            setImmediate(dispatchCallbacks);
        }
    }
    function dispatchCallbacks() {
        isScheduled = false;
        var observers = scheduledObservers;
        scheduledObservers = [];
        observers.sort(function(o1, o2) {
            return o1.uid_ - o2.uid_;
        });
        var anyNonEmpty = false;
        observers.forEach(function(observer) {
            var queue = observer.takeRecords();
            removeTransientObserversFor(observer);
            if (queue.length) {
                observer.callback_(queue, observer);
                anyNonEmpty = true;
            }
        });
        if (anyNonEmpty) dispatchCallbacks();
    }
    function removeTransientObserversFor(observer) {
        observer.nodes_.forEach(function(node) {
            var registrations = registrationsTable.get(node);
            if (!registrations) return;
            registrations.forEach(function(registration) {
                if (registration.observer === observer) registration.removeTransientObservers();
            });
        });
    }
    function forEachAncestorAndObserverEnqueueRecord(target, callback) {
        for (var node = target; node; node = node.parentNode) {
            var registrations = registrationsTable.get(node);
            if (registrations) {
                for (var j = 0; j < registrations.length; j++) {
                    var registration = registrations[j];
                    var options = registration.options;
                    if (node !== target && !options.subtree) continue;
                    var record = callback(options);
                    if (record) registration.enqueue(record);
                }
            }
        }
    }
    var uidCounter = 0;
    function JsMutationObserver(callback) {
        this.callback_ = callback;
        this.nodes_ = [];
        this.records_ = [];
        this.uid_ = ++uidCounter;
    }
    JsMutationObserver.prototype = {
        observe: function(target, options) {
            if (!options.childList && !options.attributes && !options.characterData || options.attributeOldValue && !options.attributes || options.attributeFilter && options.attributeFilter.length && !options.attributes || options.characterDataOldValue && !options.characterData) {
                throw new SyntaxError();
            }
            var registrations = registrationsTable.get(target);
            if (!registrations) registrationsTable.set(target, registrations = []);
            var registration;
            for (var i = 0; i < registrations.length; i++) {
                if (registrations[i].observer === this) {
                    registration = registrations[i];
                    registration.removeListeners();
                    registration.options = options;
                    break;
                }
            }
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
    }
    var currentRecord, recordWithOldValue;
    function getRecord(type, target) {
        return currentRecord = new MutationRecord(type, target);
    }
    function getRecordWithOldValue(oldValue) {
        if (recordWithOldValue) return recordWithOldValue;
        recordWithOldValue = copyMutationRecord(currentRecord);
        recordWithOldValue.oldValue = oldValue;
        return recordWithOldValue;
    }
    function clearRecords() {
        currentRecord = recordWithOldValue = undefined;
    }
    function recordRepresentsCurrentMutation(record) {
        return record === recordWithOldValue || record === currentRecord;
    }
    function selectRecord(lastRecord, newRecord) {
        if (lastRecord === newRecord) return lastRecord;
        if (recordWithOldValue && recordRepresentsCurrentMutation(lastRecord)) return recordWithOldValue;
        return null;
    }
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
            if (options.attributes) node.addEventListener("DOMAttrModified", this, true);
            if (options.characterData) node.addEventListener("DOMCharacterDataModified", this, true);
            if (options.childList) node.addEventListener("DOMNodeInserted", this, true);
            if (options.childList || options.subtree) node.addEventListener("DOMNodeRemoved", this, true);
        },
        removeListeners: function() {
            this.removeListeners_(this.target);
        },
        removeListeners_: function(node) {
            var options = this.options;
            if (options.attributes) node.removeEventListener("DOMAttrModified", this, true);
            if (options.characterData) node.removeEventListener("DOMCharacterDataModified", this, true);
            if (options.childList) node.removeEventListener("DOMNodeInserted", this, true);
            if (options.childList || options.subtree) node.removeEventListener("DOMNodeRemoved", this, true);
        },
        addTransientObserver: function(node) {
            if (node === this.target) return;
            this.addListeners_(node);
            this.transientObservedNodes.push(node);
            var registrations = registrationsTable.get(node);
            if (!registrations) registrationsTable.set(node, registrations = []);
            registrations.push(this);
        },
        removeTransientObservers: function() {
            var transientObservedNodes = this.transientObservedNodes;
            this.transientObservedNodes = [];
            transientObservedNodes.forEach(function(node) {
                this.removeListeners_(node);
                var registrations = registrationsTable.get(node);
                for (var i = 0; i < registrations.length; i++) {
                    if (registrations[i] === this) {
                        registrations.splice(i, 1);
                        break;
                    }
                }
            }, this);
        },
        handleEvent: function(e) {
            e.stopImmediatePropagation();
            switch (e.type) {
              case "DOMAttrModified":
                var name = e.attrName;
                var namespace = e.relatedNode.namespaceURI;
                var target = e.target;
                var record = new getRecord("attributes", target);
                record.attributeName = name;
                record.attributeNamespace = namespace;
                var oldValue = e.attrChange === MutationEvent.ADDITION ? null : e.prevValue;
                forEachAncestorAndObserverEnqueueRecord(target, function(options) {
                    if (!options.attributes) return;
                    if (options.attributeFilter && options.attributeFilter.length && options.attributeFilter.indexOf(name) === -1 && options.attributeFilter.indexOf(namespace) === -1) {
                        return;
                    }
                    if (options.attributeOldValue) return getRecordWithOldValue(oldValue);
                    return record;
                });
                break;

              case "DOMCharacterDataModified":
                var target = e.target;
                var record = getRecord("characterData", target);
                var oldValue = e.prevValue;
                forEachAncestorAndObserverEnqueueRecord(target, function(options) {
                    if (!options.characterData) return;
                    if (options.characterDataOldValue) return getRecordWithOldValue(oldValue);
                    return record;
                });
                break;

              case "DOMNodeRemoved":
                this.addTransientObserver(e.target);

              case "DOMNodeInserted":
                var target = e.relatedNode;
                var changedNode = e.target;
                var addedNodes, removedNodes;
                if (e.type === "DOMNodeInserted") {
                    addedNodes = [ changedNode ];
                    removedNodes = [];
                } else {
                    addedNodes = [];
                    removedNodes = [ changedNode ];
                }
                var previousSibling = changedNode.previousSibling;
                var nextSibling = changedNode.nextSibling;
                var record = getRecord("childList", target);
                record.addedNodes = addedNodes;
                record.removedNodes = removedNodes;
                record.previousSibling = previousSibling;
                record.nextSibling = nextSibling;
                forEachAncestorAndObserverEnqueueRecord(target, function(options) {
                    if (!options.childList) return;
                    return record;
                });
            }
            clearRecords();
        }
    };
    global.JsMutationObserver = JsMutationObserver;
})(this);

(function(scope) {
    scope = scope || {
        flags: {}
    };
    function register(inName, inOptions) {
        var definition = inOptions || {};
        if (!inName) {
            throw new Error("Name argument must not be empty");
        }
        definition.name = inName;
        if (!definition.prototype) {
            throw new Error("Options missing required prototype property");
        }
        definition.lifecycle = definition.lifecycle || {};
        definition.ancestry = ancestry(definition.extends);
        resolveTagName(definition);
        resolvePrototypeChain(definition);
        registerDefinition(inName, definition);
        definition.ctor = generateConstructor(definition);
        definition.ctor.prototype = definition.prototype;
        document.upgradeElements();
        return definition.ctor;
    }
    function ancestry(inExtends) {
        var extendee = registry[inExtends];
        if (extendee) {
            return ancestry(extendee.extends).concat([ extendee ]);
        }
        return [];
    }
    function resolveTagName(inDefinition) {
        var baseTag = inDefinition.extends;
        for (var i = 0, a; a = inDefinition.ancestry[i]; i++) {
            baseTag = a.is && a.tag;
        }
        inDefinition.tag = baseTag || inDefinition.name;
        if (baseTag) {
            inDefinition.is = inDefinition.name;
        }
    }
    function resolvePrototypeChain(inDefinition) {
        if (!Object.__proto__) {
            if (inDefinition.is) {
                var inst = document.createElement(inDefinition.tag);
                var native = Object.getPrototypeOf(inst);
            } else {
                native = HTMLElement.prototype;
            }
        }
        inDefinition.native = native;
    }
    function instantiate(inDefinition) {
        return upgrade(domCreateElement(inDefinition.tag), inDefinition);
    }
    function upgrade(inElement, inDefinition) {
        implement(inElement, inDefinition);
        if (inDefinition.is) {
            inElement.setAttribute("is", inDefinition.is);
        }
        inElement.__upgraded__ = true;
        upgradeElements(inElement);
        lifecycle(inElement, inDefinition);
        return inElement;
    }
    function implement(inElement, inDefinition) {
        if (Object.__proto__) {
            inElement.__proto__ = inDefinition.prototype;
        } else {
            customMixin(inElement, inDefinition.prototype, inDefinition.native);
            inElement.__proto__ = inDefinition.prototype;
        }
    }
    function customMixin(inTarget, inSrc, inNative) {
        var used = {};
        var p = inSrc;
        while (p !== inNative && p !== HTMLUnknownElement.prototype) {
            var keys = Object.getOwnPropertyNames(p);
            for (var i = 0, k; k = keys[i]; i++) {
                if (!used[k]) {
                    Object.defineProperty(inTarget, k, Object.getOwnPropertyDescriptor(p, k));
                    used[k] = 1;
                }
            }
            p = Object.getPrototypeOf(p);
        }
    }
    function lifecycle(inElement, inDefinition) {
        listenInsertRemove(inElement, inDefinition);
        listenAttributes(inElement, inDefinition);
        callback("readyCallback", inDefinition, inElement);
    }
    var MO = window.MutationObserver || window.WebKitMutationObserver || window.JsMutationObserver;
    if (!MO) {
        console.warn("no mutation observer support");
    }
    function listenAttributes(inElement, inDefinition) {
        if (MO) {
            var observer = new MO(function(mutations) {
                mutations.forEach(function(mx) {
                    if (mx.type === "attributes") {
                        callback("attributeChangedCallback", inDefinition, inElement, [ mx.attributeName, mx.oldValue ]);
                    }
                });
            });
            if (window.ShadowDOMPolyfill && inElement.impl) {
                inElement = ShadowDOMPolyfill.unwrap(inElement);
            }
            observer.observe(inElement, {
                attributes: true,
                attributeOldValue: true
            });
        }
        return observer;
    }
    function listenInsertRemove(inElement, inDefinition) {
        var listen = function(inType, inCallbackName) {
            inElement.addEventListener(inType, function(inEvent) {
                if (inEvent.target === inElement) {
                    inEvent.stopPropagation();
                    callback(inCallbackName, inDefinition, inElement);
                }
            }, false);
        };
        listen("DOMNodeInserted", "insertedCallback");
        listen("DOMNodeRemoved", "removedCallback");
    }
    var emptyArgs = [];
    function callback(inName, inDefinition, inElement, inArgs) {
        var cb = inDefinition.lifecycle[inName] || inElement[inName];
        if (cb) {
            cb.apply(inElement, inArgs || emptyArgs);
        }
    }
    var registry = {};
    var registrySlctr = "";
    function registerDefinition(inName, inDefinition) {
        registry[inName] = inDefinition;
        registrySlctr += registrySlctr ? "," : "";
        if (inDefinition.extends) {
            registrySlctr += inDefinition.tag + "[is=" + inDefinition.is + "],";
        }
        registrySlctr += inName;
    }
    function generateConstructor(inDefinition) {
        return function() {
            return instantiate(inDefinition);
        };
    }
    function createElement(inTag) {
        var definition = registry[inTag];
        if (definition) {
            return new definition.ctor();
        }
        return domCreateElement(inTag);
    }
    function upgradeElement(inElement) {
        if (!inElement.__upgraded__ && inElement.nodeType === Node.ELEMENT_NODE) {
            var type = inElement.getAttribute("is") || inElement.localName;
            var definition = registry[type];
            return definition && upgrade(inElement, definition);
        }
    }
    function upgradeElements(inRoot, inSlctr) {
        var root = inRoot || document;
        if (root.querySelectorAll) {
            var slctr = inSlctr || registrySlctr;
            if (slctr) {
                var nodes = root.querySelectorAll(slctr);
                forEach(nodes, upgradeElement);
            }
        }
    }
    var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
    function watchDOM(inRoot) {
        domObserver.observe(inRoot, {
            childList: true,
            subtree: true
        });
    }
    var domCreateElement = document.createElement.bind(document);
    document.register = document.webkitRegister || document.register;
    if (!document.register || scope.flags.register !== "native") {
        if (MO) {
            var domObserver = new MO(function(mutations) {
                mutations.forEach(function(mx) {
                    if (mx.type == "childList") {
                        forEach(mx.addedNodes, function(n) {
                            if (!upgradeElement(n)) {
                                upgradeElements(n);
                            }
                        });
                    }
                });
            });
        }
        document.register = register;
        document.createElement = createElement;
        document.upgradeElement = upgradeElement;
        document.upgradeElements = upgradeElements;
        document.watchDOM = watchDOM;
    } else {
        var nop = function() {};
        document.upgradeElement = nop;
        document.upgradeElements = nop;
        document.watchDOM = nop;
    }
})(window.CustomElements);

(function() {
    var HTMLElementElement = function(inElement) {
        inElement.register = HTMLElementElement.prototype.register;
        parseElementElement(inElement);
        return inElement;
    };
    HTMLElementElement.prototype = {
        register: function(inMore) {
            if (inMore) {
                this.options.lifecycle = inMore.lifecycle;
                if (inMore.prototype) {
                    mixin(this.options.prototype, inMore.prototype);
                }
            }
        }
    };
    function parseElementElement(inElement) {
        var options = {
            name: "",
            "extends": null
        };
        takeAttributes(inElement, options);
        var base = HTMLElement.prototype;
        if (options.extends) {
            var archetype = document.createElement(options.extends);
            base = archetype.__proto__ || Object.getPrototypeOf(archetype);
        }
        options.prototype = Object.create(base);
        inElement.options = options;
        var script = inElement.querySelector("script,scripts");
        if (script) {
            executeComponentScript(script.textContent, inElement, options.name);
        }
        var ctor = document.register(options.name, options);
        inElement.ctor = ctor;
        var refName = inElement.getAttribute("constructor");
        if (refName) {
            window[refName] = ctor;
        }
    }
    function takeAttributes(inElement, inDictionary) {
        for (var n in inDictionary) {
            var a = inElement.attributes[n];
            if (a) {
                inDictionary[n] = a.value;
            }
        }
    }
    function executeComponentScript(inScript, inContext, inName) {
        context = inContext;
        var owner = context.ownerDocument;
        var url = owner._URL || owner.URL;
        var match = url.match(/.*\/([^.]*)[.]?.*$/);
        if (match) {
            var name = match[1];
            url += name != inName ? ":" + inName : "";
        }
        var code = "__componentScript('" + inName + "', function(){" + inScript + "});" + "\n//@ sourceURL=" + url + "\n";
        eval(code);
    }
    var context;
    window.__componentScript = function(inName, inFunc) {
        inFunc.call(context);
    };
    function mixin(inObj) {
        var obj = inObj || {};
        for (var i = 1; i < arguments.length; i++) {
            var p = arguments[i];
            try {
                for (var n in p) {
                    copyProperty(n, p, obj);
                }
            } catch (x) {}
        }
        return obj;
    }
    function copyProperty(inName, inSource, inTarget) {
        var pd = getPropertyDescriptor(inSource, inName);
        Object.defineProperty(inTarget, inName, pd);
    }
    function getPropertyDescriptor(inObject, inName) {
        if (inObject) {
            var pd = Object.getOwnPropertyDescriptor(inObject, inName);
            return pd || getPropertyDescriptor(Object.getPrototypeOf(inObject), inName);
        }
    }
    window.HTMLElementElement = HTMLElementElement;
    window.mixin = mixin;
})();