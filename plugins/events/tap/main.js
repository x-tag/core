
xtag.events.tap = {
  attach: ['pointerdown', 'pointerup'],
  onFilter (node, event, ref, resolve){
    var data = ref.data;
    if (event.type == 'pointerdown') {
      data.startX = event.clientX;
      data.startY = event.clientY;
    }
    else if (event.button === 0 &&
             Math.abs(data.startX - event.clientX) < 10 &&
             Math.abs(data.startY - event.clientY) < 10) resolve();
  }
};