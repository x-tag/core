
xtag.extensions.src = {
  mixin: (base) => class extends base {
    set 'src::attr' (val){
      var xhr = new XMLHttpRequest();
      xhr.open('GET', val, true);
      xhr.onload = () => xtag.fireEvent(this, 'load', { detail: xhr.response });
      xhr.onerror = () => xtag.fireEvent(this, 'error', { detail: xhr.response });
      xhr.send(null);
    }
  }
};