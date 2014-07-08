'use strict';

ngCombobox.directive('timepicker',function(){
  return {
    restrict: 'A',
    require: 'combobox',
    priority: 10,
    controller: function($scope, $q, grep, matchSorter){
      var ap, hr, minute,
        timeMatcher,
        times = [];
      for (var i=0; i < 24; i++){
          if (i <= 12 && i > 0){ hr = i.toString(); }
          else if (i==0){ hr = '12'; }
          else{ hr = (i-12).toString(); };
          
          for (var j=0; j < 60; j+=15){
              ap = i>=12 ? ' PM' : ' AM';
              minute = j < 10 ? '0' + j : j.toString();
              times.push({
                text: hr + ':' + minute + ap,
                value: i.toString() + ':' + minute,
                raw: hr + minute + ap,
              });
          }
      }
      
      this.timeMatcher = function($query){
        var term = $query.$query.toLowerCase(),
          termNum = term.replace(/[\D]/g,''),
          termAP = term.match(/[apAP\+]/),
          numMatcher = new RegExp(termNum, 'i'),
          deferred = $q.defer(),
          matched, apMatcher;
          
        if (termAP==null){ termAP=''; }
        else if(termAP=='+'){ termAP='P'; };
        
        apMatcher = new RegExp(termAP, 'i'),
        
        matched = grep(times, function(value){
          return numMatcher.test(value.raw);
        });
        matched = grep(matched, function(value){
         return apMatcher.test(value.raw);
        });
        
        matched.sort(matchSorter(termNum));
        deferred.resolve(matched);
        return deferred.promise;
      };
      
      this.timeValidator = function(tag){
        var ap, hr, minute,
          timeStr, timeVal,
          num = tag.text.replace(/\D/g,''),
          ap = tag.text.match(/[apAP+]/),
          deferred = $q.defer();
          
        ap = (ap == 'p' || ap =="P" || ap=='+') ? 'PM' : 'AM';
        hr = ( num.length === 3 ) ? num.substr(0,1) : num.substr(0,2);
        minute =  ( num.length === 3 ) ? num.substr(1,2) : num.substr(2,2);
        if ( parseInt(hr) > 12 ){
          hr = parseInt(hr) - 12;
          ap = 'PM';
        }
        timeStr = hr + ':' + minute + ' ' + ap;
        if ( /(^[0-9]|[1][0-9]|[2][0-4]):([0-5][0-9])\s?(AM|PM)?$/.test(timeStr) ){
          timeVal = ap == 'PM' ? parseInt(hr) + 12 : hr;
          if ( ap === 'AM' && timeVal === '12'){
            timeVal = '00';
          }
          timeVal += ':' + minute;
          deferred.resolve({data: {
            text: timeStr,
            value: timeVal
          }});
        }
        else { deferred.resolve({}); }
        return deferred.promise;
      };
      
    this.fromValue = function(value){
      times.filter(function(obj){return obj.value == value; });
    };
      
    },
  };
});
