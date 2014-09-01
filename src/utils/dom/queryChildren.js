/*
  Runs a query on only the children of an element
*/
queryChildren: function (element, selector) {
  var id = element.id,
    guid = element.id = id || 'x_' + xtag.uid(),
    attr = '#' + guid + ' > ',
    noParent = false;
  if (!element.parentNode){
    noParent = true;
    container.appendChild(element);
  }
  selector = attr + (selector + '').replace(',', ',' + attr, 'g');
  var result = element.parentNode.querySelectorAll(selector);
  if (!id) element.removeAttribute('id');
  if (noParent){
    container.removeChild(element);
  }
  return toArray(result);
},
