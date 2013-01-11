(function(){

/*** Internal Variables ***/

	var	win = window,
		doc = document,
		keypseudo = {
			listener: function(pseudo, fn, args){
				if (!!~pseudo.value.match(/(\d+)/g).indexOf(String(args[0].keyCode)) == (pseudo.name == 'keypass')){
					args.splice(args.length, 0, this);
					fn.apply(this, args);
				}
			}
		},
		touchFilter = function(pseudo, fn, args){
		  if (fn.touched) fn.touched = false;
		  else {
			if (args[0].type.match('touch')) fn.touched = true;
			args.splice(args.length, 0, this);
			fn.apply(this, args);
		  }
		},
		createFlowEvent = function(type){
			var flow = type == 'over';
			return {
				base: 'OverflowEvent' in window ? 'overflowchanged' : type + 'flow',
				condition: function(event){
					return event.type == (type + 'flow') ||
					((event.orient == 0 && event.horizontalOverflow == flow) || 
					(event.orient == 1 && event.verticalOverflow == flow) || 
					(event.orient == 2 && event.horizontalOverflow == flow && event.verticalOverflow == flow));
				}
			}
		},
		prefix = (function() {
			var styles = win.getComputedStyle(doc.documentElement, ''),
				pre = (Array.prototype.slice
					.call(styles)
					.join('')
					.match(/-(moz|webkit|ms)-/) || (styles.OLink==='' && ['','o'])
				)[1],
				dom = ('WebKit|Moz|MS|O').match(new RegExp('(' + pre + ')', 'i'))[1];
			return {
				dom: dom,
				lowercase: pre,
				css: '-' + pre + '-',
				js: pre[0].toUpperCase() + pre.substr(1)
			};
		})();
	
/*** Internal Functions ***/
	
	function mergeOne(source, key, current){
		var type = xtag.typeOf(current);
		if (type == 'object' || type == 'array') {
			if (xtag.typeOf(source[key]) == 'object') xtag.merge(source[key], current);
			else source[key] = xtag.merge({}, current);
		}
		else source[key] = current;
		return source;
	};
	
/*** X-Tag Object Definition ***/
	
	var xtag = {
	
		defaultOptions: {
			extend: null,
			events: {},
			methods: {},
			accessors: {},
			lifecycle: {},
			'prototype': {
				xtag: {
					value: {}
				}
			}
		},
		register: function(name, options) {
			var tag = xtag.merge({}, xtag.defaultOptions, options),
				extend = tag.extend ? xtag._createElement(tag.extend).__proto__ : null;
			
			for (var z in tag.events) tag.events[z] = xtag.parseEvent(z, tag.events[z]);
			for (var z in tag.lifecycle) tag.lifecycle[z] = xtag.applyPseudos(z, tag.lifecycle[z]);
			for (var z in tag.methods) tag['prototype'][z] = { value: xtag.applyPseudos(z, tag.methods[z]) };
			
			for (var prop in tag.accessors) {
				tag['prototype'][prop] = {};
				var accessor = tag.accessors[prop];
				for (var z in accessor) {
					var key = z.split(':'), type = key[0];
					if (type == 'get' || type == 'set') {
						key[0] = prop;
						tag['prototype'][prop][type] = xtag.applyPseudos(key.join(':'), accessor[z]);
					}
					else tag['prototype'][prop][z] = accessor[z];
				}
			}
			
			var created = tag.lifecycle.created;
			if (created) tag.lifecycle.created = function(){
				xtag.addEvents(this, tag.events);
				return created.apply(this, xtag.toArray(arguments));
			};
			var proto = doc.register(name, {
				'prototype': Object.create(extend || ((win.HTMLSpanElement || win.HTMLElement).prototype), tag['prototype']),
				'lifecycle':  tag.lifecycle
			});
			
			return proto;
		},
		
	/*** Exposed Variables ***/
	
		prefix: prefix,
		captureEvents: ['focus', 'blur'],
		customEvents: {
			overflow: createFlowEvent('over'),
			underflow: createFlowEvent('under'),
			animationstart: {
				base: [
					'animationstart', 
					'oAnimationStart', 
					'MSAnimationStart', 
					'webkitAnimationStart'
				]
			},
			transitionend: {
				base: [
					'transitionend', 
					'oTransitionEnd', 
					'MSTransitionEnd', 
					'webkitTransitionEnd'
				]
			},
			tap: {
				base: ['click', 'touchend'],
				listener: touchFilter
			},
			tapstart: {
				base: ['mousedown', 'touchstart'],
				listener: touchFilter
			},
			tapend: {
				base: ['mouseup', 'touchend'],
				listener: touchFilter
			},
			tapenter: {
				base: ['mouseover', 'touchenter'],
				listener: touchFilter
			},
			tapleave: {
				base: ['mouseout', 'touchleave'],
				listener: touchFilter
			},
			tapmove: {
				base: ['mousemove', 'touchmove'],
				listener: touchFilter
			}
		},	
		pseudos: {
			keypass: keypseudo,
			keyfail: keypseudo,
			delegate: {
				listener: function(pseudo, fn, args){
					var target = xtag.query(this, pseudo.value).filter(function(node){
					return node == args[0].target || 
						node.contains ? node.contains(args[0].target) : false;
					})[0];
					return target ? fn.apply(target, args) : false;
				}
			},
			preventable: { 
				listener: function(pseudo, fn, args){
					if (!args[0].defaultPrevented) fn.apply(this, args);
				}
			},
			attribute: {
				onAdd: function(pseudo){
					this.xtag.attributeSetters = this.xtag.attributeSetters || {};
					pseudo.value = pseudo.value || pseudo.key.split(':')[0];
					this.xtag.attributeSetters[pseudo.value] = pseudo.key.split(':')[0];
				},
				listener: function(pseudo, fn, args){
					fn.call(this, args[0]);
					this.setAttribute(pseudo.value, args[0], true);
				}
			}
		},
		
	/*** Utilities ***/
		
		// JS Types
		
		typeOf: function(obj) {
			return ({}).toString.call(obj).match(/\s([a-zA-Z]+)/)[1].toLowerCase();
		},
		
		wrap: function(original, fn){
			return function(){
				var args = xtag.toArray(arguments);
				original.apply(this, args);
				fn.apply(this, args);
			}
		},

		merge: function(source, k, v){
			if (xtag.typeOf(k) == 'string') return mergeOne(source, k, v);
			for (var i = 1, l = arguments.length; i < l; i++){
				var object = arguments[i];
				for (var key in object) mergeOne(source, key, object[key]);
			}
			return source;
		},
		
		// DOM
		
		_matchSelector: Element.prototype.matchesSelector || Element.prototype[prefix.lowercase + 'MatchesSelector'],
		matchSelector: function(element, selector){
			return xtag._matchSelector.call(element, selector);
		},
		
		hasClass: function(element, klass){
			return !!~element.className.split(' ').indexOf(klass.replace(/\s/g, ''));
		},
		
		addClass: function(element, klass){
			if (!xtag.hasClass(element, klass)){
				var first = element.className[0];
				element.className = klass.replace(/\s/g, '') + (first == ' ' || !first ? '' : ' ') + element.className; 
			} 
			return element;
		},
		
		removeClass: function(element, klass){
			var klass = klass.replace(/\s/g, '');
			element.className = element.className.split(' ').filter(function(name){
					return name && name != klass;
				}).join(' ');
			return element;
		},
		
		toggleClass: function(element, className){
			return xtag[xtag.hasClass(element, className) ? 'removeClass' : 'addClass'].call(null, element, className);
		},
		
		query: function(element, selector){
			return xtag.toArray(element.querySelectorAll(selector));
		},

		queryChildren: function(element, selector){
			var id = element.id,
				guid = element.id = id || 'x_' + new Date().getTime(),
				attr = '#' + guid + ' > ',
				selector = attr + (selector + '').replace(',', ',' + attr, 'g');        
			var result = element.parentNode.querySelectorAll(selector);
			if (!id) element.id = null;
			return xtag.toArray(result);
		},

		createFragment: function(content){
			var frag = doc.createDocumentFragment();
			if (content) {
				var div = frag.appendChild(doc.createElement('div')),
					nodes = xtag.toArray(content.nodeName ? arguments : !(div.innerHTML = content) || div.children),
					index = nodes.length;
				while (index--) frag.insertBefore(nodes[index], div);
				frag.removeChild(div);
			}
			return frag;
		},
	
	/*** Pseudos ***/
		
		applyPseudos: function(key, fn){
			var action = fn, onAdd = {};
			if (key.match(':')){
				var split = key.match(/(\w+(?:\([^\)]+\))?)/g);
				for (var i = split.length - 1; i > 0; i--) {
					split[i].replace(/(\w*)(?:\(([^\)]*)\))?/, function(match, name, value){
						var lastPseudo = action,
							pseudo = xtag.pseudos[name],
							split = {
								key: key, 
								name: name,
								value: value
							};
						if (!pseudo) throw "pseudo not found: " + name;
						if (pseudo.onAdd) onAdd[name] = split;
						action = function(e){             
							return pseudo.listener.apply(this, [
								split,
								lastPseudo,
								xtag.toArray(arguments)
							]);
						}
					});
				}
				for (var z in onAdd){
					xtag.pseudos[z].onAdd.call(this, onAdd[z], action);
				}
			}
			return action;
		},
		
	/*** Events ***/
		
		parseEvent: function(type, fn){
			var pseudos = type.split(':'),
				key = pseudos.shift(),
				event = xtag.merge({
					base: key,
					pseudos: '',
					onAdd: function(){},
					onRemove: function(){},
					condition: function(){},
				}, xtag.customEvents[key] || {});
			event.type = key + (event.pseudos.length ? ':' + event.pseudos : '') + (pseudos.length ? ':' + pseudos.join(':') : '');
			if (fn) {
				var chained = xtag.applyPseudos(event.type, fn);
				event.compiled = function(){
					var args = xtag.toArray(arguments);
					if (event.condition.apply(this, args) === false) return false;
					return chained.apply(this, args);
				};
			}
			return event;
		},

		addEvent: function(element, type, fn){
			var event = typeof fn == 'function' ? xtag.parseEvent(type, fn) : fn;
			event.onAdd.call(element, event, event.compiled);
			xtag.toArray(event.base).forEach(function(name){
				element.addEventListener(name, event.compiled, !!~xtag.captureEvents.indexOf(name));
			});
			return event.compiled;
		},

		addEvents: function(element, events){
			for (var z in events) xtag.addEvent(element, z, events[z]);
		},

		removeEvent: function(element, type, fn){
			var event = xtag.parseEvent(type);
			event.onRemove.call(element, event, fn);
			xtag.removePseudos(element, event.type, fn);
			xtag.toArray(event.base).forEach(function(name){
				element.removeEventListener(name, fn);
			});
		},
		
	/*** Mixins ***/
	
		applyMixins: function(options){
			if (options.mixins) options.mixins.forEach(function(name){
				var mixin = xtag.mixins[name];
				for (var z in mixin) {
					switch (xtag.typeOf(mixin[z])){
						case 'function': 
							options[z] = options[z] ? 
							xtag.wrap(options[z], mixin[z]) : mixin[z];
						break;
						case 'object': 
							options[z] = xtag.merge({}, mixin[z], options[z]);
						break;
						default: options[z] = mixin[z];
					}
				}
			});
			return options;
		}
	
	};
	
	xtag.merge(xtag, doc.register.__polyfill__);
	
	if (typeof define == 'function' && define.amd) define(xtag);
	else win.xtag = xtag;

})();
