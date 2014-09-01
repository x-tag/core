/*
  The toArray() method allows for conversion of any object to a true array. For types that
  cannot be converted to an array, the method returns a 1 item array containing the passed-in object.
*/
var unsliceable = ['undefined', 'null', 'number', 'boolean', 'string', 'function'];

xtag.toArray = function toArray(obj) {
  return unsliceable.indexOf(typeOf(obj)) == -1 ?
  Array.prototype.slice.call(obj, 0) :
  [obj];
};
