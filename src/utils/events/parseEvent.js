parseEvent: function(type, fn) {
  var pseudos = type.split(':'),
      key = pseudos.shift(),
      custom = xtag.customEvents[key],
      event = xtag.merge({
        type: key,
        stack: noop,
        condition: trueop,
        attach: [],
        _attach: [],
        pseudos: '',
        _pseudos: [],
        onAdd: noop,
        onRemove: noop
      }, custom || {});
  event.attach = toArray(event.base || event.attach);
  event.chain = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
  var condition = event.condition;
  event.condition = function(e){
    var t = e.touches, tt = e.targetTouches;
    return condition.apply(this, arguments);
  };
  var stack = xtag.applyPseudos(event.chain, fn, event._pseudos, event);
  event.stack = function(e){
    e.currentTarget = e.currentTarget || this;
    var t = e.touches, tt = e.targetTouches;
    var detail = e.detail || {};
    if (!detail.__stack__) return stack.apply(this, arguments);
    else if (detail.__stack__ == stack) {
      e.stopPropagation();
      e.cancelBubble = true;
      return stack.apply(this, arguments);
    }
  };
  event.listener = function(e){
    var args = toArray(arguments),
        output = event.condition.apply(this, args.concat([event]));
    if (!output) return output;
    // The second condition in this IF is to address the following Blink regression: https://code.google.com/p/chromium/issues/detail?id=367537
    // Remove this when affected browser builds with this regression fall below 5% marketshare
    if (e.type != key && (e.baseEvent && e.type != e.baseEvent.type)) {
      xtag.fireEvent(e.target, key, {
        baseEvent: e,
        detail: output !== true && (output.__stack__ = stack) ? output : { __stack__: stack }
      });
    }
    else return event.stack.apply(this, args);
  };
  event.attach.forEach(function(name) {
    event._attach.push(xtag.parseEvent(name, event.listener));
  });
  if (custom && custom.observe && !custom.__observing__) {
    custom.observer = function(e){
      var output = event.condition.apply(this, toArray(arguments).concat([custom]));
      if (!output) return output;
      xtag.fireEvent(e.target, key, {
        baseEvent: e,
        detail: output !== true ? output : {}
      });
    };
    for (var z in custom.observe) xtag.addEvent(custom.observe[z] || document, z, custom.observer, true);
    custom.__observing__ = true;
  }
  return event;
},
