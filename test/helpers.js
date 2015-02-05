'use strict';

function generateArray(count, callback) {
  var array = [];
  for (var i = 1; i <= count; i++) {
    array.push(callback(i));
  }
  return array;
}

function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};
