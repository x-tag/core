/*
  - The prefix object generated here is added to the xtag object as xtag.prefix later in the code
  - Prefix provides a variety of prefix variations for the browser in which your code is running
  - The 4 variations of prefix are as follows:
    * prefix.dom: the correct prefix case and form when used on DOM elements/style properties
    * prefix.lowercase: a lowercase version of the prefix for use in various user-code situations
    * prefix.css: the lowercase, dashed version of the prefix
    * prefix.js: addresses prefixed APIs present in global and non-Element contexts
*/

xtag.prefix = (function() {

    var styles = global.getComputedStyle(global.document.documentElement, '');
    var pre = Array.prototype.slice.call(styles).join('').match(/-(moz|webkit|ms)-/);
    pre = ( pre || (styles.OLink === '' && [ '', 'o' ]) )[1];

    return {
        'dom': (pre === 'ms' ? 'MS' : pre),
        'lowercase': pre,
        'css': '-' + pre + '-',
        'js': (pre === 'ms' ? pre : pre[0].toUpperCase() + pre.substr(1))
    };

}());
