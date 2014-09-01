pseudos: {
  __mixin__: {},
  /*


  */
  mixins: {
    onCompiled: function(fn, pseudo){
      var mixins = pseudo.source.__mixins__;
      if (mixins) switch (pseudo.value) {
        case 'before': return function(){
          var self = this,
              args = arguments;
          mixins.forEach(function(m){
            m.apply(self, args);
          });
          return fn.apply(self, args);
        };
        case null: case '': case 'after': return function(){
          var self = this,
              args = arguments;
              returns = fn.apply(self, args);
          mixins.forEach(function(m){
            m.apply(self, args);
          });
          return returns;
        };
      }
    }
  },
  keypass: keypseudo,
  keyfail: keypseudo,
  delegate: { action: delegateAction },
  within: {
    action: delegateAction,
    onAdd: function(pseudo){
      var condition = pseudo.source.condition;
      if (condition) pseudo.source.condition = function(event, custom){
        return xtag.query(this, pseudo.value).filter(function(node){
          return node == event.target || node.contains ? node.contains(event.target) : null;
        })[0] ? condition.call(this, event, custom) : null;
      };
    }
  },
  preventable: {
    action: function (pseudo, event) {
      return !event.defaultPrevented;
    }
  }
},
