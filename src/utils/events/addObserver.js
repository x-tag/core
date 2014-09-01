/*
  Listens for insertion or removal of nodes from a given element using
  Mutation Observers, or Mutation Events as a fallback
*/
addObserver: function(element, type, fn){
  if (!element._records) {
    element._records = { inserted: [], removed: [] };
    if (mutation){
      element._observer = new mutation(function(mutations) {
        parseMutations(element, mutations);
      });
      element._observer.observe(element, {
        subtree: true,
        childList: true,
        attributes: !true,
        characterData: false
      });
    }
    else ['Inserted', 'Removed'].forEach(function(type){
      element.addEventListener('DOMNode' + type, function(event){
        event._mutation = true;
        element._records[type.toLowerCase()].forEach(function(fn){
          fn(event.target, event);
        });
      }, false);
    });
  }
  if (element._records[type].indexOf(fn) == -1) element._records[type].push(fn);
},
