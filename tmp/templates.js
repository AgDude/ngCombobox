/* HTML templates */
tagsInput.run(function($templateCache) {
  'use strict';

  $templateCache.put('ngTagsInput/tags-input.html',
    "<div class=\"host\" tabindex=\"-1\" ti-transclude-append=\"\"><div class=\"tags\" ng-class=\"{focused: hasFocus}\"><ul class=\"tag-list\"><li class=\"tag-item\" ng-repeat=\"tag in tagList.items track by $id(tag)\" ng-class=\"{ selected: tag == tagList.selected }\"><span>{{getDisplayText(tag)}}</span> <a class=\"remove-button\" ng-click=\"tagList.remove($index)\">{{options.removeTagSymbol}}</a></li></ul><input class=\"input\" placeholder=\"{{options.placeholder}}\" tabindex=\"{{options.tabindex}}\" ng-model=\"newTag.text\" ng-readonly=\"newTag.readonly\" ng-change=\"newTagChange()\" ng-trim=\"false\" ng-class=\"{'invalid-tag': newTag.invalid}\" ti-autosize=\"\"></div></div>"
  );


  $templateCache.put('ngTagsInput/auto-complete.html',
    "<div class=\"autocomplete\" ng-show=\"suggestionList.visible\"><ul class=\"suggestion-list\"><li class=\"suggestion-item\" ng-repeat=\"item in suggestionList.items track by $id(item)\" ng-class=\"{selected: item == suggestionList.selected}\" ng-click=\"addSuggestion()\" ng-mouseenter=\"suggestionList.select($index)\" ng-bind-html=\"highlight(item)\"></li></ul></div>"
  );
});
