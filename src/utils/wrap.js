wrap: function (original, fn) {
  return function(){
    var args = arguments,
        output = original.apply(this, args);
    fn.apply(this, args);
    return output;
  };
},
