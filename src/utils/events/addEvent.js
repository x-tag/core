addEvent: function (element, type, fn, capture) {
  var event = typeof fn == 'function' ? xtag.parseEvent(type, fn) : fn;
  event._pseudos.forEach(function(obj){
    obj.onAdd.call(element, obj);
  });
  event._attach.forEach(function(obj) {
    xtag.addEvent(element, obj.type, obj);
  });
  event.onAdd.call(element, event, event.listener);
  element.addEventListener(event.type, event.stack, capture || xtag.captureEvents.indexOf(event.type) > -1);
  return event;
},
