/*
  This is an enhanced typeof check for all types of objects. Where typeof would normaly return
  'object' for many common DOM objects (like NodeLists and HTMLCollections).
  - For example: typeOf(document.children) will correctly return 'htmlcollection'
*/
var typeCache = {},
    typeString = typeCache.toString,
    typeRegexp = /\s([a-zA-Z]+)/;
function typeOf(obj) {
  var type = typeString.call(obj);
  return typeCache[type] || (typeCache[type] = type.match(typeRegexp)[1].toLowerCase());
}
