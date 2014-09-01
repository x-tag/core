addClass: function (element, klass) {
  var list = element.className.trim().split(' ');
  klass.trim().split(' ').forEach(function (name) {
    if (!~list.indexOf(name)) list.push(name);
  });
  element.className = list.join(' ').trim();
  return element;
},
