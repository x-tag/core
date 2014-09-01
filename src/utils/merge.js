/*
  Recursively merges one object with another. The first argument is the destination object,
  all other objects passed in as arguments are merged from right to left, conflicts are overwritten
*/

function _mergeOne(source, key, current) {
    var type = xtag.typeOf(current);

    if (type === 'object' && xtag.typeOf(source[key]) === 'object') {
        xtag.merge(source[key], current);

    } else {
        source[key] = xtag.clone(current, type);
    }

    return source;
}

xtag.merge = function(source, k, v) {
    if (xtag.typeOf(k) === 'string') {
        return _mergeOne(source, k, v);
    }

    for (var i = 1, l = arguments.length; i < l; i++) {
        var object = arguments[i];
        for (var key in object) {
            _mergeOne(source, key, object[key]);
        }
    }

    return source;
};
