function parseMutations(element, mutations) {
  var diff = { added: [], removed: [] };
  mutations.forEach(function(record){
    record._mutation = true;
    for (var z in diff) {
      var type = element._records[(z == 'added') ? 'inserted' : 'removed'],
        nodes = record[z + 'Nodes'], length = nodes.length;
      for (var i = 0; i < length && diff[z].indexOf(nodes[i]) == -1; i++){
        diff[z].push(nodes[i]);
        type.forEach(function(fn){
          fn(nodes[i], record);
        });
      }
    }
  });
}
