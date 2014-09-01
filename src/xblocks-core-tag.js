// We don't use the platform bootstrapper, so fake this stuff.

window.Platform = {};
var logFlags = {};

(function() {
    /*! borschik:include:../node_modules/dom-token-list-polyfill/src/token-list.js */
}());

(function() {
    /*! borschik:include:../node_modules/WeakMap/weakmap.js */
}());

(function() {
    /*! borschik:include:../node_modules/MutationObservers/MutationObserver.js */
}());

(function() {
    /*! borschik:include:../node_modules/CustomElements/src/scope.js */
    /*! borschik:include:../node_modules/CustomElements/src/Observer.js */
    /*! borschik:include:../node_modules/CustomElements/src/CustomElements.js */
    /*! borschik:include:../node_modules/CustomElements/src/Parser.js */
    /*! borschik:include:../node_modules/CustomElements/src/boot.js */
}());

(function() {
    /*! borschik:include:../node_modules/HTMLImports/src/scope.js */
    /*! borschik:include:../node_modules/HTMLImports/src/Loader.js */
    /*! borschik:include:../node_modules/HTMLImports/src/Parser.js */
    /*! borschik:include:../node_modules/HTMLImports/src/HTMLImports.js */
    /*! borschik:include:../node_modules/HTMLImports/src/Observer.js */
    /*! borschik:include:../node_modules/HTMLImports/src/boot.js */
}());

(function(global, undefined) {
    'use strict';

    

    /**
     * @namespace xtag
     */
    var xtag = global.xtag = {
        'tags': {},

        'defaultOptions': {
            'pseudos': [],
            'mixins': [],
            'events': {},
            'methods': {},
            'accessors': {},
            'lifecycle': {},
            'attributes': {},
            'prototype': {
                'xtag': {
                    get: function() {
                        return this.__xtag__ ? this.__xtag__ : (this.__xtag__ = { data: {} });
                    }
                }
            }
        },

        'mixins': {},

        'captureEvents': [ 'focus', 'blur', 'scroll', 'underflow', 'overflow', 'overflowchanged', 'DOMMouseScroll' ]
    };




    /*! borschik:include:utils/uid.js */
    /*! borschik:include:utils/prefix.js */
    /*! borschik:include:utils/typeOf.js */
    /*! borschik:include:utils/clone.js */
    /*! borschik:include:utils/toArray.js */

    /*! borschik:include:utils/dom/query.js */
    /*! borschik:include:utils/dom/parseMutations.js */

    /*! borschik:include:core.js */


    global.document.addEventListener('WebComponentsReady', function() {
        xtag.fireEvent(global.document.body, 'DOMComponentsLoaded');
    });

}(function() {
    return this || (1, eval)('this');
}()));
