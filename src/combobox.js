'use strict';

/**
 * @ngdoc directive
 * @name combobox
 * @module ngComboBox
 *
 * @description
 * Renders an input box with tag editing support.
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} [displayProperty=text] Property to be rendered as the tag label.
 * @param {number=} tabindex Tab order of the control.
 * @param {string=} [placeholder=Add a tag] Placeholder text for the control.
 * @param {stinrg=} [disabledPlaceholder=''] An alternate placeholder to use when the combobox is disabled.
 * @param {number=} [minLength=3] Minimum length for a new tag.
 * @param {number=} maxLength Maximum length allowed for a new tag.
 * @param {number=} minTags Sets minTags validation error key if the number of tags added is less than minTags.
 * @param {number=} maxTags Sets maxTags validation error key if the number of tags added is greater than maxTags.
 * @param {boolean=} [allowLeftoverText=false] Sets leftoverText validation error key if there is any leftover text in
 *                                             the input element when the directive loses focus.
 * @param {string=} [removeTagSymbol=×] Symbol character for the remove tag button.
 * @param {boolean=} [addOnEnter=true] Flag indicating that a new tag will be added on pressing the ENTER key.
 * @param {boolean=} [addOnSpace=false] Flag indicating that a new tag will be added on pressing the SPACE key.
 * @param {boolean=} [addOnComma=true] Flag indicating that a new tag will be added on pressing the COMMA key.
 * @param {boolean=} [addOnBlur=true] Flag indicating that a new tag will be added when the input field loses focus.
 * @param {boolean=} [replaceSpacesWithDashes=true] Flag indicating that spaces will be replaced with dashes.
 * @param {boolean=} [showTotal=true] When true, if more than maxResultsToShow are available, a message will be added at the bottom to indicate extra.
 * @param {string=} [allowedTagsPattern=.+] Regular expression that determines whether a new tag is valid.
 * @param {boolean=} [enableEditingLastTag=false] Flag indicating that the last tag will be moved back into
 *                                                the new tag input box instead of being removed when the backspace key
 *                                                is pressed and the input box is empty.
 * @param {boolean=} [allowNew=false] Flag indicating that only tags coming from the autocomplete list will be allowed.
 *                                                   When this flag is true, addOnEnter, addOnComma, addOnSpace, addOnBlur and
 *                                                   allowLeftoverText values are ignored.
 * @param {boolean=} [confirmNew=True] This is only used when addFrom AutocompleteOnly is false. If true, the user 
 *                                      will be presented with a message to confirm before adding a new tag.
 * @param {expression} onTagAdded Expression to evaluate upon adding a new tag. The new tag is available as $tag.
 * @param {expression} onTagRemoved Expression to evaluate upon removing an existing tag. The removed tag is available as $tag.
 * @param {expression} newTagAdded Function to evaluate upon adding a new tag not in the suggestion list. 
 *                            The new tag will be passed as the only argument and will have a single property ('text').
 *                            This should always be a function which returns a promise, if the promise resloves to an object with property 'data', that data will replace the new tag.
 * @param {expression} source Expression to evaluate upon changing the input content. The input value is available as
 *                            $query. The result of the expression must be a promise that eventually resolves to an
 *                            array of strings.
 * @param {expression} secondarySource Expression to use if source returns zero items.
 * @param {number=} [debounceDelay=100] Amount of time, in milliseconds, to wait before evaluating the expression in
 *                                      the source option after the last keystroke.
 * @param {number=} [minLength=3] Minimum number of characters that must be entered before evaluating the expression
 *                                 in the source option.
 * @param {boolean=} [highlightMatchedText=true] Flag indicating that the matched text will be highlighted in the
 *                                               suggestions list.
 * @param {number=} [maxResultsToShow=10] Maximum number of results to be displayed at a time.
 * @param {string=} [loadingMsg=None] A message to be displayed while asynchronous results load.
 * @param {string=} [secondaryMsg=None] Like loadingMsg, but for use with secondarySource.
 * @param {string=} [savingMsg=None] Message to display while newTagAdded callback is executed.
 */
ngCombobox.directive('combobox', function ($timeout, $document, $sce, $q, grep, SuggestionList, TagList, encodeHTML, tagsInputConfig, matchSorter) {

  return {
    restrict: 'E',
    require: ['ngModel','?timepicker'],
    scope: {
      tags: '=ngModel',
      inputValue: '=?value',
      onTagAdded: '&',
      onTagRemoved: '&',
      newTagAdded: '=?',
      source: '=?',
      secondarySource: '=?',
      sortFunc: '=?',
    },
    replace: false,
    transclude: true,
    templateUrl: 'ngCombobox/combobox.html',
    controller: function ($scope, $attrs, $element) {
      tagsInputConfig.load('ngCombobox', $scope, $attrs, {
        placeholder: [String, ''],
        disabledPlaceholder: [String,''],
        tabindex: [Number],
        removeTagSymbol: [String, String.fromCharCode(215)],
        removeButton: [Boolean, true],
        replaceSpacesWithDashes: [Boolean, true],
        minLength: [Number, 2],
        maxLength: [Number],
        showTotal: [Boolean, true],
        addOnEnter: [Boolean, true],
        addOnTab: [Boolean, true],
        addOnSpace: [Boolean, false],
        addOnComma: [Boolean, true],
        addOnPeriod: [Boolean, true],
        addOnBlur: [Boolean, true],
        allowedTagsPattern: [RegExp, /.+/],
        enableEditingLastTag: [Boolean, false],
        minTags: [Number],
        maxTags: [Number],
        displayProperty: [String, 'text'],
        valueProperty: [String, 'value'],
        allowLeftoverText: [Boolean, false],
        allowNew: [Boolean, false],
        confirmNew: [Boolean, true],
        showAll: [Boolean, true],
        debounceDelay: [Number, 100],
        minSearchLength: [Number, 3],
        highlightMatchedText: [Boolean, true],
        maxResultsToShow: [Number, 10],
        loadingMsg: [String, ''],
        secondaryMsg: [String, ''],
        savingMsg: [String, ''],
      });

      $scope.events = new SimplePubSub();
      $scope.tagList = new TagList($scope.options, $scope.events);
      $scope.removeTag = function($index){
        if ( !$scope.isDisabled() ){
          $scope.tagList.remove($index);
        }
      };

    },
    link: {
      post: function (scope, element, attrs, ctrls) {
        var hotkeys = [KEYS.enter, KEYS.tab, KEYS.escape, KEYS.up, KEYS.down, KEYS.dot, KEYS.period, KEYS.space, KEYS.comma, KEYS.backspace],
          suggestionList,
          options = scope.options,
          getItemText,
          documentClick,
          sourceFunc,
          secondaryFunc,
          valueLookup,
          ngModelCtrl = ctrls[0],
          timepickerCtrl = ctrls[1],
          events = scope.events,
          input = element.find('input'),
          htmlOptions = element.find('option');
        
        //set options for timepicker
        if ( timepickerCtrl !== undefined ){
          scope.source = timepickerCtrl.timeMatcher;
          scope.newTagAdded = timepickerCtrl.timeValidator;
          valueLookup = timepickerCtrl.fromValue;
          if ( !attrs.hasOwnProperty('show-total') ){
            scope.options.showTotal = false;
          }
          if ( !attrs.hasOwnProperty('allowNew') ){
            scope.options.allowNew = true;
          }
          if ( !attrs.hasOwnProperty('removeButton') ){
          }
          scope.options.minSearchLength = 1;
          scope.options.confirmNew = false;
          scope.options.addOnPeriod = false;
          scope.options.replaceSpacesWithDashes = false;
        }
        
        if (htmlOptions.length > 0) {
          var tagsModel = [],
            source = [];
          if ( !ngModelCtrl.$isEmpty() ) {
            tagsModel = ngModelCtrl.$viewValue;
          }
          angular.forEach(htmlOptions, function (opt, index) {
            var optObj = {};
            optObj[options.valueProperty] = opt.value;
            optObj[options.displayProperty] = opt.label;
            source.push(optObj);
            if (opt.selected) {
              tagsModel.push(optObj);
            }
            angular.element(opt)
              .remove();
          });
          scope.source = source;
          if ( tagsModel.length > 0){
            options.placeholder = '';
          }
          ngModelCtrl.$setViewValue(tagsModel);
        }
        
        scope.isDisabled = function(){
          if ( !angular.isDefined(attrs.disabled) || attrs.disabled == false){
            return false;
          }
          if ( options.disabledPlaceholder ){
            input.attr('placeholder',options.disabledPlaceholder);  
          }
          return true;
        };
        
        events
          .on('tag-added', scope.onTagAdded)
          .on('tag-removed', scope.onTagRemoved)
          .on('tag-added', function () {
            scope.newTag.text = '';
            input.removeAttr('placeholder');
          })
          .on('tag-added tag-removed', function () {
            ngModelCtrl.$setViewValue(scope.tags);
            scope.$eval(attrs.ngChange);
          })
          .on('tag-added invalid-tag', function () {
            suggestionList.reset();
          })
          .on('invalid-tag', function () {
            scope.newTag.invalid = true;
          })
          .on('input-change', function (value) {
            scope.tagList.selected = null;
            scope.newTag.invalid = null;
            if (value) {
              suggestionList.load(value, scope.tags);
            } else {
              suggestionList.reset();
            }
          })
          .on('input-focus', function () {
            ngModelCtrl.$setValidity('leftoverText', true);
          })
          .on('input-blur', function () {
            if ( options.allowNew && !options.confirmNew ) {
              if ( options.addOnBlur ) {
                scope.tagList.addText(scope.newTag.text);
              }

              ngModelCtrl.$setValidity('leftoverText', options.allowLeftoverText ? true : !scope.newTag.text);
            }
          })
          .on('new-tag-added', function(tag){
            if ( scope.newTagAdded === undefined){
              return;
            }
            suggestionList.confirm = false;
            if ( options.savingMsg ){
              suggestionList.newSaving = true;
            }
            scope.newTagAdded(tag).then(function(result){
              if ( result === undefined){
                return;
              }
              if ( result.hasOwnProperty('data') ){
                for ( var prop in result.data ){
                  tag[prop] = result.data[prop];
                }
              }
            })["finally"](function(){
              suggestionList.newSaving = false;
            });
          });

        scope.newTag = {
          text: '',
          invalid: null,
          readonly: false,
        };

        scope.getDisplayText = function (tag) {
          return tag[options.displayProperty].trim();
        };

        scope.addNewTag = function(){
          scope.tagList.addText(scope.newTag.text);
        };
        
        scope.track = function (tag) {
          return tag[options.displayProperty];
        };
        
        scope.newTagChange = function () {
          events.trigger('input-change', scope.newTag.text);
        };
        
        scope.$watch('tags', function (value) {
          if ( value === undefined || value === null || (value.length>0 && value[0] === undefined) ){
            scope.tags = scope.tagList.items;
          }
          else{ scope.tags = makeObjectArray(value, options.displayProperty); }
          scope.tagList.items = scope.tags;
        });

        scope.$watch('tags.length', function (value) {
          scope.newTag.readonly = value >= options.maxTags;
          ngModelCtrl.$setValidity('maxTags', angular.isUndefined(options.maxTags) || value <= options.maxTags);
          ngModelCtrl.$setValidity('minTags', angular.isUndefined(options.minTags) || value >= options.minTags);
        });

        if (typeof (scope.source) === 'function') {
          sourceFunc = scope.source;
        } else {
          sourceFunc = getMatches('source');
        };
        
        if (typeof (scope.secondarySource) === 'function') {
          secondaryFunc = scope.secondarySource;
        }
        else if ( scope.secondarySource !== undefined ){
          secondaryFunc = getMatches('secondarySource');
        };

        suggestionList = new SuggestionList(sourceFunc, secondaryFunc, options);
        scope.suggestionList = suggestionList;

        getItemText = function (item) {
          return item[options.displayProperty];
        };

        scope.toggleSuggestionList = function () {
          if (suggestionList.visible) {
            suggestionList.reset();
          } 
          else if ( !scope.isDisabled() ){
            suggestionList.load(scope.newTag.text, scope.tags, true);
          }
        };
        
        scope.addSuggestion = function () {
          var added = false;

          if (scope.tags.length >= scope.options.maxTags) {
            scope.tags.pop();
          }

          if (suggestionList.selected) {
            scope.tagList.add(suggestionList.selected);
            suggestionList.reset();
            input[0].focus();

            added = true;
          }
          return added;
        };

        scope.highlight = function (item) {
          var text = getItemText(item);
          text = encodeHTML(text);
          if (options.highlightMatchedText) {
            text = replaceAll(text, encodeHTML(suggestionList.query), '<em>$&</em>');
          }
          return $sce.trustAsHtml(text);
        };

        scope.track = function (item) {
          return getItemText(item);
        };
        
        //Event handling
        var addKeys = {};
        addKeys[KEYS.enter] = options.addOnEnter;
        addKeys[KEYS.tab] = options.addOnTab;
        addKeys[KEYS.comma] = options.addOnComma;
        addKeys[KEYS.space] = options.addOnSpace;
        addKeys[KEYS.period] = options.addOnPeriod;
        addKeys[KEYS.dot] = options.addOnPeriod;
        scope.addKeys = addKeys;

        input
          .on('keydown', function (e) {
            
            var key = e.keyCode,
              isModifier = e.shiftKey || e.altKey || e.ctrlKey || e.metaKey,
              handled = false,
              shouldAdd, shouldRemove, shouldBlock;

            if (isModifier || hotkeys.indexOf(key) === -1) {
              return;
            }
            
            if (suggestionList.visible) {
              if (key === KEYS.down) {
                suggestionList.selectNext();
                handled = true;
              } else if (key === KEYS.up) {
                suggestionList.selectPrior();
                handled = true;
              } else if (key === KEYS.escape) {
                suggestionList.reset();
                handled = true;
              } else if (scope.addKeys[key]) {
                handled = scope.addSuggestion();
              }
            }
            else if (key === KEYS.down) {
              scope.toggleSuggestionList();
              handled = true;
            }

            shouldAdd = options.allowNew && addKeys[key] && !options.confirmNew;
            shouldRemove = !shouldAdd && key === KEYS.backspace && scope.newTag.text.length === 0;
            shouldBlock = !options.allowNew && scope.newTag.invalid && addKeys[key];

            if (shouldAdd) {
              scope.tagList.addText(scope.newTag.text);

              handled = true;
            } else if (shouldRemove) {
              var tag = scope.tagList.removeLast();
              if (tag && options.enableEditingLastTag) {
                scope.newTag.text = tag[options.displayProperty];
              }

              handled = true;
            } else if (shouldBlock) {
              scope.newTag.text = 'Invalid Entry...';
              scope.newTag.readonly = true;
              scope.$apply();
              $timeout(function () {
                scope.newTag.text = '';
                scope.newTag.readonly = false;
              }, 2000);
            }
            
            if (handled) {
              if (key !== KEYS.tab ){
                e.preventDefault();
              }
              scope.$apply();
            }
              
          })
          .on('focus', function () {
            if (scope.hasFocus) {
              return;
            }
            scope.hasFocus = true;
            events.trigger('input-focus');

            scope.$apply();
          })
          .on('blur', function () {
            $timeout(function () {
              var activeElement = $document.prop('activeElement'),
                lostFocusToBrowserWindow = activeElement === input[0],
                lostFocusToChildElement = element[0].contains(activeElement);

              if (lostFocusToBrowserWindow || !lostFocusToChildElement) {
                scope.hasFocus = false;
                suggestionList.reset();
                events.trigger('input-blur');
              }
            });
          });
        
        element.find('div')
          .on('click', function () {
            input[0].focus();
          });
          
        if ( scope.inputValue !== undefined ){
          //Set the initial model value based on JSON from value attr
          var thisVal,
            setInitialData,
            initialData = scope.inputValue;
          
          if ( !(initialData instanceof Array) ){
            initialData = [initialData];
          }
       
          
          setInitialData = function(source){
            for ( var i=0; i<initialData.length; i++){
              // thisVal = scope.source.filter(function(obj){return obj[options.valueProperty]==initialData[i];})[0];
              scope.newTag.text = initialData[i]; 
              scope.addNewTag();
            }
          };
          
          if ( scope.source.length === 0 ){
            var listener;
            options.placeholder = 'Loading Initial Data...';
            listener = scope.$watch('source', function(newVal,oldVal){
              if (newVal.length > 0){
                setInitialData();
                input.removeAttr('placeholder');
                listener();
              }
            });
          }
          setInitialData();
          element.removeAttr('value');
        }
        else if ( !(scope.tags instanceof Array) && scope.tags !== undefined ){
          //We got a single value, look for it in the source
          tagsModel = [];
          if (scope.source instanceof Array){
            tagsModel = scope.source.filter(function(obj){
              return obj[options.valueProperty] == scope.tags;
            });
          }
          else if ( valueLookup !== undefined){
            tagsModel = valueLookup(scope.tags);
          }
          ngModelCtrl.$setViewValue(tagsModel);
        };
        
        documentClick = function () {
          if (suggestionList.visible) {
            suggestionList.reset();
            scope.$apply();
          }
        };

        $document.on('click', documentClick);

        scope.$on('$destroy', function () {
          $document.off('click', documentClick);
        });
    
        function getMatches(sourceProp){
          return function getMatches($query) {
              var term = $query.$query.toLowerCase(),
                containsMatcher = new RegExp(term, 'i'),
                deferred = $q.defer(),
                matched = grep(scope[sourceProp], function (value) {
                  return containsMatcher.test(value[options.displayProperty]);
                });
              var sortFunc = scope.sortFunc || matchSorter;
              matched.sort(sortFunc(term, options.displayProperty));
              deferred.resolve(matched);
              return deferred.promise;
          };
        };
    
      }
    }
  };
});