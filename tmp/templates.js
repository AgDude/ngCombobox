/* HTML templates */
tagsInput.run(function($templateCache) {
  'use strict';

  $templateCache.put('ngTagsInput/tags-input.html',
    "<div class=\"host\" ng-class=\"{'input-group': options.showAll && source}\" tabindex=\"-1\" ti-transclude-prepend=\"\"><div class=\"tags\" ng-class=\"{focused: hasFocus}\"><ul class=\"tag-list\"><li class=\"tag-item\" ng-repeat=\"tag in tagList.items track by $id(tag)\" ng-class=\"{ selected: tag == tagList.selected }\"><span>{{getDisplayText(tag)}}</span> <a class=\"remove-button\" ng-click=\"tagList.remove($index)\">{{options.removeTagSymbol}}</a></li></ul><input class=\"input\" placeholder=\"{{options.placeholder}}\" tabindex=\"{{options.tabindex}}\" ng-model=\"newTag.text\" ng-readonly=\"newTag.readonly\" ng-change=\"newTagChange()\" ng-trim=\"false\" ng-class=\"{'invalid-tag': newTag.invalid}\" ti-autosize=\"\"></div><auto-complete debounce-delay=\"{{options.debounceDelay}}\" min-search-length=\"{{options.minSearchLength}}\" highlight-matched-text=\"{{options.highlightMatchedText}}\" maxresults-to-show=\"{{options.maxResultsToShow}}\"></auto-complete><span class=\"input-group-addon\" ng-if=\"options.showAll\" ng-click=\"toggleSuggestionList();\"><span class=\"ui-button-icon-primary ui-icon ui-icon-triangle-1-s\"><span class=\"ui-button-text\" style=\"padding: 0px\">&nbsp;</span></span></span></div>"
  );


  $templateCache.put('ngTagsInput/auto-complete.html',
    "<div class=\"autocomplete\" ng-show=\"suggestionList.visible\"><ul class=\"suggestion-list\"><li class=\"suggestion-item\" ng-repeat=\"item in suggestionList.items track by $id(item)\" ng-class=\"{selected: item == suggestionList.selected}\" ng-click=\"addSuggestion()\" ng-mouseenter=\"suggestionList.select($index)\" ng-bind-html=\"highlight(item)\"></li></ul></div>"
  );
});
