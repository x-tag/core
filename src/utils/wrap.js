xtag.wrap = function(original, fn) {
    return function() {
        var args = arguments;
        var output = original.apply(this, args);        
        fn.apply(this, args);
        return output;
    };
};
