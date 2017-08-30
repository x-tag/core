
describe("X-Tag's setup should", function() {

  it("import its globals into the environment", function() {
    expect(xtag).toBeDefined();
    expect(XTagElement).toBeDefined();
  });

});

describe("X-Tag extension API should", function() {

  it("load global extensions when included in component declarations via string reference", function() {

    count = 0;
    xtag.extensions.foo = {
      mixin: (base) => class extends base {
        bar(){
          count++;
        }
      },
      onParse (){
        count++;
      },
      onCompiled (){
        count++;
      },
      onConstruct (){
        count++;
      }
    }

    var component = xtag.create(class extends XTagElement.extensions('foo') {
      'baz::foo'(){ count++; }
    });

    defineTestElement(component);

    var node = new component();
    node.bar();
    node.baz();

    expect(count).toBe(5);

    delete xtag.extensions.foo;
  });

  it("load local extensions when included in component declarations directly", function() {

    count = 0;
    var foo = {
      name: 'foo',
      mixin: (base) => class extends base {
        bar(){
          count++;
        }
      },
      onParse (){
        count++;
      },
      onCompiled (){
        count++;
      },
      onConstruct (){
        count++;
      }
    }

    var baz = {
      name: 'baz',
      mixin: (base) => class extends base {
        boo(){
          count++;
        }
      }
    }

    var _comp = class extends XTagElement.extensions(foo, baz) {
      'zul::foo'(){ count++; }
    }

    var component = xtag.create(_comp);

    defineTestElement(component);

    var node = new component();
    node.bar();
    node.zul();
    node.boo();
    
    expect(count).toBe(6);
  });

});

describe("X-Tag's attr extension should", function() {

  it("correctly parse keys and set descriptors", function() {

    var count = 0;
    var component = xtag.create(class extends XTagElement {
      set 'one::attr'(val){ count++; }
      set 'two::attr'(val){ count++; }
      get 'three::attr'(){ count++; }
    });

    defineTestElement(component);

    expect('one' in component.prototype).toBe(true);
    expect('two' in component.prototype).toBe(true);
    expect('three' in component.prototype).toBe(true);

    var node = new component();
    node.one = 'test';
    node.two = 'test';
    var three = node.three;

    expect(count).toBe(3);

  });

  it("call all descriptor variants", function() {

    var count = 0;
    var component = xtag.create(class extends XTagElement {
      set 'one::attr'(val){ count++; }
      set 'two::attr'(val){ count++; }
      get 'three::attr'(){ count++; }
      set 'four::attr'(val){ count++; }
      get 'four::attr'(){ count++; }
      set 'five::attr'(val){ count++; }
      get 'five::attr'(){ count++; }
      get 'six::attr'(){
        return Number(this.getAttribute('six'));
      }
    });

    defineTestElement(component);

    var node = new component();
    node.one = 'test';
    node.two = 'test';
    node.three;
    node.four = 'test';
    node.four;
    node.five = 'test';
    node.five;
    expect(node.three).toBe(null);
    expect(node.four).toBe('test');
    expect(node.five).toBe('test');
    node.six = 6;

    expect(count).toBe(10);
    expect(node.one).toBe('test');
    expect(node.getAttribute('one')).toBe('test');
    expect(node.two).toBe('test');
    expect(node.getAttribute('two')).toBe('test');  
    expect(node.getAttribute('three')).toBe(null);  
    expect(node.getAttribute('four')).toBe('test');   
    expect(node.getAttribute('five')).toBe('test');
    expect(node.six).toBe(6);
    expect(node.getAttribute('six')).toBe('6');

  });

  it("correctly handles boolean attributes", function() {

    var count = 0;
    var component = xtag.create(class extends XTagElement {
      set 'one::attr(boolean)'(val){ count++; }
      set 'two::attr(boolean)'(val){
        count++;
        return 'bar';
      }
      get 'three::attr(boolean)'(){ count++; }
    });

    defineTestElement(component);

    var node = new component();
    node.one = 'test';
    node.two = 'test';
    node.three = 'test';
    node.three;

    expect(count).toBe(3);
    expect(node.hasAttribute('one')).toBe(true);
    expect(node.getAttribute('one')).toBe('');
    expect(node.hasAttribute('two')).toBe(true);
    expect(node.getAttribute('two')).toBe('');
    expect(node.hasAttribute('three')).toBe(true);
    expect(node.getAttribute('three')).toBe('');

  });

});

describe("X-Tag's event extension should", function() {

  it("attach all subevents", function(done) {
    
    var count = 0;
    xtag.events.loaded = {
      attach: ['load'],
      onFilter (node, event, data, resolve) {
        if (event.type == 'load') {
          count++;
          resolve();
        }
      }
    }

    var component = xtag.create(class extends XTagElement {
      constructor(){
        super();
        var img = document.createElement('img');
        img.src = 'assets/bitcoin.png';
        this.appendChild(img);
      }
      'loaded::event'(){
        count++;
        expect(count).toBe(2);
        delete xtag.events.loaded;
        done();
      }
    });

    defineTestElement(component);

    var node = new component();
  });

});

describe("X-Tag's template extension should", function() {

  it("attach unnamed template properties as default", function() {
    
    var count = 0;
    var component = xtag.create(class extends XTagElement {
      '::template'(){
        return `<h1>title1</h1><p>content1</p>`;
      }
    });

    defineTestElement(component);

    var node = new component();
    node.render();
    expect(node.firstElementChild.textContent).toBe('title1');
    expect(node.lastElementChild.textContent).toBe('content1');
  });

  it("auto-render templates marked with the option", function() {
    
    var component1 = xtag.create(class extends XTagElement {
      '::template(true)'(){
        return `<h1>title auto 1</h1><p>content auto 1</p>`;
      }
    });

    var component2 = xtag.create(class extends XTagElement {
      'foo::template(true)'(){
        return `<h1>title auto 2</h1><p>content auto 2</p>`;
      }
    });

    defineTestElement(component1);

    var node1 = new component1();
    expect(node1.firstElementChild.textContent).toBe('title auto 1');
    expect(node1.lastElementChild.textContent).toBe('content auto 1');

    defineTestElement(component2);

    var node2 = new component2();
    expect(node2.firstElementChild.textContent).toBe('title auto 2');
    expect(node2.lastElementChild.textContent).toBe('content auto 2');
  });

  it("attach a named template and render when referenced", function() {
    
    var count = 0;
    var component = xtag.create(class extends XTagElement {
      'foo::template'(){
        return `<h1>title2</h1><p>content2</p>`;
      }
    });

    defineTestElement(component);

    var node = new component();
    node.render('foo');
    expect(node.firstElementChild.textContent).toBe('title2');
    expect(node.lastElementChild.textContent).toBe('content2');
  });

  it("include the right values when a template is rendered", function() {
    
    var count = 0;

    var component = xtag.create(class extends XTagElement {
      get 'foo::attr'(){}
      'bar'(){ return 'bar' }
      '::template'(){
        return `<h1>${this.foo}</h1><p>${this.bar()}</p>`;
      }
    });

    defineTestElement(component);

    var node = new component();
    node.setAttribute('foo', 'foo');
    node.render();
    expect(node.firstElementChild.textContent).toBe('foo');
    expect(node.lastElementChild.textContent).toBe('bar');
  });

});

describe("X-Tag pseudos should", function() {

  it("be parsed correctly and called when invoked", function() {

    var count = 0;

    xtag.pseudos.foo = {
      onInvoke(){
        count++;
      }
    }

    var component = xtag.create(class extends XTagElement {
      'one:foo'(){ count++; }
      set 'two::attr:foo'(val){ count++; }
      'three::event:foo'(){ count++; }
    });

    defineTestElement(component);

    var node = new component();
    node.one();
    node.two = 2;
    xtag.fireEvent(node, 'three');

    expect(count).toBe(6);

  });

});