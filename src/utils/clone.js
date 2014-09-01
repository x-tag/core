xtag.clone = function clone(item, type) {
    type = type || xtag.typeOf(item);
    var fn = xtag.clone[type];
    return fn ? fn(item) : item;
};

xtag.clone.object = function(src) {
    var obj = {};
    for (var key in src) obj[key] = clone(src[key]);
    return obj;
};

xtag.clone.array = function(src) {
    var i = src.length, array = new Array(i);
    while (i--) array[i] = clone(src[i]);
    return array;
};
