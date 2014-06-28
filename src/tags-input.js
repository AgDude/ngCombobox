'use strict';

/**
 * @ngdoc directive
 * @name tagsInput
 * @module ngTagsInput
 *
 * @description
 * Renders an input box with tag editing support.
 *
 * @param {string} ngModel Assignable angular expression to data-bind to.
 * @param {string=} [displayProperty=text] Property to be rendered as the tag label.
 * @param {number=} tabindex Tab order of the control.
 * @param {string=} [placeholder=Add a tag] Placeholder text for the control.
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
 * @param {string=} [allowedTagsPattern=.+] Regular expression that determines whether a new tag is valid.
 * @param {boolean=} [enableEditingLastTag=false] Flag indicating that the last tag will be moved back into
 *                                                the new tag input box instead of being removed when the backspace key
 *                                                is pressed and the input box is empty.
 * @param {boolean=} [addFromAutocompleteOnly=false] Flag indicating that only tags coming from the autocomplete list will be allowed.
 *                                                   When this flag is true, addOnEnter, addOnComma, addOnSpace, addOnBlur and
 *                                                   allowLeftoverText values are ignored.
 * @param {expression} onTagAdded Expression to evaluate upon adding a new tag. The new tag is available as $tag.
 * @param {expression} onTagRemoved Expression to evaluate upon removing an existing tag. The removed tag is available as $tag.
 * @param {expression} source Expression to evaluate upon changing the input content. The input value is available as
 *                            $query. The result of the expression must be a promise that eventually resolves to an
 *                            array of strings.
 * @param {number=} [debounceDelay=100] Amount of time, in milliseconds, to wait before evaluating the expression in
 *                                      the source option after the last keystroke.
 * @param {number=} [minLength=3] Minimum number of characters that must be entered before evaluating the expression
 *                                 in the source option.
 * @param {boolean=} [highlightMatchedText=true] Flag indicating that the matched text will be highlighted in the
 *                                               suggestions list.
 * @param {number=} [maxResultsToShow=10] Maximum number of results to be displayed at a time.
 */
tagsInput.directive('tagsInput', function ($timeout, $document, $sce, $q, grep, tagsInputConfig) {
  
  function SuggestionList(loadFn, options) {
      var self = {},
        debouncedLoadId, getDifference, getMatches, lastPromise;

      getDifference = function (array1, array2) {
        return array1.filter(function (item) {
          return !findInObjectArray(array2, item, options.displayProperty);
        });
      };

      self.reset = function () {
        lastPromise = null;

        self.items = [];
        self.visible = false;
        self.index = -1;
        self.selected = null;
        self.query = null;

        $timeout.cancel(debouncedLoadId);
      };
      self.show = function () {
        self.selected = null;
        self.visible = true;
        self.select(0);
      };
      self.load = function (query, tags, force) {
        if (query.length < options.minLength && !force) {
          self.reset();
          return;
        }

        $timeout.cancel(debouncedLoadId);
        debouncedLoadId = $timeout(function () {
          self.query = query;

          var promise = loadFn({
            $query: query
          });
          lastPromise = promise;

          promise.then(function (items) {
            if (promise !== lastPromise) {
              return;
            }

            items = makeObjectArray(items.data || items, options.displayProperty);
            items = getDifference(items, tags);
            self.items = items.slice(0, options.maxResultsToShow);

            if (self.items.length > 0) {
              self.show();
            } else {
              self.reset();
            }
          });
        }, options.debounceDelay, false);
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
    }
  
  function encodeHTML(value) {
    return value.replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');
  }
    
  function TagList(options, events) {
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
      var tag = {};
      setTagText(tag, text);
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
  }

  return {
    restrict: 'E',
    require: 'ngModel',
    scope: {
      tags: '=ngModel',
      onTagAdded: '&',
      onTagRemoved: '&',
      source: '=?',
    },
    replace: false,
    transclude: true,
    templateUrl: 'ngTagsInput/tags-input.html',
    controller: function ($scope, $attrs, $element) {
      tagsInputConfig.load('tagsInput', $scope, $attrs, {
        placeholder: [String, ''],
        tabindex: [Number],
        removeTagSymbol: [String, String.fromCharCode(215)],
        replaceSpacesWithDashes: [Boolean, true],
        minLength: [Number, 2],
        maxLength: [Number],
        addOnEnter: [Boolean, true],
        addOnTab: [Boolean, true],
        addOnSpace: [Boolean, true],
        addOnComma: [Boolean, true],
        addOnPeriod: [Boolean, true],
        addOnBlur: [Boolean, true],
        allowedTagsPattern: [RegExp, /.+/],
        enableEditingLastTag: [Boolean, false],
        minTags: [Number],
        maxTags: [Number],
        displayProperty: [String, 'text'],
        allowLeftoverText: [Boolean, false],
        addFromAutocompleteOnly: [Boolean, true],
        showAll: [Boolean, true],
        debounceDelay: [Number, 100],
        minSearchLength: [Number, 3],
        highlightMatchedText: [Boolean, true],
        maxResultsToShow: [Number, 10],
      });

      $scope.events = new SimplePubSub();
      $scope.tagList = new TagList($scope.options, $scope.events);

    },
    link: {
      post: function (scope, element, attrs, ngModelCtrl) {
        var hotkeys = [KEYS.enter, KEYS.tab, KEYS.escape, KEYS.up, KEYS.down, KEYS.dot, KEYS.period, KEYS.space, KEYS.comma, KEYS.backspace],
          suggestionList,
          options,
          getItemText,
          documentClick,
          sourceFunc,
          tagList = scope.tagList,
          events = scope.events,
          options = scope.options,
          input = element.find('input');


        var htmlOptions = element.find('option');

        if (htmlOptions.length > 0) {
          var tagsModel = [],
            source = [];
          if (!ngModelCtrl.$isEmpty()) {
            tagsModel = ngModelCtrl.$viewValue;
          }
          angular.forEach(htmlOptions, function (opt, index) {
            var optObj = {
              value: opt.value,
              text: opt.label
            };
            source.push(optObj);
            if (opt.selected) {
              tagsModel.push(optObj);
            }
            angular.element(opt)
              .remove();
          });
          scope.source = source;
          ngModelCtrl.$setViewValue(tagsModel);
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
            if (!options.addFromAutocompleteOnly) {
              if (options.addOnBlur) {
                tagList.addText(scope.newTag.text);
              }

              ngModelCtrl.$setValidity('leftoverText', options.allowLeftoverText ? true : !scope.newTag.text);
            }
          });

        scope.newTag = {
          text: '',
          invalid: null,
          readonly: false,
        };

        scope.getDisplayText = function (tag) {
          return tag[options.displayProperty].trim();
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


        scope.toggleSuggestionList = function () {
          if (suggestionList.visible) {
            suggestionList.reset();
          } else {
            suggestionList.load(scope.newTag.text, scope.tags, true);
          }
        };

        function getMatches($query) {

          var term = $query.$query,
            containsMatcher = new RegExp(term, 'i'),
            deferred = $q.defer(),
            matched = grep(scope.source, function (value) {
              return containsMatcher.test(value.text);
            });
          matched.sort(function (a, b) {
            if (a.text.indexOf(term) === 0 || b.text.indexOf(term) === 0) {
              return a.text.indexOf(term) - b.text.indexOf(term);
            }
            return 0;
          });
          deferred.resolve(matched);
          return deferred.promise;
        };

        if (typeof (scope.source) === 'function') {
          sourceFunc = scope.source;
        } else {
          sourceFunc = getMatches;
        };

        suggestionList = new SuggestionList(sourceFunc, options);
        scope.suggestionList = suggestionList;

        getItemText = function (item) {
          return item[options.displayProperty];
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
            
            // // This hack is needed because jqLite doesn't implement stopImmediatePropagation properly.
            // // I've sent a PR to Angular addressing this issue and hopefully it'll be fixed soon.
            // // https://github.com/angular/angular.js/pull/4833
            // if (e.isImmediatePropagationStopped && e.isImmediatePropagationStopped()) {
              // return;
            // }

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

            shouldAdd = !options.addFromAutocompleteOnly && addKeys[key];
            shouldRemove = !shouldAdd && key === KEYS.backspace && scope.newTag.text.length === 0;
            shouldBlock = options.addFromAutocompleteOnly && scope.newTag.invalid && addKeys[key];

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
              if (scope.tags.length !== scope.options.maxTags || key !== KEYS.tab ){
                e.preventDefault();
                // e.stopImmediatePropagation();
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
          
        // element
          // .on('tag-added invalid-tag', function () {
            // suggestionList.reset();
          // })
          // .on('input-change', function (value) {
            // if (value) {
              // suggestionList.load(value, scope.tags);
            // } else {
              // suggestionList.reset();
            // }
          // })
          // .on('input-keydown', function (e) {
            // var key, handled;
// 
            // if (hotkeys.indexOf(e.keyCode) === -1) {
              // return;
            // }
// 
            // // This hack is needed because jqLite doesn't implement stopImmediatePropagation properly.
            // // I've sent a PR to Angular addressing this issue and hopefully it'll be fixed soon.
            // // https://github.com/angular/angular.js/pull/4833
            // var immediatePropagationStopped = false;
            // e.stopImmediatePropagation = function () {
              // immediatePropagationStopped = true;
              // e.stopPropagation();
            // };
            // e.isImmediatePropagationStopped = function () {
              // return immediatePropagationStopped;
            // };
// 
            // if (suggestionList.visible) {
              // key = e.keyCode;
              // handled = false;
// 
              // if (key === KEYS.down) {
                // suggestionList.selectNext();
                // handled = true;
              // } else if (key === KEYS.up) {
                // suggestionList.selectPrior();
                // handled = true;
              // } else if (key === KEYS.escape) {
                // suggestionList.reset();
                // handled = true;
              // } else if (scope.addKeys[key]) {
                // handled = scope.addSuggestion();
              // }
// 
              // if (handled) {
                // if (scope.tags.length !== scope.options.maxTags || key !== KEYS.tab ){
                  // e.preventDefault();
                  // e.stopImmediatePropagation();
                // }
                // scope.$apply();
              // }
            // }
          // })
          // .on('input-blur', function () {
            // suggestionList.reset();
          // });

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

      }
    }
  };
});