/*
  Removes an element from the DOM for more performant node manipulation. The element
  is placed back into the DOM at the place it was taken from.
*/
manipulate: function(element, fn){
  var next = element.nextSibling,
    parent = element.parentNode,
    frag = doc.createDocumentFragment(),
    returned = fn.call(frag.appendChild(element), frag) || element;
  if (next) parent.insertBefore(returned, next);
  else parent.appendChild(returned);
},
