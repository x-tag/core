removeEvent: function (element, type, event) {
  event = event || type;
  event.onRemove.call(element, event, event.listener);
  xtag.removePseudos(element, event._pseudos);
  event._attach.forEach(function(obj) {
    xtag.removeEvent(element, obj);
  });
  element.removeEventListener(event.type, event.stack);
},
