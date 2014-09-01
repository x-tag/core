var str = '';
function query(element, selector){
  return (selector || str).length ? toArray(element.querySelectorAll(selector)) : [];
}
