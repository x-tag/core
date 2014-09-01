/*
  ----- This should be simplified! -----
  Generates a random ID string
*/
xtag.uid = function() {
  return Math.random().toString(36).substr(2, 10);
};
