// I was going to actually make these services, but I decided to copy and paste for now.
ngCombobox.factory('SuggestionList',function($timeout, $q){
  return function(loadFn, options) {
      var self = {},
        debouncedLoadId, getDifference, lastPromise;

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
    };
})
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
  };
});



    
  
  