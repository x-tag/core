/*
  Creates a document fragment with the content passed in - content can be
  a string of HTML, an element, or an array/collection of elements
*/
createFragment: function(content) {
  var frag = doc.createDocumentFragment();
  if (content) {
    var div = frag.appendChild(doc.createElement('div')),
      nodes = toArray(content.nodeName ? arguments : !(div.innerHTML = typeof content == 'function' ? parseMultiline(content) : content) || div.children),
      length = nodes.length,
      index = 0;
    while (index < length) frag.insertBefore(nodes[index++], div);
    frag.removeChild(div);
  }
  return frag;
},
