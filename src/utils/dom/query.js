var str = '';
xtag.query = function query(element, selector){
  return (selector || str).length ? toArray(element.querySelectorAll(selector)) : [];
};
