
(function(){

var count = 0;

defineTestElement = function(klass){
  var name = 'test-' + ++count;
  document.body.appendChild(document.createElement(name));
  xtag.register(name, klass);
  return name;
}

})();