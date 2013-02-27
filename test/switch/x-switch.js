(function(){
  
  var template =  '<input type="checkbox" />' +
  '<div>' +
    '<div class="x-switch-text" ontext="ON" offtext="OFF"></div>' +
    '<div><div class="x-switch-knob"><br/></div></div>' +
    '<div class="x-switch-knob">' +
      '<div class="x-switch-background">' +
        '<div class="x-switch-text x-switch-on" ontext="ON" offtext="OFF"></div>' +
        '<div><div class="x-switch-knob"><br/></div></div>' +
        '<div class="x-switch-text x-switch-off" ontext="ON" offtext="OFF"></div>' +
      '</div>' +
    '</div>' +
  '</div>';

  function textSetter(state){
    var obj = {
      get: function(){
        return this.getAttribute(state + 'text') || state;
      }
    };
    obj['set:attribute(' + state + 'text)'] = function(text){
      xtag.query(this, '[' + state + 'text]').forEach(function(el){
        el.setAttribute(state + 'text', text);
      });
    }
    return obj;
  }
  
  xtag.register('x-switch', {
    lifecycle: {
      created: function(){
        this.innerHTML = template;
        this.onText = this.onText;
        this.offText = this.offText;
        this.checked = this.checked;
      }
    },
    methods: {
      toggle: function(state){
        this.checked = typeof state == 'undefined' ? (this.checked ? false : true) : state;
      }
    },
    events:{
      'change': function(e){
        e.target.focus();
        this.checked = this.checked;
      }
    },
    accessors: {
      onText: textSetter('on'),
      offText: textSetter('off'),
      checked: {
        get: function(){
          return this.firstElementChild.checked;
        },
        'set:attribute': function(state){
          this.firstElementChild.checked = state;
          this.setAttribute('checked', this.firstElementChild.checked, true);
        } 
      },
    }
  });

})();