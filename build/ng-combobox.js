/*!
 * ngCombobox v2.0.1
 * 
 *
 * Copyright (c) 2014-2014 Nate Dudenhoeffer
 *
 * Copyright (c) 2013-2014 Michael Benford
 * License: MIT
 *
 * Generated at 2014-07-30 05:52:55 -0500
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



var ngCombobox = angular.module('ngCombobox', []);
  

ngCombobox.factory('SuggestionList', ["$timeout","$interval","$q","$sce", function ($timeout, $interval, $q, $sce) {
  return function (primaryFn, secondaryFn, options) {
    var self = {},
      debounceDelay, debouncedLoadId, loadingInterval, getDifference, lastPromise;

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

    self.msgVisible = function () {
      return (self.confirm || self.newSaving || self.loading) && !self.visible;
    };

    self.loadingFn = function (msg) {
      var count = 0;
      loadingInterval = $interval(function () {
        count++;
        var dots = new Array(count % 6).join('.');
        self.msg = msg + dots;
      }, 250);
    };

    self.load = function (query, tags, force, loadFn) {
      if (query.length < options.minSearchLength && !force) {
        self.reset();
        return;
      }

      if (loadFn === undefined) {
        loadFn = primaryFn;
      }

      $interval.cancel(loadingInterval);
      self.msg = angular.copy(options.loadingMsg);
      if (loadFn === secondaryFn) {
        self.msg = angular.copy(options.secondaryMsg);
      }

      $timeout.cancel(debouncedLoadId);
      debouncedLoadId = $timeout(function () {
        self.query = query;

        var promise = loadFn({
          $query: query
        });
        if (self.msg) {
          self.loadingFn(self.msg);
          $timeout(function () {
            self.loading = true;
          });
        }
        ;
        lastPromise = promise;

        promise.then(function (items) {
          if (promise !== lastPromise) {
            return;
          }

          items = makeObjectArray(items.data || items, options.displayProperty);
          items = getDifference(items, tags);
          if (secondaryFn && items.length === 0 && loadFn === primaryFn) {
            self.visible = false;
            return self.load(query, tags, force, secondaryFn);
          }
          self.more = Math.max(0, items.length - options.maxResultsToShow);
          if (self.more > 100) {
            self.more = 'many';
          }
          self.items = items.slice(0, options.maxResultsToShow);

          if (self.items.length > 0) {
            self.show();
          } else {
            self.reset();
            if (options.allowNew && options.confirmNew) {
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
  .factory('encodeHTML', function () {
    return function (value) {
      return value.replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');
    };
  })
  .factory('TagList', function () {
    return function (options, events) {
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
          options.allowedTagsPattern.test(tagText) && !findInObjectArray(self.items, tag, options.displayProperty);
      };

      self.items = [];

      self.addText = function (text) {
        if (!text) {
          return;
        }
        var tag = {};
        setTagText(tag, text);
        events.trigger('new-tag-added', tag);
        return self.add(tag);
      };

      self.add = function (tag) {
        var tagText = getTagText(tag);
        tagText = isNaN(tagText) ? tagText.trim() : tagText.toString();

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
  })
  .factory('matchSorter', function () {
    return function (term, displayProperty) {
      displayProperty = displayProperty === undefined ? 'text' : displayProperty;
      if (!term) {
        return function (a, b) {
          //sort alphabetically by displayProperty
          if (a[displayProperty].toLowerCase() < b[displayProperty].toLowerCase()) { return -1; }
          if (a[displayProperty].toLowerCase() > b[displayProperty].toLowerCase()) { return 1; }
          return 0;
        };
      }
      return function (a, b) {
        if (a[displayProperty].toLowerCase().indexOf(term) === 0 || b[displayProperty].toLowerCase().indexOf(term) === 0) {
          return a[displayProperty].toLowerCase().indexOf(term) - b[displayProperty].toLowerCase().indexOf(term);
        }
        return 0;
      };
    };
  })
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
      }
      ;
      return matches;
    };
  })
  .factory('isUndefined', function () {
    return function (value, empty) {
      if (angular.isUndefined(value) || value === null) {
        return true;
      }
      if (value.length === 1 && angular.isUndefined(value[0])) {
        return true;
      }
      if (empty && value.length === 0) {
        return true;
      }
      return false;
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
 * @param {string=} [disabledPlaceholder=''] An alternate placeholder to use when the combobox is disabled.
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
 * @param {expression} valueLookup a separate source function to use for initial data. One common use case is that typically searching is done by the displayProperty,
 *                            but initial data may be provided as a primarykey (valueProperty)
 * @param {expression} secondarySource Expression to use if source returns zero items.
 * @param {expression} sortFunc should be a function which takes term as its first param and options.displayPropert as the second. It should return a sorting function accepting a, b
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
 * @param {boolean=} [autofocus] If true, sets the auto-focus HTML5 attribute on the input element
 */
ngCombobox.directive('combobox', ["$timeout","$document","$sce","$q","grep","SuggestionList","TagList","encodeHTML","tagsInputConfig","matchSorter","isUndefined", function ($timeout, $document, $sce, $q, grep, SuggestionList, TagList, encodeHTML, tagsInputConfig, matchSorter, isUndefined) {

  return {
    restrict: 'E',
    require: ['ngModel', '?timepicker', '^?form'],
    scope: {
      tags: '=ngModel',
      inputValue: '=?value',
      onTagAdded: '&',
      onTagRemoved: '&',
      newTagAdded: '=?',
      source: '=?',
      secondarySource: '=?',
      valueLookup: '=?',
      sortFunc: '=?'
    },
    replace: false,
    transclude: true,
    templateUrl: 'ngCombobox/combobox.html',
    controller: ["$scope","$attrs","$element", function ($scope, $attrs, $element) {
      tagsInputConfig.load('ngCombobox', $scope, $attrs, {
        placeholder: [String, ''],
        disabledPlaceholder: [String, ''],
        tabindex: [Number],
        removeTagSymbol: [String, String.fromCharCode(215)],
        removeButton: [Boolean, true],
        replaceSpacesWithDashes: [Boolean, true],
        minLength: [Number, 1],
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
        minTags: [Number, 0],
        maxTags: [Number, 999],
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
        autofocus: [Boolean, false]
      });

      $scope.events = new SimplePubSub();
      $scope.tagList = new TagList($scope.options, $scope.events);
      $scope.removeTag = function ($index) {
        if (!$scope.isDisabled()) {
          $scope.tagList.remove($index);
        }
      };

    }],
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
          tagsFromValue,
          ngModelCtrl = ctrls[0],
          timepickerCtrl = ctrls[1],
          events = scope.events,
          input = element.find('input'),
          htmlOptions = element.find('option'),
          addOnLookup = {};

        if (options.autofocus) {
          input.attr('autofocus', true);
        }
        //create a lookup for dealing with lack of keyCodes on Android Chrome
        addOnLookup[' '] = options.addOnSpace ? KEYS.space : undefined;
        addOnLookup[','] = options.addOnComma ? KEYS.comma : undefined;
        addOnLookup['.'] = options.addOnPeriod ? KEYS.period : undefined;

        options.currentPlaceholder = options.placeholder;
        //override the $isEmpty on ngModel to include an empty Array.
        ngModelCtrl.$isEmpty = function (value) {
          return angular.isUndefined(value) || value === '' || value === null || value !== value || value.length === 0;
        };

        //set options for timepicker
        if (timepickerCtrl !== undefined) {
          scope.source = timepickerCtrl.timeMatcher;
          scope.newTagAdded = timepickerCtrl.timeValidator;
          valueLookup = timepickerCtrl.fromValue;
          if (!attrs.hasOwnProperty('show-total')) {
            scope.options.showTotal = false;
          }
          if (!attrs.hasOwnProperty('allowNew')) {
            scope.options.allowNew = true;
          }
//          if (!attrs.hasOwnProperty('removeButton')) {
//          }
          scope.options.minSearchLength = 1;
          scope.options.confirmNew = false;
          scope.options.addOnPeriod = false;
          scope.options.replaceSpacesWithDashes = false;
        }
        else {
          valueLookup = scope.valueLookup;
        }

        if (htmlOptions.length > 0) {
          var tagsModel = [],
            source = [];
          if (!ngModelCtrl.$isEmpty()) {
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
          ngModelCtrl.$setViewValue(tagsModel);
          ngModelCtrl.$setPristine();

          //Look for a form controller, and set the initial value
          if (!angular.isUndefined(ctrls[2]) && !angular.isUndefined(ctrls[2].initial_data)) {
            ctrls[2].initial_data[attrs.name] = angular.copy(ngModelCtrl.$modelValue);
          }
        }

        scope.isDisabled = function () {
          if (!angular.isDefined(attrs.disabled) || attrs.disabled === false) {
            return false;
          }
          if (options.disabledPlaceholder) {
            options.currentPlaceholder = options.disabledPlaceholder;
          }
          return true;
        };

        events
          .on('tag-added', scope.onTagAdded)
          .on('tag-removed', scope.onTagRemoved)
          .on('tag-added', function () {
            scope.newTag.text = '';
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
            if (options.allowNew && !options.confirmNew) {
              if (options.addOnBlur) {
                scope.tagList.addText(scope.newTag.text);
              }

              ngModelCtrl.$setValidity('leftoverText', options.allowLeftoverText ? true : !scope.newTag.text);
            }
          })
          .on('new-tag-added', function (tag) {
            if (scope.newTagAdded === undefined) {
              return;
            }
            suggestionList.confirm = false;
            if (options.savingMsg) {
              suggestionList.newSaving = true;
            }
            scope.newTagAdded(tag).then(function (result) {
              if (result === undefined) {
                return;
              }
              if (result.hasOwnProperty('data')) {
                for (var prop in result.data) {
                  tag[prop] = result.data[prop];
                }
              }
            })['finally'](function () {
              suggestionList.newSaving = false;
            });
          });

        scope.newTag = {
          text: '',
          invalid: null,
          readonly: false
        };
        tagsFromValue = function (value) {
          // returns a promise resolving to an array which will also be set on the model
          var deferred = $q.defer();
          if (isUndefined(value, true)) {
            deferred.resolve();
            return deferred.promise;
          }
          if (valueLookup !== undefined) {
            valueLookup(value).then(function (result) {
              deferred.resolve(result);
            });
          }
          else if (scope.source instanceof Array) {
            deferred.resolve(scope.source.filter(function (obj) {
              return obj[options.valueProperty] === value || (!isNaN(value) && obj[options.valueProperty] === value.toString());
            }));
          }
          else {
            deferred.resolve([]);
          }

          deferred.promise.then(function (tagsModel) {
            ngModelCtrl.$setViewValue(tagsModel);
            ngModelCtrl.$setPristine();
          });
          return deferred.promise;
        };

        scope.getDisplayText = function (tag) {
          return tag[options.displayProperty].trim();
        };

        scope.addNewTag = function () {
          scope.tagList.addText(scope.newTag.text);
        };

        scope.track = function (tag) {
          return tag[options.displayProperty];
        };

        scope.newTagChange = function () {
          events.trigger('input-change', scope.newTag.text);
        };

        scope.$watch('tags', function (value) {
          if (value === undefined || value === null || (value.length > 0 && value[0] === undefined)) {
            // If it is undefined, set it to an empty array
            scope.tags = [];
          }
          else if (value instanceof Object && value.hasOwnProperty('fromValue')) {
            return tagsFromValue(value.fromValue);
          }
          else {
            scope.tags = makeObjectArray(value, options.displayProperty);
          }
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
        }

        if (typeof (scope.secondarySource) === 'function') {
          secondaryFunc = scope.secondarySource;
        }
        else if (scope.secondarySource !== undefined) {
          secondaryFunc = getMatches('secondarySource');
        }

        suggestionList = new SuggestionList(sourceFunc, secondaryFunc, options);
        scope.suggestionList = suggestionList;

        getItemText = function (item) {
          return item[options.displayProperty];
        };

        scope.toggleSuggestionList = function () {
          if (suggestionList.visible) {
            suggestionList.reset();
          }
          else if (!scope.isDisabled()) {
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

            if (key === 0) {
              key = addOnLookup[scope.newTag.text.slice(-1)];
            }

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
              if (key !== KEYS.tab) {
                e.preventDefault();
              }
              scope.$apply();
            }

          })
          .on('focus', function () {
            if (scope.hasFocus) {
              return;
            }
            $timeout(function () {
              scope.hasFocus = true;
              events.trigger('input-focus');
            });
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

        if (scope.inputValue !== undefined) {
          //Set the initial model value based on JSON or primitive from value attr
          var setInitialData,
            initialData = scope.inputValue;

          if (!(initialData instanceof Array)) {
            initialData = [initialData];
          }

          setInitialData = function (source) {
            for (var i = 0; i < initialData.length; i++) {
              if (!tagsFromValue(initialData[i])) {
                scope.newTag.text = initialData[i];
                scope.addNewTag();
                scope.newTag.text = '';
              }
            }
          };

          if (scope.source.length === 0) {
            var listener;
            options.currentPlaceholder = 'Loading Initial Data...';
            listener = scope.$watch('source', function (newVal, oldVal) {
              if (newVal.length > 0) {
                setInitialData();
                listener();
              }
            });
          }
          setInitialData();
          element.removeAttr('value');
        }

        if (!(scope.tags instanceof Array) && scope.tags !== undefined) {
          //We got a single value, look for it in the source
          tagsFromValue(scope.tags);
        }

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

        function getMatches(sourceProp) {
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
        }
      }
    }
  };
}]);


ngCombobox.factory('timeValidator', function () {
  return function (tag) {
    var hr, minute,
      timeStr, timeVal,
      num = tag.text.replace(/\D/g, ''),
      ap = tag.text.match(/[apAP+]/);

    ap = (ap === 'p' || ap === 'P' || ap === '+') ? 'PM' : 'AM';
    hr = ( num.length === 3 ) ? num.substr(0, 1) : num.substr(0, 2);
    minute = ( num.length === 3 ) ? num.substr(1, 2) : num.substr(2, 2);
    if (parseInt(hr) > 12) {
      hr = parseInt(hr) - 12;
      ap = 'PM';
    }
    else if (parseInt(hr) === 0) {
      hr = 12;
      ap = 'AM';
    }
    timeStr = hr + ':' + minute + ' ' + ap;
    if (/(^[0-9]|[0-1][0-9]|[2][0-4]):([0-5][0-9])\s?(AM|PM)?$/.test(timeStr)) {
      timeVal = ap === 'PM' ? parseInt(hr) + 12 : hr;
      if (ap === 'AM' && timeVal === '12') {
        timeVal = '00';
      }
      timeVal += ':' + minute;
      return {
        text: timeStr,
        value: timeVal
      };
    }
    else {
      return {};
    }
  };
})
  .directive('timepicker', ["timeValidator", function (timeValidator) {
    return {
      restrict: 'A',
      require: 'combobox',
      priority: 10,
      controller: ["$scope","$q","grep","matchSorter", function ($scope, $q, grep, matchSorter) {
        var ap, hr, minute,
          timeMatcher,
          times = [],
          self = this;
        for (var i = 0; i < 24; i++) {
          if (i <= 12 && i > 0) {
            hr = i.toString();
          }
          else if (i === 0) {
            hr = '12';
          }
          else {
            hr = (i - 12).toString();
          }
          ;

          for (var j = 0; j < 60; j += 15) {
            ap = i >= 12 ? ' PM' : ' AM';
            minute = j < 10 ? '0' + j : j.toString();
            times.push({
              text: hr + ':' + minute + ap,
              value: i.toString() + ':' + minute,
              raw: hr + minute + ap
            });
          }
        }

        this.timeMatcher = function ($query) {
          var term = $query.$query.toLowerCase(),
            termNum = term.replace(/[\D]/g, ''),
            termAP = term.match(/[apAP\+]/),
            numMatcher = new RegExp(termNum, 'i'),
            deferred = $q.defer(),
            matched, apMatcher;

          if (termAP == null) {
            termAP = '';
          }
          else if (termAP === '+') {
            termAP = 'P';
          }
          ;

          apMatcher = new RegExp(termAP, 'i');

          matched = grep(times, function (value) {
            return numMatcher.test(value.raw);
          });
          matched = grep(matched, function (value) {
            return apMatcher.test(value.raw);
          });

          matched.sort(matchSorter(termNum));
          deferred.resolve(matched);
          return deferred.promise;
        };

        this.timeValidator = function (tag) {
          var deferred = $q.defer();
          deferred.resolve({ data: timeValidator(tag) });
          return deferred.promise;
        };

        this.fromValue = function (value) {
          var deferred = $q.defer();
          // deferred.resolve(times.filter(function(obj){return obj.value == value; }));
          self.timeValidator({text: value}).then(function (timeTag) {
            deferred.resolve([timeTag.data]);
          });
          return deferred.promise;
        };

      }]
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
    "<div class=\"host\" ng-class=\"{'input-group': options.showAll }\" tabindex=\"-1\" ti-transclude-prepend=\"\"><div class=\"tags\" ng-class=\"{'focused': hasFocus, 'disabled':isDisabled()}\"><ul class=\"tag-list\"><li class=\"tag-item\" ng-repeat=\"tag in tagList.items track by $id(tag)\" ng-class=\"{ selected: tag == tagList.selected }\"><span>{{getDisplayText(tag)}}</span> <a class=\"remove-button\" ng-click=\"removeTag($index)\" ng-if=\"options.removeButton\">{{options.removeTagSymbol}}</a></li></ul><input class=\"input\" placeholder=\"{{tags.length < options.maxTags && options.currentPlaceholder || '' }}\" tabindex=\"{{options.tabindex}}\" ng-model=\"newTag.text\" ng-readonly=\"newTag.readonly\" ng-change=\"newTagChange()\" ng-trim=\"false\" ng-class=\"{'invalid-tag': newTag.invalid, 'input-narrow' : tags.length >= options.maxTags}\" ng-disabled=\"isDisabled()\" ti-autosize=\"\"></div><div><div class=\"autocomplete clearfix\" ng-show=\"suggestionList.visible || suggestionList.msgVisible()\"><!-- Messages --><ul class=\"suggestion-list\" ng-hide=\"suggestionList.visible\"><li class=\"suggestion-item\" ng-click=\"addNewTag()\" ng-show=\"suggestionList.confirm\">{{ suggestionList.confirm }}</li><li class=\"suggestion-item\" ng-show=\"suggestionList.newSaving\">{{ options.savingMsg }}</li><li class=\"suggestion-item\" ng-show=\"suggestionList.loading && !suggestionList.confirm\">{{ suggestionList.msg }}</li></ul><!-- Actual Suggestions --><ul class=\"suggestion-list\" ng-show=\"suggestionList.visible\"><li class=\"suggestion-item\" ng-repeat=\"item in suggestionList.items track by $id(item)\" ng-class=\"{selected: item == suggestionList.selected}\" ng-click=\"addSuggestion()\" ng-mouseenter=\"suggestionList.select($index)\" ng-bind-html=\"highlight(item)\"></li><li class=\"suggestion-item\" ng-show=\"options.showTotal && suggestionList.more\">... and {{ suggestionList.more }} more</li></ul></div></div><span class=\"input-group-addon\" ng-if=\"options.showAll\" ng-click=\"toggleSuggestionList(); $event.stopPropagation();\"><span class=\"ui-button-icon-primary ui-icon ui-icon-triangle-1-s\"><span class=\"ui-button-text\" style=\"padding: 0px\">&nbsp;</span></span></span></div>"
  );
}]);

}());