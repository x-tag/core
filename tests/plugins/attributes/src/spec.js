

describe("X-Tag's src extension should", function() {

  it("fetch the data from the provided value", function(done) {
    
    var component = xtag.create(class extends XTagElement.extensions('src') {
      'load::event'(event){
        this.innerHTML = event.detail;
        expect(event).toBeDefined();
        done()
      }
      'error::event'(event){
        expect(event).toBeDefined();
        done()
      }
    });

    defineTestElement(component);

    node = new component();
    node.src = 'https://api.github.com';
    expect(node.src).toBe('https://api.github.com');

  }, 10000);

});
