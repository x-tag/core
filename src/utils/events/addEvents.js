addEvents: function (element, obj) {
  var events = {};
  for (var z in obj) {
    events[z] = xtag.addEvent(element, z, obj[z]);
  }
  return events;
},
