
(function(){
  
  var types = ['cover', 'slider'],
      template = '<div class="x-switch-cover x-switch-off-background">' +
        '<div class="x-switch-knob x-switch-rounded"></div>' +
        '<div class="x-switch-on x-switch-on-background x-switch-rounded">' +
          '<div>' +
            '<label>' +
              '<div class="x-switch-on-text">On</div>' +
              '<div class="x-switch-off-text">Off</div>' +
            '</label>' +
            '<div><div class="x-switch-knob x-switch-rounded"></div></div>' +
          '</div>' +
        '</div>' +
        '<div class="x-switch-off x-switch-off-background x-switch-rounded">' +
          '<div>' +
            '<div><div class="x-switch-knob x-switch-rounded"></div></div>' +
            '<label>' +
              '<div class="x-switch-off-text">Off</div>' +
              '<div class="x-switch-on-text">On</div>' +
            '</label>' +
          '</div>' +
        '</div>' +
      '</div><input type="checkbox" />';

  function textSetter(state){
    var obj = {
      get: function(){
        return this.getAttribute(state + 'text') || state;
      }
    };
    obj['set:attribute(' + state + 'text)'] = function(text){
      xtag.query(this, '.x-switch-' + state + '-text').forEach(function(el){
        el.textContent = text;
      });
    }
    return obj;
  }
  
  xtag.register('x-switch', {
    lifecycle: {
      created: function(){
        this.innerHTML = template;
        this.type = this.type;
        this.onText = this.onText;
        this.offText = this.offText;
        this.toggle(this.state || 'off');
      }
    },
    methods: {
      toggle: function(state){
        this.state = state || this.state == 'on' ? 'off' : 'on';
      }
    },
    events:{
      'change': function(e){
        e.target.focus();
        this.toggle();
      }
    },
    accessors: {
      onText: textSetter('on'),
      offText: textSetter('off'),
      type: {
        get: function(){
          return this.getAttribute('type') || 'cover';
        },
        set: function(type){
          var _type = types.indexOf(type) > -1 ? type : 'cover';
          this.setAttribute('type', _type);
          this.firstElementChild.className = ('x-switch-' + _type);
        } 
      },
      state: {
        get: function(){
          return this.getAttribute('state') || 'off';
        },
        'set:attribute': function(state){
          state = state == 'on' ? 'on' : 'off';
          this.setAttribute('state', state, true);
          this.firstElementChild.className = 'x-switch-' + this.type + ' x-switch-' + (state == 'on' ? 'off' : 'on') + '-background';
        } 
      },
    }
  });

})();