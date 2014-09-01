fireEvent: function(element, type, options, warn){
  var event = doc.createEvent('CustomEvent');
  options = options || {};
  if (warn) console.warn('fireEvent has been modified');
  event.initCustomEvent(type,
    options.bubbles !== false,
    options.cancelable !== false,
    options.detail
  );
  if (options.baseEvent) inheritEvent(event, options.baseEvent);
  try { element.dispatchEvent(event); }
  catch (e) {
    console.warn('This error may have been caused by a change in the fireEvent method', e);
  }
},
