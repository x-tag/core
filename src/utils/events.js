customEvents: {
  overflow: createFlowEvent('over'),
  underflow: createFlowEvent('under'),
  animationstart: {
    attach: [xtag.prefix.dom + 'AnimationStart']
  },
  animationend: {
    attach: [xtag.prefix.dom + 'AnimationEnd']
  },
  transitionend: {
    attach: [xtag.prefix.dom + 'TransitionEnd']
  },
  move: {
    attach: ['mousemove', 'touchmove'],
    condition: touchFilter
  },
  enter: {
    attach: ['mouseover', 'touchenter'],
    condition: touchFilter
  },
  leave: {
    attach: ['mouseout', 'touchleave'],
    condition: touchFilter
  },
  scrollwheel: {
    attach: ['DOMMouseScroll', 'mousewheel'],
    condition: function(event){
      event.delta = event.wheelDelta ? event.wheelDelta / 40 : Math.round(event.detail / 3.5 * -1);
      return true;
    }
  },
  tapstart: {
    observe: {
      mousedown: doc,
      touchstart: doc
    },
    condition: touchFilter
  },
  tapend: {
    observe: {
      mouseup: doc,
      touchend: doc
    },
    condition: touchFilter
  },
  tapmove: {
    attach: ['tapstart', 'dragend', 'touchcancel'],
    condition: function(event, custom){
      switch (event.type) {
        case 'move':  return true;
        case 'dragover':
          var last = custom.lastDrag || {};
          custom.lastDrag = event;
          return (last.pageX != event.pageX && last.pageY != event.pageY) || null;
        case 'tapstart':
          if (!custom.move) {
            custom.current = this;
            custom.move = xtag.addEvents(this, {
              move: custom.listener,
              dragover: custom.listener
            });
            custom.tapend = xtag.addEvent(doc, 'tapend', custom.listener);
          }
          break;
        case 'tapend': case 'dragend': case 'touchcancel':
          if (!event.touches.length) {
            if (custom.move) xtag.removeEvents(custom.current , custom.move || {});
            if (custom.tapend) xtag.removeEvent(doc, custom.tapend || {});
            delete custom.lastDrag;
            delete custom.current;
            delete custom.tapend;
            delete custom.move;
          }
      }
    }
  }
},



/*** Universal Touch ***/

var touching = false,
    touchTarget = null;

doc.addEventListener('mousedown', function(e){
  touching = true;
  touchTarget = e.target;
}, true);

doc.addEventListener('mouseup', function(){
  touching = false;
  touchTarget = null;
}, true);

doc.addEventListener('dragend', function(){
  touching = false;
  touchTarget = null;
}, true);

var UIEventProto = {
  touches: {
    configurable: true,
    get: function(){
      return this.__touches__ ||
        (this.identifier = 0) ||
        (this.__touches__ = touching ? [this] : []);
    }
  },
  targetTouches: {
    configurable: true,
    get: function(){
      return this.__targetTouches__ || (this.__targetTouches__ =
        (touching && this.currentTarget &&
        (this.currentTarget == touchTarget ||
        (this.currentTarget.contains && this.currentTarget.contains(touchTarget)))) ? (this.identifier = 0) || [this] : []);
    }
  },
  changedTouches: {
    configurable: true,
    get: function(){
      return this.__changedTouches__ || (this.identifier = 0) || (this.__changedTouches__ = [this]);
    }
  }
};

for (z in UIEventProto){
  UIEvent.prototype[z] = UIEventProto[z];
  Object.defineProperty(UIEvent.prototype, z, UIEventProto[z]);
}


/*** Custom Event Definitions ***/

  function addTap(el, tap, e){
    if (!el.__tap__) {
      el.__tap__ = { click: e.type == 'mousedown' };
      if (el.__tap__.click) el.addEventListener('click', tap.observer);
      else {
        el.__tap__.scroll = tap.observer.bind(el);
        window.addEventListener('scroll', el.__tap__.scroll, true);
        el.addEventListener('touchmove', tap.observer);
        el.addEventListener('touchcancel', tap.observer);
        el.addEventListener('touchend', tap.observer);
      }
    }
    if (!el.__tap__.click) {
      el.__tap__.x = e.touches[0].pageX;
      el.__tap__.y = e.touches[0].pageY;
    }
  }

  function removeTap(el, tap){
    if (el.__tap__) {
      if (el.__tap__.click) el.removeEventListener('click', tap.observer);
      else {
        window.removeEventListener('scroll', el.__tap__.scroll, true);
        el.removeEventListener('touchmove', tap.observer);
        el.removeEventListener('touchcancel', tap.observer);
        el.removeEventListener('touchend', tap.observer);
      }
      delete el.__tap__;
    }
  }

  function checkTapPosition(el, tap, e){
    var touch = e.changedTouches[0],
        tol = tap.gesture.tolerance;
    if (
      touch.pageX < el.__tap__.x + tol &&
      touch.pageX > el.__tap__.x - tol &&
      touch.pageY < el.__tap__.y + tol &&
      touch.pageY > el.__tap__.y - tol
    ) return true;
  }

  xtag.customEvents.tap = {
    observe: {
      mousedown: document,
      touchstart: document
    },
    gesture: {
      tolerance: 8
    },
    condition: function(e, tap){
      var el = e.target;
      switch (e.type) {
        case 'touchstart':
          if (el.__tap__ && el.__tap__.click) removeTap(el, tap);
          addTap(el, tap, e);
          return;
        case 'mousedown':
          if (!el.__tap__) addTap(el, tap, e);
          return;
        case 'scroll':
        case 'touchcancel':
          removeTap(this, tap);
          return;
        case 'touchmove':
        case 'touchend':
          if (this.__tap__ && !checkTapPosition(this, tap, e)) {
            removeTap(this, tap);
            return;
          }
          return e.type == 'touchend' || null;
        case 'click':
          removeTap(this, tap);
          return true;
      }
    }
  };
