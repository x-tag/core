requestFrame: (function(){
  var raf = win.requestAnimationFrame ||
            win[xtag.prefix.lowercase + 'RequestAnimationFrame'] ||
            function(fn){ return win.setTimeout(fn, 20); };
  return function(fn){ return raf(fn); };
})(),
