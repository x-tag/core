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
