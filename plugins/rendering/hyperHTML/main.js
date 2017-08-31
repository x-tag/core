
(function(){

xtag.extensions.hyper = {
  mixin: (base) => class extends base {
    set 'hyper::attr' (name){
      this.render(name);
    }
    render (name){
      var _name = name || 'default';
      var template = this.constructor.getOptions('hyper')[_name];
      if (template) template.call(this,
        (this._hyper || (this._hyper = {}))[_name] || (this._hyper[_name] = hyperHTML.bind(this))
      );
      else throw new ReferenceError('hyperHTML template "' + _name + '" is undefined');
    }
  },
  onParse (klass, property, args, descriptor){
    klass.getOptions('hyper')[property || 'default'] = descriptor.value;
    return false;
  },
  onConstruct (node, property, args){
    if (JSON.parse(args[0] || false)) node.render(property)
  }
}

})();