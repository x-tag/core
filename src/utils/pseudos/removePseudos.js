removePseudos: function(target, pseudos){
  pseudos.forEach(function(obj){
    if (obj.onRemove) obj.onRemove.call(target, obj);
  });
},
