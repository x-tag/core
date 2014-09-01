function writeProperty(key, event, base, desc){
  if (desc) event[key] = base[key];
  else Object.defineProperty(event, key, {
    writable: true,
    enumerable: true,
    value: base[key]
  });
}

var skipProps = {};
for (var z in doc.createEvent('CustomEvent')) skipProps[z] = 1;
function inheritEvent(event, base){
  var desc = Object.getOwnPropertyDescriptor(event, 'target');
  for (var z in base) {
    if (!skipProps[z]) writeProperty(z, event, base, desc);
  }
  event.baseEvent = base;
}


fireEvent: function(element, type, options, warn) {
    var event = doc.createEvent('CustomEvent');
    options = options || {};

    if (warn) {
        console.warn('fireEvent has been modified');
    }

    event.initCustomEvent(type,
        options.bubbles !== false,
        options.cancelable !== false,
        options.detail
    );

    if (options.baseEvent) {
        inheritEvent(event, options.baseEvent);
    }

    try {
        element.dispatchEvent(event);
    } catch (e) {
        console.warn('This error may have been caused by a change in the fireEvent method', e);
    }
};
