


describe("x-tag ", function () {

  it('should load x-tag.js and fire DOMComponentsLoaded', function (){

    var DOMComponentsLoaded = false;
    var WebComponentsReady = false;
    var HTMLImportsLoaded = false;

    document.addEventListener('DOMComponentsLoaded', function (){
      DOMComponentsLoaded = true;
    });

    window.addEventListener('WebComponentsReady', function (){
      alert('READY');
      WebComponentsReady = true;
    });

    window.addEventListener('HTMLImportsLoaded', function (){
      HTMLImportsLoaded = true;
    });

    var xtagLoaded = false,
        core = document.createElement('script');
        core.type = 'text/javascript';
        core.onload = function(){
          xtagLoaded = true;
          DOMComponentsLoaded = true;
        };
    document.querySelector('head').appendChild(core);
    core.src = '../src/core.js?d=' + new Date().getTime();
    
    waitsFor(function(){
      return xtagLoaded && DOMComponentsLoaded && WebComponentsReady && xtag;
    }, "document.register should be polyfilled", 2000);

    runs(function () {
      expect(xtag).toBeDefined();
    });
  });
/* 
  it('upgrades all elements synchronously when registered', function (){
    var createdFired = false;
    xtag.register('x-sync', {
      lifecycle: {
        created: function (){
          createdFired = true;
        }
      },
      accessors: {
        foo: {
          get: function(){
            return 'bar';
          }
        }
      }
    });

    var created = document.createElement('x-sync');
    var existing = document.getElementById('sync_element');

    waitsFor(function (){
      return createdFired;
    }, "new tag lifecycle event CREATED should fire", 1000);

    runs(function (){
      expect(existing.foo).toEqual('bar');
    });
  });

  it('should fire attributeChanged any attributes are updated', function(){

    var attributeChanged = false;

    xtag.register('x-foo1', {
      lifecycle: {
        attributeChanged: function(){
          attributeChanged = true;
        }
      }
    });

    var foo1 = document.createElement('x-foo1');
    foo1.setAttribute('foo', 'bar');
    foo1.setAttribute('foo', 'adf');

    waitsFor(function(){
      return attributeChanged;
    });

    runs(function (){
      expect(attributeChanged).toEqual(true);
    });
  });


  it('should fire lifecycle event CREATED when a new tag is created', function (){
    var createdFired = false;
    xtag.register('x-foo2', {
      lifecycle: {
        created: function (){
          createdFired = true;
        }
      }
    });

    var foo = document.createElement('x-foo2');

    waitsFor(function (){
      return createdFired;
    }, "new tag lifecycle event CREATED should fire", 1000);

    runs(function (){
      expect(createdFired).toEqual(true);
    });
  });

  describe('using testbox', function (){
    var testbox;

    beforeEach(function (){
      testbox = document.getElementById('testbox');
    });

    afterEach(function (){
      testbox.innerHTML = "";
    });

    it('testbox should exist', function (){
      expect(testbox).toBeDefined();
    });

    it('should fire CREATED when tag is added to innerHTML', function (){
      var created = false;
      xtag.register('x-foo3', {
        lifecycle: {
          created: function (){
            created = true;
          }
        },
        methods: {
          bar: function (){
            return true;
          }
        }
      });

      xtag.set(testbox, 'innerHTML', '<x-foo3 id="foo"></x-foo3>');

      waitsFor(function (){
        return created;
      }, "new tag lifecycle event {created} should fire", 1000);

      runs(function (){
        var fooElement = document.getElementById('foo');
        expect(created).toEqual(true);
        expect(fooElement.bar()).toEqual(true);
      });
    });


    it('should fire CREATED when custom element is added within a parent to innerHTML', function (){
      var created = false;

      xtag.register('x-foo4', {
        lifecycle: {
          created: function(){
            created = true;
          }
        },
        methods: {
          bar: function (){
            return true;
          },
          zoo: function(){
            return true;
          }
        }
      });

      xtag.set(testbox, 'innerHTML', '<div><x-foo4 id="foo" class="zoo"></x-foo4></div>');

      waitsFor(function (){
        return created;
      }, "new tag lifecycle event {created} should fire", 1000);

      runs(function (){
        var fooElement = document.getElementById('foo');
        expect(created).toEqual(true);
        expect(fooElement.bar()).toEqual(true);
      });
    });

    it('should fire INSERTED when injected into the DOM', function (){
      var inserted = false;
      xtag.register('x-foo5', {
        lifecycle: {
          inserted: function (){
            inserted = true;
          }
        }
      });

      var foo = document.createElement('x-foo5');
      testbox.appendChild(foo);
      waitsFor(function (){
        return inserted;
      }, "new tag onInsert should fire", 1000);

      runs(function (){
        expect(inserted).toEqual(true);
      });
    });

    it('should fire REMOVED when removed into the DOM (w/inserted)', function (){
      var removed = false;
      xtag.register('x-foo5-removed', {
        lifecycle: {
          inserted: function (){},
          removed: function (){
            removed = true;
          }
        }
      });

      var foo = document.createElement('x-foo5-removed');
      testbox.appendChild(foo);
      setTimeout(function(){
        testbox.removeChild(foo);
      },100);

      waitsFor(function (){
        return removed;
      }, "new tag removed should fire", 1000);

      runs(function (){
        expect(removed).toEqual(true);
      });
    });

    it('should fire REMOVED when removed into the DOM', function (){
      var removed = false;
      xtag.register('x-foo5-removed-1', {
        lifecycle: {
          removed: function (){
            removed = true;
          }
        }
      });

      var foo = document.createElement('x-foo5-removed-1');
      testbox.appendChild(foo);
      setTimeout(function(){
        testbox.removeChild(foo);
      },100);
      waitsFor(function (){
        return removed;
      }, "new tag removed should fire", 1000);

      runs(function (){
        expect(removed).toEqual(true);
      });
    });

    it('should parse new tag as soon as it is registered', function (){
      var foo = document.createElement('x-foo6');

      testbox.appendChild(foo);

      xtag.register('x-foo6', {
        methods: {
          bar: function(){ return 'baz'; }
        }
      });

      runs(function (){
        expect(foo.bar()).toEqual('baz');
      });
    });

    it('extends should allow elements to use other elements base functionality', function(){
      xtag.register("x-foo29", {
        extends: 'div',
        lifecycle: {
          created: function() {
            this.innerHTML = '<div>hello</div>';
          }
        }
      });

      var foo = document.createElement('x-foo29');
      testbox.appendChild(foo);

      expect(foo.innerHTML).toBeDefined();

    });

    it('should allow a custom prototype to be used', function(){
      var proto = Object.create(HTMLElement.prototype);
      proto.fn = function(){};
      xtag.register("x-foo-proto", {
        prototype: proto
      });

      var foo = document.createElement('x-foo-proto');
      testbox.appendChild(foo);

      expect(foo.fn).toBeDefined();
      expect(foo.click).toBeDefined();

    });

    it('should be able to extend existing elements', function(){
      xtag.register("x-foo-extend", {
        extends: 'div'
      });

      var foo = document.createElement('x-foo-extend');
      testbox.appendChild(foo);

      expect(foo.click).toBeDefined();

    });
    
  }); */
});
