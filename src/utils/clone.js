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
