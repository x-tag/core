cancelFrame: (function(){
  var cancel = win.cancelAnimationFrame ||
               win[xtag.prefix.lowercase + 'CancelAnimationFrame'] ||
               win.clearTimeout;
  return function(id){ return cancel(id); };
})(),
