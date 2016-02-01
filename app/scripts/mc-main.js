'use strict';

var Handlebars = (window.Handlebars) ? window.Handlebars : false;
var _ = (window._) ? window._ : false;
if(!_ || !Handlebars) {
  throw new Error ('Handlebars or lodash / underscrore not included. Quitting now');
}

var mc = (mc) ? mc : {};

mc.probabilityForAndOr = 0;
mc.version = '1';

mc.types = [
  'thing',
  'action'
];

mc.state = {
  thing: {
    thing1: 0
  },
  action: {
    action1: 0
  }
};

$(document).ready(function() {

  var itemSource = $('#item-template').html();
  var ctaSource = $('#cta-template').html();
  var itemTemplate = Handlebars.compile(itemSource);
  var ctaTemplate = Handlebars.compile(ctaSource);
  var ctaContext = {};

  //take mc.state and render the data
  var render = function() {
    _.each(mc.types, function(type) {
      ctaContext[type] = renderOne(type);
    });
    $('.mc-content').html(ctaTemplate(ctaContext));
    updateUrlState();
  };

  //render one type
  var renderOne = function(type) {
    var context = {
      type: type,
      id1: type+'1',
      content1: mc.data[type][mc.state[type][type+'1']],
      isConnector: (mc.state[type].connector === undefined) ? false : true,
      connector: mc.data.connector[mc.state[type].connector],
      id2: type+'2',
      content2: mc.data[type][mc.state[type][type+'2']]
    };
    return itemTemplate(context);
  };

  //extend trigger or action with a certain probability
  var possiblyExtend = function(value, valueType) {
    var rand = Math.random();
    if(rand > mc.probabilityForAndOr) {
      return value;
    }
    var connector = _.random(0, mc.data.connector.length - 1);
    var addOn = _.random(0, mc.data[valueType].length - 1);
    //make sure addOn is not the same as value
    while(addOn === value[valueType+'1']) {
      addOn = _.random(0, mc.data[valueType].length - 1);
    }
    value.connector = connector;
    value[valueType+'2'] = addOn;
    return value;
  };

  //update mc.state to random
  var randomState = function() {
    var newState = {};
    _.each(mc.types, function(type) {
      newState[type] = {};
      newState[type][type+'1'] = _.random(0, mc.data[type].length-1);
    });
    newState.action = possiblyExtend(newState.action, 'action');
    newState.trigger = possiblyExtend(newState.trigger, 'trigger');
    mc.state = newState;
  };
  
  //update one item in the state
  var updateOneItem = function(obj) {
    var group = obj.closest('.mc-group');
    if(!group) {
      return;
    }
    var groupType = group.attr('data-mcType');
    var itemType = obj.attr('data-mcType');
    var itemId = obj.attr('id');
    var currentGroupState = mc.state[groupType];
    if(!itemId) {
      itemId = 'connector';
    }
    //increment
    currentGroupState[itemId]++;
    //if last - start again
    if(currentGroupState[itemId] > mc.data[itemType].length-1) {
      currentGroupState[itemId] = 0;
    }
    mc.state[groupType] = currentGroupState;
  };

  var getUrlParams = function(name) {
    var hash = window.location.hash;
    if(!hash) {
      return 0;
    }
    try {
      hash = window.atob(window.location.hash.split('#')[1]);
    } catch(e) {
      //console.log(e);
      return 0;
    }

    var results = new RegExp('[\?&]' + name + '=([^&#]*)').exec(hash);
    if (results === null){
      return null;
    }
    else{
      return results[1] || 0;
    }
  };

  var updateMcFromUrl = function() {
    var version = getUrlParams('v');
    if(version !== mc.version) {
      return;
    }
    var typeUrlData;
    _.each(mc.types, function(type){
      typeUrlData = getUrlParams(type);
      //TODO: take care of connectors
      if(!typeUrlData) {
        return;
      }
      var urlParamArray = typeUrlData.split('+');
      var hasConnectors = (urlParamArray.length === 3);
      if(!hasConnectors) {
        if(checkItemType(type, typeUrlData)) {
          mc.state[type][type+'1'] = typeUrlData;
        }
      } else { //so we hae connectors - take care of them manually
        if(checkItemType(type, urlParamArray[0]) && checkItemType(type, urlParamArray[2]) && checkItemType('connector', urlParamArray[1])) {
          mc.state[type][type+'1'] = urlParamArray[0];
          mc.state[type][type+'2'] = urlParamArray[2];
          mc.state[type].connector = urlParamArray[1];
        } else {
          mc.state[type][type+'1'] = 0;
        }
      }

    });
  };

  //double check that exists and looks like a number and in range
  var checkItemType = function(type, item) {
    var allGood = true;
    if(isNaN(item)) {
      allGood = false;
    }
    if(mc.data[type].length <= item) {
      allGood = false;
    }
    if(item < 0) {
      allGood = false;
    }
    return allGood;
  };

  var updateUrlState = function() {
    var hash = '/?v='+mc.version;
    _.each(mc.types, function(type) {
      hash += '&' + type + '=' + mc.state[type][type+'1'];
      if(mc.state[type][type+'2']) {
        hash += '+' + mc.state[type].connector + '+' + mc.state[type][type+'2'];
      }
    });
    //encode hash base64 for beauty reasons
    hash = window.btoa(hash);
    window.location.hash = hash;
    $('#shareUrlInputField').val(window.location.protocol + '//' + window.location.host + '/#' + hash);
  };

  var attachEventListeners = function() {
    $('#next-button').on('click', doMc);
    $('.client-logo').on('click', doMc);
    $('#share-button').on('click', function(e) {
      e.preventDefault();
      $('#shareModal').foundation('reveal', 'open');
      setTimeout(function(){
        $('#shareUrlInputField').select();
      },300);
    });
    $('#buttonCloseShareModal').on('click', function() {
      $('#shareModal').foundation('reveal', 'close');
    });
    $('body').on('click', '.mc-item', function(e){
      updateOneItem($(e.target));
      render();
    });
  };

  
  var doMc = function() {
    randomState();
    render();
  };
  
  attachEventListeners();
  updateMcFromUrl(); 
  render();

});

