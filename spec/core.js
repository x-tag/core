
describe("x-tag ", function () {

  it('should load x-tag and fire DOMComponentsLoaded', function (){
    var componentsLoaded = false;
    document.addEventListener('DOMComponentsLoaded', function (){
      componentsLoaded = true;
    });

    runs(function (){
      var register = document.createElement('script');
      register.type = 'text/javascript';
      register.src = '../components/document.register/src/document.register.js?d=' + new Date().getTime();
      document.getElementsByTagName('head')[0].appendChild(register);
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.src = '../src/core.js?d=' + new Date().getTime();
      document.getElementsByTagName('head')[0].appendChild(script);
    });

    waitsFor(function () {
      return componentsLoaded || window.xtag;
    }, "The document should be loaded", 1000);

    runs(function () {
      expect(window.xtag).toBeDefined();
    });
  });
  
  it('all new element proto objects should be unique', function (){
    var createdFired = false;
    xtag.register('x-unique', {
      lifecycle: {
        created: function (){
          createdFired = true;
        }
      }
    });

    var foo1 = document.createElement('x-unique');
    var foo2 = document.createElement('x-unique');
    
    waitsFor(function (){
      return createdFired;
    }, "new tag lifecycle event CREATED should fire", 1000);
    
    runs(function (){
      expect(foo1.xtag == foo2.xtag).toEqual(false);
    });
  });

  it('should fire lifecycle event CREATED when a new tag is created', function (){
    var createdFired = false;
    xtag.register('x-foo', {
      lifecycle: {
        created: function (){
          createdFired = true;
        }
      }
    });

    var foo = document.createElement('x-foo');

    waitsFor(function (){
      return createdFired;
    }, "new tag lifecycle event CREATED should fire", 1000);

    runs(function (){
      expect(createdFired).toEqual(true);
    });
  });

  describe('using testbox', function (){
    var testBox;

    beforeEach(function (){
      testBox = document.getElementById('testbox');
    });

    afterEach(function (){
      testBox.innerHTML = "";
    });

    it('testbox should exist', function (){
      expect(testBox).toBeDefined();
    });

    it('should fire CREATED when tag is added to innerHTML', function (){
      var created = false;
      xtag.register('x-foo', {
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

      testBox.innerHTML = '<x-foo id="foo"></x-foo>';

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
      xtag.register('x-foo', {
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

      testBox.innerHTML = '<div><x-foo id="foo"></x-foo></div>';

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
      xtag.register('x-foo', {
        lifecycle: {
          inserted: function (){
            inserted = true;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);
      waitsFor(function (){
        return inserted;
      }, "new tag onInsert should fire", 1000);

      runs(function (){
        expect(inserted).toEqual(true);
      });
    });

    it('should fire elementupgrade', function (){
      var upgraded = false;
      xtag.register('x-foo', {
        events:{
          'elementupgrade': function(e){
            if(e.target == this){
              upgraded = true;
            }
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);
      waitsFor(function (){
        return upgraded;
      }, "elementupgrade should fire", 1000);

      runs(function (){
        expect(upgraded).toEqual(true);
      });
    });

    it('should parse new tag as soon as it is registered', function (){
      var upgraded, foo = document.createElement('x-foo2');
      foo.addEventListener('elementreplace', function (event){
        upgraded = event.upgrade;
      }, false);
      testbox.appendChild(foo);

      xtag.register('x-foo2');

      waitsFor(function (){
        return upgraded;
      }, "tag should be upgraded and replaced", 1000);

      runs(function (){
        expect(upgraded).toBeDefined();
      });
    });

    it('should register methods for element', function (){

      xtag.register('x-foo', {
        methods: {
          baz: function (){ }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      expect(foo.baz).toBeDefined();

    });

    it('should register getters for element', function (){

      xtag.register('x-foo', {
        accessors: {
          name: {
            get: function (){
              return this.nodeName;
            }
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      expect(foo.name).toEqual('X-FOO');

    });

    it('should register setters for element', function (){

      xtag.register('x-foo', {
        accessors: {
          name: {
            set: function (value){
              this.setAttribute('name', value);
            }
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);
      foo.name = 'pizza';

      expect(foo.getAttribute('name')).toEqual('pizza');

    });

    it('xtag.innerHTML should instantiate x-tags in innerHTML', function (){
      xtag.register('x-foo', {
        accessors: {
          name: {
            set: function (value){ 
              this.setAttribute('name', value);
            }
          }
        }
      });
      xtag.innerHTML(testbox, '<x-foo id="foo"></x-foo>');
      var foo = document.getElementById('foo');
      foo.name = "Bob";
      expect(foo.getAttribute('name')).toEqual('Bob');
    });

    it('should only fire INSERT when inserted into the DOM', function (){
      var inserted = false;
      xtag.register('x-foo', {
        lifecycle: {
          inserted: function (){
            inserted = true;
          }
        }
      });
      var temp = document.createElement('div');
      temp.id = 'ZZZZZZZZZZZZZZZZZZZZZ';
      temp.appendChild(document.createElement('x-foo'));
      expect(inserted).toEqual(false);

      testbox.appendChild(temp);

      waitsFor(function (){
        return inserted;
      }, "new tag onInsert should fire", 1000);

      runs(function (){
        expect(inserted).toEqual(true);
      });
    });

    it("should create a mixin, fire CREATED", function (){
      var onCreateFired = false;
      xtag.mixins.test = {
        lifecycle: {
          created: function (){
            onCreateFired = true;
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test']
      });

      var foo = document.createElement('x-foo');
      expect(true).toEqual(onCreateFired);
    });

    it("should create a mixin, fire inserted", function (){
      var onInsertFired = false;
      xtag.mixins.test = {
        lifecycle: {
          inserted: function (){
            onInsertFired = true;
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test']
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return onInsertFired;
      }, "new tag mixin inserted should fire", 1000);

      runs(function (){
        expect(true).toEqual(onInsertFired);
      });
    });

    it("should fire created on mixin and element", function (){
      var createdFired1 = false,
        createdFired2 = false;

      xtag.mixins.test = {
        lifecycle: {
          'created': function (){
            createdFired1 = true;
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test'],
        lifecycle: {
          created: function (){
            // should this call be explicit
            xtag.mixins.test.lifecycle.created.call(this);
            createdFired2 = true;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return createdFired1 && createdFired2;
      }, "new tag mixin created should fire", 1000);

      runs(function (){
        expect(true).toEqual(createdFired1);
        expect(true).toEqual(createdFired2);
      });
    });

    it("should allow mixins to create getters", function (){
      xtag.mixins.test = {
        accessors: {
          foo: {
            get: function (){
              return "barr";
            }
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test']
      });

      var foo = document.createElement('x-foo');
      expect('barr').toEqual(foo.foo);
    });

    it("should allow mixins to create setters", function (){
      xtag.mixins.test = {
        accessors: {
          foo: {
            set: function (value){
              this.setAttribute('foo', value);
            }
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test']
      });

      var foo = document.createElement('x-foo');
      foo.foo = 'barr';

      expect('barr').toEqual(foo.getAttribute('foo'));
    });

    it("should allow mixins to handle events", function (){
      var mixinEvent = false;
      xtag.mixins.test = {
        events: {
          'elementupgrade': function(e){
            mixinEvent = true;
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test']
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return mixinEvent;
      }, "mixin event should fire", 1000);

      runs(function (){
        expect(true).toEqual(mixinEvent);        
      });
    });

    it("should allow mixins to handle events", function (){
      var mixinEvent = false, elementEvent = false;
      xtag.mixins.test = {
        events: {
          'elementupgrade': function(e){
            mixinEvent = true;
          }
        }
      };

      xtag.register('x-foo', {
        mixins: ['test'],
        events:{
          'elementupgrade': function(e){
            mixinEvent = true;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return mixinEvent;
      }, "mixin event should fire", 1000);

      runs(function (){
        expect(true).toEqual(mixinEvent);        
      });
    });

    it('delegate event pseudo should pass the custom element as second param', function (){

      var customElement, currentTarget;

      xtag.register('x-foo', {
        lifecycle: {
          created: function (){
            customElement = this;
            this.innerHTML = '<div></div>';
          }
        },
        events: {
          'click:delegate(div)': function (e, elem){
            currentTarget = e.currentTarget;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return customElement;
      }, "new tag mixin onInsert should fire", 1000);

      runs(function (){
        xtag.fireEvent(xtag.query(customElement, 'div')[0], 'click');
        expect(customElement).toEqual(currentTarget);
      });

    });

    it('delegate event pseudo should register a click on an inner element', function (){

      var clicked = false;

      xtag.register('x-foo', {
        lifecycle: {
          created: function (){
            customElement = this;
            this.innerHTML = '<div></div>';
          }
        },
        events: {
          'click:delegate(div)': function (e, elem){
            clicked = true;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return customElement;
      }, "new tag mixin onInsert should fire", 1000);

      runs(function (){
        xtag.fireEvent(xtag.query(customElement, 'div')[0], 'click');
        expect(clicked).toEqual(true);
      });

    });

    it('delegate event pseudo "this" should be the element filtered by pseudo', function (){

      var customElement, delegateElement;

      xtag.register('x-foo', {
        lifecycle: {
          created: function (){
            customElement = this;
            this.innerHTML = '<div></div>';
          }
        },
        events: {
          'click:delegate(div)': function (e, elem){
            delegateElement = this;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      waitsFor(function (){
        return customElement;
      }, "new tag mixin onInsert should fire", 1000);

      runs(function (){
        xtag.fireEvent(xtag.query(customElement, 'div')[0], 'click');
        expect(delegateElement).toEqual(customElement.firstElementChild);
      });

    });

    it('delegate event pseudo should support chaining', function (){

      var clickThis = null;

      xtag.register('x-foo', {
        lifecycle: {
          created: function (){
            this.innerHTML = '<div><foo><bazz></bazz></foo></div>';
          }
        },      

        events: {
          'click:delegate(div):delegate(bazz)': function (e, elem){
            clickThis = this;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      var innerDiv = xtag.query(foo,'bazz')[0];
      xtag.fireEvent(innerDiv,'click');

      expect(innerDiv).toEqual(clickThis);

    });

    it('attribute pseudo should set attribute', function (){

      xtag.register('x-foo', {
        accessors:{
          foo:{
            'set:attribute(foo)': function(value){
            }
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      foo.foo = 'bar';
      
      expect(foo.getAttribute('foo')).toEqual('bar');

    });

    it('attribute(bar) pseudo should set bar attribute', function (){

      xtag.register('x-foo', {
        accessors:{
          foo:{
            'set:attribute(bar)': function(value){
            }
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      foo.foo = 'bar';
      
      expect(foo.getAttribute('bar')).toEqual('bar');

    });

    it('x-tag pseudos should allow css pseudos', function (){

      var clickThis = null;

      xtag.register('x-foo', {
        lifecycle: {
          created: function (){
            this.innerHTML = '<div><foo><bazz><button></button></bazz></foo></div>';
          }
        },
        events: {
          'click:delegate(div):delegate(bazz:first-child)': function (e, elem){
            clickThis = this;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      var button = xtag.query(foo,'button')[0];
      xtag.fireEvent(button,'click');

      expect(button).toEqual(clickThis.childNodes[0]);

    });


    it('custom event pseudo should fire', function (){

      var pseudoFired = false,
        clickThis = null;

      xtag.pseudos.blah = {
        listener: function (pseudo, fn, args){
          pseudoFired = true;
          args[0].foo = this;
          fn.apply(this, args);
        }
      };

      xtag.register('x-foo', {
        lifecycle: {
          created: function (){
            this.innerHTML = '<div><foo><bazz></bazz></foo></div>';
          }
        },
        events: {
          'click:delegate(div):blah:delegate(bazz)': function (e, elem){
            clickThis = this;
          }
        }
      });

      var foo = document.createElement('x-foo');
      testbox.appendChild(foo);

      var innerDiv = xtag.query(foo,'bazz')[0];
      xtag.fireEvent(innerDiv,'click');

      expect(pseudoFired).toEqual(true);

      expect(innerDiv).toEqual(clickThis);

    });


  });

  describe('helper methods', function (){
    describe('class', function (){
      var body;

      beforeEach(function (){
        body = document.body;
      });

      afterEach(function (){
        body.removeAttribute('class');
      });

      it('hasClass', function (){
        expect(xtag.hasClass(body, 'foo')).toEqual(false);
        body.setAttribute('class', 'foo');
        expect(xtag.hasClass(body, 'foo')).toEqual(true);
      });

      it('addClass', function (){
        expect(xtag.hasClass(body, 'foo')).toEqual(false);
        xtag.addClass(body,'foo');
        expect(xtag.hasClass(body, 'foo')).toEqual(true);

        xtag.addClass(body,'bar');
        expect(xtag.hasClass(body, 'bar')).toEqual(true);
        expect('foo bar').toEqual(body.getAttribute('class'));
        expect(2).toEqual(body.getAttribute('class').split(' ').length);

        xtag.addClass(body,'biz red');

        expect('foo bar biz red').toEqual(body.getAttribute('class'));        
        
        // prevent dups
        xtag.addClass(body,'foo red');
        expect('foo bar biz red').toEqual(body.getAttribute('class'));        

      });

      it('removeClass', function (){
        xtag.addClass(body,'foo');
        xtag.addClass(body,'bar');
        xtag.addClass(body,'baz');
        expect('foo bar baz').toEqual(body.getAttribute('class'));

        xtag.removeClass(body,'bar');
        expect('foo baz').toEqual(body.getAttribute('class'));

        xtag.addClass(body,'bar');
        expect('foo baz bar').toEqual(body.getAttribute('class'));

        xtag.removeClass(body,'foo');
        expect('baz bar').toEqual(body.getAttribute('class'));

        xtag.removeClass(body,'baz');
        expect('bar').toEqual(body.getAttribute('class'));

        xtag.removeClass(body,'random');
        body.setAttribute('class','  foo  bar baz   red   ');

        xtag.removeClass(body,'bar');
        expect('foo baz red').toEqual(body.getAttribute('class'));
      });

      it('toggleClass', function (){
        xtag.toggleClass(body, 'foo');
        expect('foo').toEqual(body.getAttribute('class'));

        xtag.toggleClass(body, 'foo');
        expect('').toEqual(body.getAttribute('class'));

        xtag.addClass(body, 'baz');
        xtag.toggleClass(body, 'baz');
        expect('').toEqual(body.getAttribute('class'));

      });

      it('Random combination of Class tests', function (){
        body.setAttribute('class', 'flex-stack');
        xtag.addClass(body, 'small_desktop');
        expect('flex-stack small_desktop').toEqual(body.getAttribute('class'));

        body.setAttribute('class', 'flex-stack');
        xtag.addClass(body, 'small_desktop');
        xtag.removeClass(body, 'small_desktop');
        expect('flex-stack').toEqual(body.getAttribute('class'));

        body.setAttribute('class', 'small_desktop flex-stack');
        xtag.removeClass(body, 'small_desktop');
        expect('flex-stack').toEqual(body.getAttribute('class'));

        body.setAttribute('class', 'small_desktop flex-stack');
        xtag.removeClass(body, 'small_desktop');
        xtag.removeClass(body, 'large_desktop');
        expect('flex-stack').toEqual(body.getAttribute('class'));
      });
    });

    describe('utils', function (){
      it('typeOf', function (){
        expect('object').toEqual(xtag.typeOf({}));
        expect('array').toEqual(xtag.typeOf([]));
        expect('string').toEqual(xtag.typeOf('d'));
        expect('number').toEqual(xtag.typeOf(42));
      });

      it('toArray', function (){
        expect([]).toEqual(xtag.toArray({}));
      });

    });
  });
});
