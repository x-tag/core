/*
  NEEDS MORE TESTING!

  Allows for async dependency resolution, fires when all passed-in elements are
  registered and parsed
*/
ready: function(names, fn){
  var obj = { tags: toArray(names), fn: fn };
  if (obj.tags.reduce(function(last, name){
    if (xtag.tags[name]) return last;
    (readyTags[name] = readyTags[name] || []).push(obj);
  }, true)) fn();
},
