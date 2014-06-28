'use strict';

var tagsInput = angular.module('ngTagsInput', [])
  .factory('grep', function () {
    //Copied from jquery.grep
    return function (elems, callback, invert) {
      var callbackInverse,
        matches = [],
        i = 0,
        length = elems.length,
        callbackExpect = !invert;

      // Go through the array, only saving the items
      // that pass the validator function
      for (; i < length; i++) {
        callbackInverse = !callback(elems[i], i);
        if (callbackInverse !== callbackExpect) {
          matches.push(elems[i]);
        }
      };
      return matches;
    };
  });