/*!
 * ngCombobox v2.0.1
 * 
 *
 * Copyright (c) 2014-2014 Nate Dudenhoeffer
 *
 * Copyright (c) 2013-2014 Michael Benford
 * License: MIT
 *
 * Generated at 2014-07-04 14:20:26 -0500
 */
(function() {
'use strict';

var KEYS = {
  backspace: 8,
  tab: 9,
  enter: 13,
  escape: 27,
  space: 32,
  up: 38,
  down: 40,
  comma: 188,
  period: 190,
  dot: 110
};

function SimplePubSub() {
  var events = {};
  return {
    on: function (names, handler) {
      names.split(' ')
        .forEach(function (name) {
          if (!events[name]) {
            events[name] = [];
          }
          events[name].push(handler);
        });
      return this;
    },
    trigger: function (name, args) {
      angular.forEach(events[name], function (handler) {
        handler.call(null, args);
      });
      return this;
    }
  };
}

function makeObjectArray(array, key) {
  array = array || [];
  if (array.length > 0 && !angular.isObject(array[0])) {
    array.forEach(function (item, index) {
      array[index] = {};
      array[index][key] = item;
    });
  }
  return array;
}

function findInObjectArray(array, obj, key) {
  var item = null;
  for (var i = 0; i < array.length; i++) {
    // I'm aware of the internationalization issues regarding toLowerCase()
    // but I couldn't come up with a better solution right now
    if (array[i][key].toLowerCase() === obj[key].toLowerCase()) {
      item = array[i];
      break;
    }
  }
  return item;
}

function replaceAll(str, substr, newSubstr) {
  var expression = substr.replace(/([.?*+^$[\]\\(){}|-])/g, '\\$1');
  return str.replace(new RegExp(expression, 'gi'), newSubstr);
}



var ngCombobox = angular.module('ngCombobox', [])
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

ngCombobox.factory('SuggestionList',["$timeout","$interval","$q","$sce", function($timeout, $interval, $q, $sce){
  return function(primaryFn, secondaryFn, options) {
      var self = {},
        debounceDelay,debouncedLoadId,loadingInterval, getDifference, lastPromise;

      getDifference = function (array1, array2) {
        return array1.filter(function (item) {
          return !findInObjectArray(array2, item, options.displayProperty);
        });
      };

      self.reset = function () {
        lastPromise = null;
        debounceDelay = options.debounceDelay;

        self.items = [];
        self.visible = false;
        self.loading = false;
        self.confirm = false;
        self.index = -1;
        self.selected = null;
        self.query = null;

        $timeout.cancel(debouncedLoadId);
        $interval.cancel(loadingInterval);
      };
      self.show = function () {
        self.selected = null;
        self.visible = true;
        self.loading = false;
        self.select(0);
      };
      
      self.msgVisible = function(){
        return (self.confirm || self.newSaving || self.loading) && !self.visible;
      };
      
      self.loadingFn = function(msg){
        var count = 0;
        loadingInterval = $interval(function(){
          count ++;
          var dots = new Array(count % 6).join('.');
          self.msg = msg + dots;
        }, 250);
      };
      
      self.load = function (query, tags, force, loadFn) {
        if (query.length < options.minSearchLength && !force) {
          self.reset();
          return;
        }
        
        if ( loadFn == undefined ){
          loadFn = primaryFn;
        }
        
        $interval.cancel(loadingInterval);
        self.msg = angular.copy(options.loadingMsg);
        if ( loadFn == secondaryFn ){
          self.msg = angular.copy(options.secondaryMsg);
        }

        $timeout.cancel(debouncedLoadId);
        debouncedLoadId = $timeout(function () {
          self.query = query;

          var promise = loadFn({
            $query: query
          });
          if ( self.msg ){
            self.loadingFn(self.msg);
            $timeout(function(){self.loading = true;});
          };
          lastPromise = promise;

          promise.then(function (items) {
            if (promise !== lastPromise) {
              return;
            }

            items = makeObjectArray(items.data || items, options.displayProperty);
            items = getDifference(items, tags);
            if ( secondaryFn && items.length === 0 &&  loadFn === primaryFn){
              self.visible = false;
              return self.load(query, tags, force, secondaryFn);
            }
            self.more = Math.max(0,items.length - options.maxResultsToShow);
            if ( self.more > 100 ){
              self.more = 'many';
            }
            self.items = items.slice(0, options.maxResultsToShow);

            if (self.items.length > 0) {
              self.show();
            } else {
              self.reset();
              if ( options.allowNew && options.confirmNew){
                self.confirm = query + ' not found. Click to create it';
                debounceDelay = 0;
              }
            }
          });
        }, debounceDelay, false);
      };
      
      self.selectNext = function () {
        self.select(++self.index);
      };
      
      self.selectPrior = function () {
        self.select(--self.index);
      };
      self.select = function (index) {
        if (index < 0) {
          index = self.items.length - 1;
        } else if (index >= self.items.length) {
          index = 0;
        }
        self.index = index;
        self.selected = self.items[index];
      };

      self.reset();

      return self;
    };
}])
.factory('encodeHTML',function(){
  return function(value) {
    return value.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  };
})
.factory('TagList',function(){
  return function(options, events) {
    var self = {},
      getTagText, setTagText, tagIsValid;

    getTagText = function (tag) {
      return tag[options.displayProperty];
    };

    setTagText = function (tag, text) {
      tag[options.displayProperty] = text;
    };

    tagIsValid = function (tag) {
      var tagText = getTagText(tag);

      return tagText.length >= options.minLength &&
        tagText.length <= (options.maxLength || tagText.length) &&
        options.allowedTagsPattern.test(tagText) &&
        !findInObjectArray(self.items, tag, options.displayProperty);
    };

    self.items = [];

    self.addText = function (text) {
      if ( !text ){
        return;
      }
      var tag = {};
      setTagText(tag, text);
      events.trigger('new-tag-added', tag);
      return self.add(tag);
    };

    self.add = function (tag) {
      var tagText = getTagText(tag)
        .trim();

      if (options.replaceSpacesWithDashes) {
        tagText = tagText.replace(/\s/g, '-');
      }

      setTagText(tag, tagText);

      if (tagIsValid(tag)) {
        self.items.push(tag);
        events.trigger('tag-added', {
          $tag: tag
        });
      } else {
        events.trigger('invalid-tag', {
          $tag: tag
        });
      }

      return tag;
    };

    self.remove = function (index) {
      var tag = self.items.splice(index, 1)[0];
      events.trigger('tag-removed', {
        $tag: tag
      });
      return tag;
    };

    self.removeLast = function () {
      var tag, lastTagIndex = self.items.length - 1;

      if (options.enableEditingLastTag || self.selected) {
        self.selected = null;
        tag = self.remove(lastTagIndex);
      } else if (!self.selected) {
        self.selected = self.items[lastTagIndex];
      }

      return tag;
    };

    return self;
  };
});

  

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
 * @param {expression} NewTagAdded Function to evaluate upon adding a new tag not in the suggestion list. 
 *                            The new tag will be passed as the only agrument and will only have a single property ('text').
 *                            This should always be a function which returns a promise, if the promise reslove object with property 'data', that data will replace the new tag.
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
ngCombobox.directive('combobox', ["$timeout","$document","$sce","$q","grep","SuggestionList","TagList","encodeHTML","tagsInputConfig", function ($timeout, $document, $sce, $q, grep, SuggestionList, TagList, encodeHTML, tagsInputConfig) {
  
  return {
    restrict: 'E',
    require: 'ngModel',
    scope: {
      tags: '=ngModel',
      onTagAdded: '&',
      onTagRemoved: '&',
      newTagAdded: '=?',
      source: '=?',
      secondarySource: '=?',
    },
    replace: false,
    transclude: true,
    templateUrl: 'ngCombobox/combobox.html',
    controller: ["$scope","$attrs","$element", function ($scope, $attrs, $element) {
      tagsInputConfig.load('ngCombobox', $scope, $attrs, {
        placeholder: [String, ''],
        disabledPlaceholder: [String,''],
        tabindex: [Number],
        removeTagSymbol: [String, String.fromCharCode(215)],
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

    }],
    link: {
      post: function (scope, element, attrs, ngModelCtrl) {
        var hotkeys = [KEYS.enter, KEYS.tab, KEYS.escape, KEYS.up, KEYS.down, KEYS.dot, KEYS.period, KEYS.space, KEYS.comma, KEYS.backspace],
          suggestionList,
          options = scope.options,
          getItemText,
          documentClick,
          sourceFunc,
          secondaryFunc,
          tagList = scope.tagList,
          events = scope.events,
          input = element.find('input'),
          htmlOptions = element.find('option');

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
        else if ( attrs.hasOwnProperty('value') ){
          //Set the initial model value based on JSON from value attr
          var thisVal,
            setInitialData,
            tagsModel = [],
            initialData = JSON.parse(attrs.value);
            
          if ( !(initialData instanceof Array) ){
            initialData = [initialData];
          }
          
          setInitialData = function(source){
            for ( var i=0; i<initialData.length; i++){
             thisVal = scope.source.filter(function(obj){return obj[options.valueProperty]==initialData[i];})[0];
             if ( thisVal !== undefined ){
               tagsModel.push(thisVal);
             }
            }
            ngModelCtrl.$setViewValue(tagsModel);
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
        };
        
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
            tagList.selected = null;
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
                tagList.addText(scope.newTag.text);
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
          tagList.addText(scope.newTag.text);
        };
        
        scope.track = function (tag) {
          return tag[options.displayProperty];
        };
        
        scope.newTagChange = function () {
          events.trigger('input-change', scope.newTag.text);
        };
        
        scope.$watch('tags', function (value) {
          scope.tags = makeObjectArray(value, options.displayProperty);
          tagList.items = scope.tags;
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
              tagList.addText(scope.newTag.text);

              scope.$apply();
              e.preventDefault();
            } else if (shouldRemove) {
              var tag = tagList.removeLast();
              if (tag && options.enableEditingLastTag) {
                scope.newTag.text = tag[options.displayProperty];
              }

              scope.$apply();
              e.preventDefault();
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
              var term = $query.$query,
                containsMatcher = new RegExp(term, 'i'),
                deferred = $q.defer(),
                matched = grep(scope[sourceProp], function (value) {
                  return containsMatcher.test(value[options.displayProperty]);
                });
              matched.sort(function (a, b) {
                if (a[options.displayProperty].indexOf(term) === 0 || b[options.displayProperty].indexOf(term) === 0) {
                  return a[options.displayProperty].indexOf(term) - b[options.displayProperty].indexOf(term);
                }
                return 0;
              });
              deferred.resolve(matched);
              return deferred.promise;
          };
        };
    
      }
    }
  };
}]);

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

/**
 * @ngdoc service
 * @name tagsInputConfig
 * @module ngTagsInput
 *
 * @description
 * Sets global configuration settings for both tagsInput and autoComplete directives. It's also used internally to parse and
 * initialize options from HTML attributes.
 */
ngCombobox.provider('tagsInputConfig', function () {
  var globalDefaults = {},
    interpolationStatus = {};

  /**
   * @ngdoc method
   * @name setDefaults
   * @description Sets the default configuration option for a directive.
   * @methodOf tagsInputConfig
   *
   * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'autoComplete'.
   * @param {object} defaults Object containing options and their values.
   *
   * @returns {object} The service itself for chaining purposes.
   */
  this.setDefaults = function (directive, defaults) {
    globalDefaults[directive] = defaults;
    return this;
  };

  /***
   * @ngdoc method
   * @name setActiveInterpolation
   * @description Sets active interpolation for a set of options.
   * @methodOf tagsInputConfig
   *
   * @param {string} directive Name of the directive to be configured. Must be either 'tagsInput' or 'autoComplete'.
   * @param {object} options Object containing which options should have interpolation turned on at all times.
   *
   * @returns {object} The service itself for chaining purposes.
   */
  this.setActiveInterpolation = function (directive, options) {
    interpolationStatus[directive] = options;
    return this;
  };

  this.$get = ["$interpolate", function ($interpolate) {
    var converters = {};
    converters[String] = function (value) {
      return value;
    };
    converters[Number] = function (value) {
      return parseInt(value, 10);
    };
    converters[Boolean] = function (value) {
      return value.toLowerCase() === 'true';
    };
    converters[RegExp] = function (value) {
      return new RegExp(value);
    };

    return {
      load: function (directive, scope, attrs, options) {
        scope.options = {};

        angular.forEach(options, function (value, key) {
          var type, localDefault, converter, getDefault, updateValue;

          type = value[0];
          localDefault = value[1];
          converter = converters[type];

          getDefault = function () {
            var globalValue = globalDefaults[directive] && globalDefaults[directive][key];
            return angular.isDefined(globalValue) ? globalValue : localDefault;
          };

          updateValue = function (value) {
            scope.options[key] = value ? converter(value) : getDefault();
          };

          if (interpolationStatus[directive] && interpolationStatus[directive][key]) {
            attrs.$observe(key, function (value) {
              updateValue(value);
            });
          } else {
            updateValue(attrs[key] && $interpolate(attrs[key])(scope.$parent));
          }
        });
      }
    };
  }];
});

/* HTML templates */
ngCombobox.run(["$templateCache", function($templateCache) {
    $templateCache.put('ngCombobox/combobox.html',
    "<div class=\"host\" ng-class=\"{'input-group': options.showAll && source}\" tabindex=\"-1\" ti-transclude-prepend=\"\"><div class=\"tags\" ng-class=\"{'focused': hasFocus, 'disabled':isDisabled()}\"><ul class=\"tag-list\"><li class=\"tag-item\" ng-repeat=\"tag in tagList.items track by $id(tag)\" ng-class=\"{ selected: tag == tagList.selected }\"><span>{{getDisplayText(tag)}}</span> <a class=\"remove-button\" ng-click=\"removeTag($index)\">{{options.removeTagSymbol}}</a></li></ul><input class=\"input\" placeholder=\"{{options.placeholder}}\" tabindex=\"{{options.tabindex}}\" ng-model=\"newTag.text\" ng-readonly=\"newTag.readonly\" ng-change=\"newTagChange()\" ng-trim=\"false\" ng-class=\"{'invalid-tag': newTag.invalid}\" ng-disabled=\"isDisabled()\" ti-autosize=\"\"></div><div class=\"autocomplete\" ng-show=\"suggestionList.visible || suggestionList.msgVisible()\"><!-- Messages --><ul class=\"suggestion-list\" ng-hide=\"suggestionList.visible\"><li class=\"suggestion-item\" ng-click=\"addNewTag()\" ng-show=\"suggestionList.confirm\">{{ suggestionList.confirm }}</li><li class=\"suggestion-item\" ng-show=\"suggestionList.newSaving\">{{ options.savingMsg }}</li><li class=\"suggestion-item\" ng-show=\"suggestionList.loading && !suggestionList.confirm\">{{ suggestionList.msg }}</li></ul><!-- Actual Suggestions --><ul class=\"suggestion-list\" ng-show=\"suggestionList.visible\"><li class=\"suggestion-item\" ng-repeat=\"item in suggestionList.items track by $id(item)\" ng-class=\"{selected: item == suggestionList.selected}\" ng-click=\"addSuggestion()\" ng-mouseenter=\"suggestionList.select($index)\" ng-bind-html=\"highlight(item)\"></li><li class=\"suggestion-item\" ng-show=\"options.showTotal && suggestionList.more\">... and {{ suggestionList.more }} more</li></ul></div><span class=\"input-group-addon\" ng-if=\"options.showAll\" ng-click=\"toggleSuggestionList();\"><span class=\"ui-button-icon-primary ui-icon ui-icon-triangle-1-s\"><span class=\"ui-button-text\" style=\"padding: 0px\">&nbsp;</span></span></span></div>"
  );
}]);

}());