/*
  Recursively merges one object with another. The first argument is the destination object,
  all other objects passed in as arguments are merged from right to left, conflicts are overwritten
*/
merge: function(source, k, v){
  if (typeOf(k) == 'string') return mergeOne(source, k, v);
  for (var i = 1, l = arguments.length; i < l; i++){
    var object = arguments[i];
    for (var key in object) mergeOne(source, key, object[key]);
  }
  return source;
},
