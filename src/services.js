// I was going to actually make these services, but I decided to copy and paste for now.
ngCombobox.factory('SuggestionList',function($timeout, $interval, $q){
  return function(primaryFn, secondaryFn, options) {
      var self = {},
        debouncedLoadId,loadingInterval, getDifference, lastPromise;

      getDifference = function (array1, array2) {
        return array1.filter(function (item) {
          return !findInObjectArray(array2, item, options.displayProperty);
        });
      };

      self.reset = function () {
        lastPromise = null;

        self.items = [];
        self.visible = false;
        self.loading = false;
        self.index = -1;
        self.selected = null;
        self.query = null;

        $timeout.cancel(debouncedLoadId);
        $interval.cancel(loadingInterval)
      };
      self.show = function () {
        self.selected = null;
        self.visible = true;
        self.loading = false;
        self.select(0);
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
        if (query.length < options.minLength && !force) {
          self.reset();
          return;
        }
        
        if ( loadFn == undefined ){
          loadFn = primaryFn;
        }
        
        self.msg = options.loadingMsg;
        if ( loadFn == secondaryFn ){
          self.msg = options.secondaryMsg;
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
})
.factory('getMatches', function($q, grep){
  return function(source){
      return function($query) {
        var term = $query.$query,
          containsMatcher = new RegExp(term, 'i'),
          deferred = $q.defer(),
          matched = grep(source, function (value) {
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
  };
});



    
  
  