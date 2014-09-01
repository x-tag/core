xtag.clone = function(item, type) {
    type = type || xtag.typeOf(item);
    return (xtag.clone[type] ? xtag.clone[type](item) : item);
};

xtag.clone.object = function(src) {
    var obj = {};

    for (var key in src) {
        if (src.hasOwnProperty(key)) {
            obj[key] = xtag.clone(src[key]);
        }
    }

    return obj;
};

xtag.clone.array = function(src) {
    var l = src.length;
    var array = new Array(l);
    
    while (l--) {
        array[l] = xtag.clone(src[l]);
    }

    return array;
};
