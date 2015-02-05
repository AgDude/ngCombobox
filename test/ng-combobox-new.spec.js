'use strict';

describe('combobox directive', function () {
  var $compile, $scope, $timeout, $document,
    isolateScope, element;


  beforeEach(function(){
    module('ngCombobox');

    inject(function (_$compile_, _$rootScope_, _$document_, _$timeout_, $templateCache) {
      $compile = _$compile_;
      $scope = _$rootScope_;
      $document = _$document_;
      $timeout = _$timeout_;
    });

    jasmine.addMatchers(customMatchers);
  });

  function compile() {
    var options = jQuery.makeArray(arguments).join(' ');
    var template = '<combobox ng-model="tags_data" ' + options + '></combobox>';

    element = $compile(template)($scope);
    $scope.$digest();
    isolateScope = element.isolateScope();
  }

  function compileWithForm() {
    var options = jQuery.makeArray(arguments).join(' ');
    var template = '<form name="form"><combobox ng-model="tags_data" ' + options + '></combobox></form>';

    element = $compile(template)($scope);
    $scope.$digest();
    isolateScope = element.children()
      .isolateScope();
  }

  function compileWithHtmlOptions(){
    var options = jQuery.makeArray(arguments).join(' ');
    var template = '<combobox ng-model="tags_data" ' + options + '>' +
        '<select style="display:none;">' +
          '<option value="1">one</option>' +
          '<option value="2">two</option>' +
          '<option value="3" selected="selected">three</option>' +
          '<option value="4">four</option>' +
        '</select>' +
      '</combobox>';

    element = $compile(template)($scope);
    $scope.$digest();
    isolateScope = element.isolateScope();
  }

  function generateTags(count) {
    var arr = new Array(count);
    angular.forEach(arr, function(val, index){
      arr[index] = {
        text: 'Tag' + index,
        value: index
      };
    });
    return arr;
  }

  function getTags() {
    return element.find('li');
  }

  function getTag(index) {
    return getTags()
      .eq(index);
  }

  function getTagText(index) {
    return getTag(index)
      .find('span')
      .html();
  }

  function getRemoveButton(index) {
    return getTag(index)
      .find('a')
      .first();
  }

  function getInput() {
    return element.find('input');
  }

  function newTag(tag, key) {
    key = key || KEYS.enter;

    for (var i = 0; i < tag.length; i++) {
      sendKeyPress(tag.charCodeAt(i));
    }
    sendKeyDown(key);
  }

  function sendKeyPress(charCode) {
    var input = getInput();
    var event = jQuery.Event('keypress', {
      charCode: charCode
    });

    input.trigger(event);
    if (!event.isDefaultPrevented()) {
      input.val(input.val() + String.fromCharCode(charCode));
      input.trigger('input');
    }
  }

  function sendKeyDown(keyCode, properties) {
    var event = jQuery.Event('keydown', angular.extend({
      keyCode: keyCode
    }, properties || {}));
    getInput()
      .trigger(event);

    return event;
  }

  function sendBackspace() {
    var event = sendKeyDown(KEYS.backspace);
    if (!event.isDefaultPrevented()) {
      var input = getInput();
      var value = input.val();
      input.val(value.substr(0, value.length - 1));
      input.trigger('input');
    }
  }

  describe('basic functionality', function(){
    beforeEach(function(){
      compile();
    });

    it('template renders a string',function(){
      // Makes sure $compile got injected
      expect(element.length).toBeGreaterThan(0);
    });
  });

  //describe('source from html options', function(){
  //  beforeEach(function(){
  //
  //  });
  //});

  describe('loading initial data', function(){

    it('should set a single value', function(){
      $scope.intSource = generateTags(10);

      compile('value="2"', 'source="intSource"');
      expect($scope.tags_data.length).toEqual(1);
      expect($scope.tags_data[0].text).toEqual('Tag2');
    });
  });

  //it('should set initial data to two values', function(){
  //    $scope.intSource = generateTags(10);
  //
  //    compile('value="[2, 4]"', 'source="intSource"');
  //    expect($scope.tags_data.length).toEqual(2);
  //    expect($scope.tags_data[0].text).toEqual('Tag2');
  //    expect($scope.tags_data[0].text).toEqual('Tag4');
  //  });
});
