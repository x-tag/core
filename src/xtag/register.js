register: function (name, options) {
  var _name;
  if (typeof name == 'string') {
    _name = name.toLowerCase();
  } else {
    return;
  }
  xtag.tags[_name] = options || {};
  // save prototype for actual object creation below
  var basePrototype = options.prototype;
  delete options.prototype;
  var tag = xtag.tags[_name].compiled = applyMixins(xtag.merge({}, xtag.defaultOptions, options));

  for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
  for (z in tag.lifecycle) tag.lifecycle[z.split(':')[0]] = xtag.applyPseudos(z, tag.lifecycle[z], tag.pseudos, tag.lifecycle[z]);
  for (z in tag.methods) tag.prototype[z.split(':')[0]] = { value: xtag.applyPseudos(z, tag.methods[z], tag.pseudos, tag.methods[z]), enumerable: true };
  for (z in tag.accessors) parseAccessor(tag, z);

  var shadow = tag.shadow ? xtag.createFragment(tag.shadow) : null;

  var ready = tag.lifecycle.created || tag.lifecycle.ready;
  tag.prototype.createdCallback = {
    enumerable: true,
    value: function(){
      var element = this;
      if (shadow && this.createShadowRoot) {
        var root = this.createShadowRoot();
        root.appendChild(shadow.cloneNode(true));
      }
      xtag.addEvents(this, tag.events);
      var output = ready ? ready.apply(this, arguments) : null;
      for (var name in tag.attributes) {
        var attr = tag.attributes[name],
            hasAttr = this.hasAttribute(name);
        if (hasAttr || attr.boolean) {
          this[attr.key] = attr.boolean ? hasAttr : this.getAttribute(name);
        }
      }
      tag.pseudos.forEach(function(obj){
        obj.onAdd.call(element, obj);
      });
      return output;
    }
  };

  var inserted = tag.lifecycle.inserted,
      removed = tag.lifecycle.removed;
  if (inserted || removed) {
    tag.prototype.attachedCallback = { value: function(){
      if (removed) this.xtag.__parentNode__ = this.parentNode;
      if (inserted) return inserted.apply(this, arguments);
    }, enumerable: true };
  }
  if (removed) {
    tag.prototype.detachedCallback = { value: function(){
      var args = toArray(arguments);
      args.unshift(this.xtag.__parentNode__);
      var output = removed.apply(this, args);
      delete this.xtag.__parentNode__;
      return output;
    }, enumerable: true };
  }
  if (tag.lifecycle.attributeChanged) tag.prototype.attributeChangedCallback = { value: tag.lifecycle.attributeChanged, enumerable: true };

  var setAttribute = tag.prototype.setAttribute || HTMLElement.prototype.setAttribute;
  tag.prototype.setAttribute = {
    writable: true,
    enumberable: true,
    value: function (name, value){
      var attr = tag.attributes[name.toLowerCase()];
      if (!this.xtag._skipAttr) setAttribute.call(this, name, attr && attr.boolean ? '' : value);
      if (attr) {
        if (attr.setter && !this.xtag._skipSet) {
          this.xtag._skipAttr = true;
          attr.setter.call(this, attr.boolean ? true : value);
        }
        value = attr.skip ? attr.boolean ? this.hasAttribute(name) : this.getAttribute(name) : value;
        syncAttr(this, attr, name, attr.boolean ? '' : value, 'setAttribute');
      }
      delete this.xtag._skipAttr;
    }
  };

  var removeAttribute = tag.prototype.removeAttribute || HTMLElement.prototype.removeAttribute;
  tag.prototype.removeAttribute = {
    writable: true,
    enumberable: true,
    value: function (name){
      var attr = tag.attributes[name.toLowerCase()];
      if (!this.xtag._skipAttr) removeAttribute.call(this, name);
      if (attr) {
        if (attr.setter && !this.xtag._skipSet) {
          this.xtag._skipAttr = true;
          attr.setter.call(this, attr.boolean ? false : undefined);
        }
        syncAttr(this, attr, name, undefined, 'removeAttribute');
      }
      delete this.xtag._skipAttr;
    }
  };

  var elementProto = basePrototype ?
        basePrototype :
        options['extends'] ?
        Object.create(doc.createElement(options['extends']).constructor).prototype :
        win.HTMLElement.prototype;

  var definition = {
    'prototype': Object.create(elementProto, tag.prototype)
  };
  if (options['extends']) {
    definition['extends'] = options['extends'];
  }
  var reg = doc.registerElement(_name, definition);
  fireReady(_name);
  return reg;
}
