
(function(){

xtag.extensions.hyper = {
  mixin: (base) => class extends base {
    _render (template, queued){
      if (template._hyper) {
        template.call(this, hyperHTML.bind);
        this._XTagRender = null;
        if (queued.resolve) queued.resolve(this);
      }
      else super._render(template, queued);
    }
  },
  onParse (klass, property, args, descriptor){
    descriptor.value._hyper = true;
    klass.getOptions('templates')[property || 'default'] = descriptor.value;
    return false;
  },
  onReady (node, resolve, property, args){
    if (args[0]) {
      if (args[0] === 'ready') node.render(property);
      else node.rxn('firstpaint', () => node.render(property));
    }
    resolve();
  },
}

})();