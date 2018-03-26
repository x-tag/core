
describe("The hyperHTML extension should", function() {

  it("render its content when loaded", function() {
    
    var count = 0;
    var component = xtag.create(class extends XTagElement.extensions('hyper') {
      '::hyper(true)'(render){
        render`<h1>${this.foo}</h1><input value="${this.bar()}" />`;
      }
      get foo (){
        return 'foo ' + count++;
      }
      bar (){
        return 'bar ' + count++;
      }
    });

    defineTestElement(component);

    var node = new component();
    var first = node.firstElementChild;
    var last = node.lastElementChild;
    expect(node.firstElementChild.textContent).toBe('foo 0');
    expect(node.lastElementChild.value).toBe('bar 1');
    node.render();
    expect(node.firstElementChild.textContent).toBe('foo 2');
    expect(node.lastElementChild.value).toBe('bar 3');
    expect(node.firstElementChild === first).toBe(true);
    expect(node.lastElementChild === last).toBe(true);
  });

    it("flush old nodes when rendering a new template", function() {
    
    var count = 0;
    var component = xtag.create(class extends XTagElement.extensions('hyper') {
      '::hyper(true)'(render){
        render`<h1>${this.foo}</h1><input value="${this.bar()}" />`;
      }
      'second::hyper'(render){
        render`<h2>${this.foo}</h2><input value="${this.bar()}" />`;
      }
      get foo (){
        return 'foo ' + count++;
      }
      bar (){
        return 'bar ' + count++;
      }
    });

    defineTestElement(component);

    var node = new component();
    var first = node.firstElementChild;
    var last = node.lastElementChild;
    expect(node.firstElementChild.innerHTML).toBe('foo 0');
    expect(node.lastElementChild.value).toBe('bar 1');
    node.render('second');
    expect(node.firstElementChild.innerHTML).toBe('foo 2');
    expect(node.lastElementChild.value).toBe('bar 3');
    expect(node.firstElementChild === first).toBe(false);
    expect(node.lastElementChild === last).toBe(false);
  });

});
