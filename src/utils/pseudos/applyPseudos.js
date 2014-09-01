applyPseudos: function(key, fn, target, source) {
  var listener = fn,
      pseudos = {};
  if (key.match(':')) {
    var split = key.match(regexPseudoSplit),
        i = split.length;
    while (--i) {
      split[i].replace(regexPseudoReplace, function (match, name, value) {
        if (!xtag.pseudos[name]) throw "pseudo not found: " + name + " " + split;
        value = (value === '' || typeof value == 'undefined') ? null : value;
        var pseudo = pseudos[i] = Object.create(xtag.pseudos[name]);
        pseudo.key = key;
        pseudo.name = name;
        pseudo.value = value;
        pseudo['arguments'] = (value || '').split(',');
        pseudo.action = pseudo.action || trueop;
        pseudo.source = source;
        var last = listener;
        listener = function(){
          var args = toArray(arguments),
              obj = {
                key: key,
                name: name,
                value: value,
                source: source,
                'arguments': pseudo['arguments'],
                listener: last
              };
          var output = pseudo.action.apply(this, [obj].concat(args));
          if (output === null || output === false) return output;
          return obj.listener.apply(this, args);
        };
        if (target && pseudo.onAdd) {
          if (target.nodeName) pseudo.onAdd.call(target, pseudo);
          else target.push(pseudo);
        }
      });
    }
  }
  for (var z in pseudos) {
    if (pseudos[z].onCompiled) listener = pseudos[z].onCompiled(listener, pseudos[z]) || listener;
  }
  return listener;
},
