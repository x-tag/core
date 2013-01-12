require(['../../x-tag.js'], function(xtag){
	describe("x-tag amd", function() {

		it('should initialize correctly using AMD', function(){
			expect(window).toBeDefined();
			expect(document).toBeDefined();
			expect(xtag).toBeDefined();
		});

	});

	describe('using testbox', function(){
		var testBox;

		beforeEach(function(){
			testBox = document.getElementById('testbox');
		});

		afterEach(function(){
			testBox.innerHTML = "";
		});

		it('testbox should exist', function(){
			expect(testBox).toBeDefined();
		});

		it('should fire onCreate when a new tag is created', function(){
			var onCreateFired = false;
			xtag.register('x-foo', {
				onCreate: function(){
					onCreateFired = true;
				}
			});

			var foo = document.createElement('x-foo');

			waitsFor(function(){
				return onCreateFired;
			}, "new tag onCreate should fire", 1000);

			runs(function(){
				expect(onCreateFired).toEqual(true);
			});
		});

		it('should fire onInsert when tag is added to innerHTML', function(){
			var onInsertFired = false;
			xtag.register('x-foo', {
				onCreate: function(){
				},
				onInsert: function(){
					onInsertFired = true;
				},
				methods: {
					bar: function(){
						return true;
					}
				},
				setters:{
					pizza: function(value){
						this.dataset.pizza = value;
					}
				}
			});

			testBox.innerHTML = '<x-foo id="foo"></x-foo>';

			waitsFor(function(){
				return onInsertFired;
			}, "new tag onInsertFired should fire", 1000);

			runs(function(){
				var fooElement = document.getElementById('foo');
				expect(onInsertFired).toEqual(true);
				expect(fooElement.bar()).toEqual(true);
				fooElement.pizza = 'cheese';
				expect('cheese').toEqual(fooElement.dataset.pizza);
			});
		});
	});

});