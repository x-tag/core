set: function (element, method, value) {
  element[method] = value;
  if (window.CustomElements) CustomElements.upgradeAll(element);
},
