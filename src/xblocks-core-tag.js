// We don't use the platform bootstrapper, so fake this stuff.

window.Platform = {};
var logFlags = {};

/*! borschik:include:../node_modules/dom-token-list-polyfill/src/token-list.js */
/*! borschik:include:../node_modules/WeakMap/weakmap.js */
/*! borschik:include:../node_modules/MutationObservers/MutationObserver.js */

/*! borschik:include:../node_modules/CustomElements/src/scope.js */
/*! borschik:include:../node_modules/CustomElements/src/Observer.js */
/*! borschik:include:../node_modules/CustomElements/src/CustomElements.js */
/*! borschik:include:../node_modules/CustomElements/src/Parser.js */
/*! borschik:include:../node_modules/CustomElements/src/boot.js */

/*! borschik:include:../node_modules/HTMLImports/src/scope.js */
/*! borschik:include:../node_modules/HTMLImports/src/Loader.js */
/*! borschik:include:../node_modules/HTMLImports/src/Parser.js */
/*! borschik:include:../node_modules/HTMLImports/src/HTMLImports.js */
/*! borschik:include:../node_modules/HTMLImports/src/Observer.js */
/*! borschik:include:../node_modules/HTMLImports/src/boot.js */


(function(global, undefined) {
    'use strict';

    /*! borschik:include:utils/type.js */
    /*! borschik:include:utils/clone.js */
    /*! borschik:include:utils/toArray.js */

    /*! borschik:include:core.js */

}(function() {
    return this || (1, eval)('this');
}()));
