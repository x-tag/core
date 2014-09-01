matchSelector = Element.prototype.matchesSelector || Element.prototype[xtag.prefix.lowercase + 'MatchesSelector'],

matchSelector: function (element, selector) {
  return matchSelector.call(element, selector);
},
