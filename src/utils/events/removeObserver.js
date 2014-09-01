removeObserver: function(element, type, fn){
  var obj = element._records;
  if (obj && fn){
    obj[type].splice(obj[type].indexOf(fn), 1);
  }
  else{
    obj[type] = [];
  }
}
