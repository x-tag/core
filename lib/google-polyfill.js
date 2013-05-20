(function() {
    var scope = window.Loader = {};
    var flags = {};
    if (!flags.noOpts) {
        location.search.slice(1).split("&").forEach(function(o) {
            o = o.split("=");
            o[0] && (flags[o[0]] = o[1] || true);
        });
    }
    parseLogFlags(flags);
    function load(scopeName) {
        var scope = window[scopeName];
        var entryPointName = scope.entryPointName;
        var processFlags = scope.processFlags;
        var entryPoint = findScript(entryPointName);
        var base = entryPoint.basePath;
        var flags = Loader.flags;
        var flags = Loader.flags;
        for (var i = 0, a; a = entryPoint.attributes[i]; i++) {
            if (a.name !== "src") {
                flags[a.name] = a.value || true;
            }
        }
        parseLogFlags(flags);
        scope.basePath = base;
        scope.flags = flags;
        if (processFlags) {
            processFlags.call(scope, flags);
        }
        var modules = scope.modules || [];
        var sheets = scope.sheets || [];
        modules.forEach(function(src) {
            document.write('<script src="' + base + src + '"></script>');
        });
        sheets.forEach(function(src) {
            document.write('<link rel="stylesheet" href="' + base + src + '">');
        });
    }
    function findScript(fileName) {
        var script = document.querySelector('script[src*="' + fileName + '"]');
        var src = script.attributes.src.value;
        script.basePath = src.slice(0, src.indexOf(fileName));
        return script;
    }
    function parseLogFlags(flags) {
        var logFlags = window.logFlags = window.logFlags || {};
        if (flags.log) {
            flags.log.split(",").forEach(function(f) {
                logFlags[f] = true;
            });
        }
    }
    scope.flags = flags;
    scope.load = load;
})();

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
            },
            "delete": function(key) {
                this.set(key, undefined);
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
    if (!scope) {
        scope = window.CustomElements = {
            flags: {}
        };
    }
    scope.hasNative = document.register && scope.flags.register === "native";
    if (scope.hasNative) {
        var nop = function() {};
        document.upgradeElement = nop;
        document.upgradeElements = nop;
        document.watchDOM = nop;
        scope.bootInsertions = nop;
    } else {
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
            definition.prototype.setAttribute = setAttribute;
            definition.prototype.removeAttribute = removeAttribute;
            registerDefinition(inName, definition);
            definition.ctor = generateConstructor(definition);
            definition.ctor.prototype = definition.prototype;
            if (scope.ready) {
                scope.upgradeAll(document);
            }
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
            if (inDefinition.is) {
                inElement.setAttribute("is", inDefinition.is);
            }
            implement(inElement, inDefinition);
            inElement.__upgraded__ = true;
            scope.upgradeSubtree(inElement);
            ready(inElement);
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
        function ready(inElement) {
            if (inElement.readyCallback) {
                inElement.readyCallback();
            }
        }
        var originalSetAttribute = HTMLElement.prototype.setAttribute;
        var originalRemoveAttribute = HTMLElement.prototype.removeAttribute;
        function setAttribute(name, value) {
            changeAttribute.call(this, name, value, originalSetAttribute);
        }
        function removeAttribute(name, value) {
            changeAttribute.call(this, name, value, originalRemoveAttribute);
        }
        function changeAttribute(name, value, operation) {
            var oldValue = this.getAttribute(name);
            operation.apply(this, arguments);
            if (this.attributeChangedCallback && this.getAttribute(name) !== oldValue) {
              this.attributeChangedCallback(name, oldValue);
            }
        }
        var registry = {};
        function registerDefinition(inName, inDefinition) {
            registry[inName] = inDefinition;
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
        var domCreateElement = document.createElement.bind(document);
        document.register = register;
        document.createElement = createElement;
        scope.registry = registry;
        scope.upgrade = upgradeElement;
    }
})(window.CustomElements);

if (!window.MutationObserver) {
    window.MutationObserver = window.WebKitMutationObserver || window.JsMutationObserver;
    if (!MutationObserver) {
        throw new Error("no mutation observer support");
    }
}

(function(scope) {
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
    function forSubtree(node, cb) {
        findAll(node, function(e) {
            if (cb(e)) {
                return true;
            }
            if (e.webkitShadowRoot) {
                forSubtree(e.webkitShadowRoot, cb);
            }
        });
        if (node.webkitShadowRoot) {
            forSubtree(node.webkitShadowRoot, cb);
        }
    }
    function added(node) {
        if (upgrade(node)) {
            insertedNode(node);
            return true;
        }
        inserted(node);
    }
    function addedSubtree(node) {
        forSubtree(node, function(e) {
            if (added(e)) {
                return true;
            }
        });
    }
    function addedNode(node) {
        return added(node) || addedSubtree(node);
    }
    function upgrade(node) {
        if (!node.__upgraded__ && node.nodeType === Node.ELEMENT_NODE) {
            var type = node.getAttribute("is") || node.localName;
            var definition = scope.registry[type];
            if (definition) {
                logFlags.dom && console.group("upgrade:", node.localName);
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
    function inserted(element) {
        if (element.insertedCallback || element.__upgraded__ && logFlags.dom) {
            if (inDocument(element)) {
                element.__inserted = (element.__inserted || 0) + 1;
                if (element.__inserted < 1) {
                    element.__inserted = 1;
                }
                if (element.__inserted > 1) {
                    logFlags.dom && console.warn("inserted:", element.localName, "insert/remove count:", element.__inserted);
                } else if (element.insertedCallback) {
                    logFlags.dom && console.log("inserted:", element.localName);
                    element.insertedCallback();
                }
            }
        }
    }
    function removedNode(node) {
        removed(node);
        forSubtree(node, function(e) {
            removed(e);
        });
    }
    function removed(element) {
        if (element.removedCallback || element.__upgraded__ && logFlags.dom) {
            logFlags.dom && console.log("removed:", element.localName);
            if (!inDocument(element)) {
                element.__inserted = (element.__inserted || 0) - 1;
                if (element.__inserted > 0) {
                    element.__inserted = 0;
                }
                if (element.__inserted < 0) {
                    logFlags.dom && console.warn("removed:", element.localName, "insert/remove count:", element.__inserted);
                } else if (element.removedCallback) {
                    element.removedCallback();
                }
            }
        }
    }
    function inDocument(element) {
        var p = element;
        while (p) {
            if (p == document) {
                return true;
            }
            p = p.parentNode || p.host;
        }
    }
    function watchShadow(node) {
        if (node.webkitShadowRoot && !node.webkitShadowRoot.__watched) {
            logFlags.dom && console.log("watching shadow-root for: ", node.localName);
            observe(node.webkitShadowRoot);
            node.webkitShadowRoot.__watched = true;
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
          case "style":
          case "script":
          case "template":
          case undefined:
            return true;
        }
    }
    function handler(mutations) {
        if (logFlags.dom) {
            var mx = mutations[0];
            if (mx && mx.type === "childList" && mx.addedNodes) {
                if (mx.addedNodes) {
                    var d = mx.addedNodes[0];
                    while (d && d !== document && !d.host) {
                        d = d.parentNode;
                    }
                    var u = d && (d.URL || d._URL || d.host && d.host.localName) || "";
                    u = u.split("/?").shift().split("/").pop();
                }
            }
            console.group("mutations (%d) [%s]", mutations.length, u || "");
        }
        mutations.forEach(function(mx) {
            if (mx.type === "childList") {
                forEach(mx.addedNodes, function(n) {
                    if (filter(n)) {
                        return;
                    }
                    addedNode(n);
                });
                forEach(mx.removedNodes, function(n) {
                    if (filter(n)) {
                        return;
                    }
                    removedNode(n);
                });
            }
        });
        logFlags.dom && console.groupEnd();
    }
    var observer = new MutationObserver(handler);
    function takeRecords() {
        handler(observer.takeRecords());
    }
    var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
    function observe(inRoot) {
        observer.observe(inRoot, {
            childList: true,
            subtree: true
        });
    }
    function observeDocument(document) {
        observe(document);
    }
    function upgradeDocument(document) {
        logFlags.dom && console.group("upgradeDocument: ", (document.URL || document._URL || "").split("/").pop());
        addedNode(document);
        logFlags.dom && console.groupEnd();
    }
    scope.watchShadow = watchShadow;
    scope.watchAllShadows = watchAllShadows;
    scope.upgradeAll = addedNode;
    scope.upgradeSubtree = addedSubtree;
    scope.observeDocument = observeDocument;
    scope.upgradeDocument = upgradeDocument;
    scope.takeRecords = takeRecords;
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
        var url = owner._URL || owner.URL || owner.impl && (owner.impl._URL || owner.impl.URL);
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

(function() {
    var IMPORT_LINK_TYPE = "import";
    var componentParser = {
        selectors: [ "link[rel=" + IMPORT_LINK_TYPE + "]", "link[rel=stylesheet]", "script[src]", "script", "style", "element" ],
        map: {
            link: "parseLink",
            script: "parseScript",
            element: "parseElement",
            style: "parseStyle"
        },
        parse: function(inDocument) {
            if (!inDocument.__parsed) {
                inDocument.__parsed = true;
                var elts = inDocument.querySelectorAll(cp.selectors);
                forEach(elts, function(e) {
                    cp[cp.map[e.localName]](e);
                });
                CustomElements.upgradeDocument(inDocument);
                CustomElements.observeDocument(inDocument);
            }
        },
        parseLink: function(inLinkElt) {
            if (isDocumentLink(inLinkElt)) {
                if (inLinkElt.content) {
                    cp.parse(inLinkElt.content);
                }
            } else if (!inMainDocument(inLinkElt) && inLinkElt.parentNode && !isElementElementChild(inLinkElt)) {
                document.head.appendChild(inLinkElt);
            }
        },
        parseScript: function(inScriptElt) {
            if (inMainDocument(inScriptElt)) {
                return;
            }
            if (isElementElementChild(inScriptElt)) {
                return;
            }
            var code = inScriptElt.__resource || inScriptElt.textContent;
            if (code) {
                code += "\n//@ sourceURL=" + inScriptElt.__nodeUrl + "\n";
                eval.call(window, code);
            }
        },
        parseStyle: function(inStyleElt) {
            if (!inMainDocument(inStyleElt) && !isElementElementChild(inStyleElt)) {
                document.querySelector("head").appendChild(inStyleElt);
            }
        },
        parseElement: function(inElementElt) {
            new HTMLElementElement(inElementElt);
        }
    };
    var cp = componentParser;
    function inMainDocument(inElt) {
        return inElt.ownerDocument === document || inElt.ownerDocument.impl === document;
    }
    function isDocumentLink(inElt) {
        return inElt.localName === "link" && inElt.getAttribute("rel") === IMPORT_LINK_TYPE;
    }
    function isElementElementChild(inElt) {
        if (inElt.parentNode && inElt.parentNode.localName === "element") {
            return true;
        }
    }
    var forEach = Array.prototype.forEach.call.bind(Array.prototype.forEach);
    CustomElements.parser = componentParser;
})();

(function() {
    if (typeof window.CustomEvent !== "function") {
        window.CustomEvent = function(inType) {
            var e = document.createEvent("HTMLEvents");
            e.initEvent(inType, true, true);
            return e;
        };
    }
    function bootstrap() {
        setTimeout(function() {
            CustomElements.parser.parse(document);
            CustomElements.ready = true;
            CustomElements.readyTime = new Date().getTime();
            if (window.HTMLImports) {
                CustomElements.elapsed = CustomElements.readyTime - HTMLImports.readyTime;
            }
            document.body.dispatchEvent(new CustomEvent("WebComponentsReady", {
                bubbles: true
            }));
        }, 0);
    }
    if (window.HTMLImports) {
        document.addEventListener("HTMLImportsLoaded", bootstrap);
    } else {
        window.addEventListener("load", bootstrap);
    }
})();