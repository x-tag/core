removeClass: function (element, klass) {
  var classes = klass.trim().split(' ');
  element.className = element.className.trim().split(' ').filter(function (name) {
    return name && !~classes.indexOf(name);
  }).join(' ');
  return element;
},
