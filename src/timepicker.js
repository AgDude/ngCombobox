'use strict';

var ngCombobox = require('./combobox');
ngCombobox.factory('timeValidator', function () {
  return function (tag) {
    var hr, minute,
      timeStr, timeVal,
      num = tag.text.replace(/\D/g, ''),
      ap = tag.text.match(/[apAP\+]/);

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
    else if (parseInt(hr) === 12 && ap === null ){
      // assume noon to support Date()
      hr = 12;
      ap = 'PM';
    }
    else {
      ap = (ap === 'p' || ap === 'P' || ap === '+') ? 'PM' : 'AM';
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
  .directive('timepicker', function (timeValidator, escapeRegExp) {
    return {
      restrict: 'A',
      require: 'combobox',
      priority: 10,
      controller: function ($scope, $q, grep, matchSorter) {
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
            numMatcher = new RegExp(escapeRegExp(termNum), 'i'),
            deferred = $q.defer(),
            matched, apMatcher;

          if (termAP == null) {
            termAP = '';
          }
          else if (termAP === '+') {
            termAP = 'P';
          }

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

      }
    };
  });
