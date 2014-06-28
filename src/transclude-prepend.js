'use strict';

/**
 * @ngdoc directive
 * @name tiTranscludeAppend
 * @module ngTagsInput
 *
 * @description
 * Re-creates the old behavior of ng-transclude. Used internally by ngCombobox directive.
 */
ngCombobox.directive('tiTranscludePrepend', function () {
  return function (scope, element, attrs, ctrl, transcludeFn) {
    transcludeFn(function (clone) {
      element.prepend(clone);
    });
  };
});