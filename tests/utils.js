
(function(){

var count = 1;

defineTestElement = function(klass){
  xtag.register('test-' + count++, klass);
  
}

})();