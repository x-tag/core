skipTransition: function(element, fn, bind){
  var prop = xtag.prefix.js + 'TransitionProperty';
  element.style[prop] = element.style.transitionProperty = 'none';
  var callback = fn ? fn.call(bind) : null;
  return xtag.requestFrame(function(){
    xtag.requestFrame(function(){
      element.style[prop] = element.style.transitionProperty = '';
      if (callback) xtag.requestFrame(callback);
    });
  });
},
