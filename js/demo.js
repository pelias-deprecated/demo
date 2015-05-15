var app = angular.module('pelias', []);
var hash_params = L.Hash.parseHash(location.hash);

app.run(function($rootScope) {
  var hash_loc = hash_params ? hash_params : {'center': {'lat': 40.7259, 'lng': -73.9805}, 'zoom': 12};
  $rootScope.geobase = {
    'zoom': hash_loc.zoom,
    'lat' : hash_loc.center.lat,
    'lon' : hash_loc.center.lng
  }
  $(document).on('new-location', function(e){
    $rootScope.geobase = {
      'zoom': e.zoom,
      'lat' : e.lat,
      'lon' : e.lon
    };
  })
});

app.controller('SearchController', function($scope, $rootScope, $sce, $http) {
    // --------- suggestions ---------
  var map = L.map('map', {
      zoom: $rootScope.geobase.zoom,
      zoomControl: false,
      center: [$rootScope.geobase.lat, $rootScope.geobase.lon],
      maxBounds: L.latLngBounds(L.latLng(-80, -180), L.latLng(82, 180))
  });

  if(!L.Hash.parseHash(location.hash) && navigator.geolocation){
    navigator.geolocation.getCurrentPosition(function (pos){
      var coords = pos.coords;
      map.panTo(new L.LatLng(coords.latitude, coords.longitude));
      $(document).trigger({
        type: 'new-location',
        lat: coords.latitude,
        lon: coords.longitude,
        zoom: 12
      });
    });
  }

  L.tileLayer('//{s}.tiles.mapbox.com/v3/randyme.i0568680/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18,
      minZoom: 3,
      noWrap: true
  }).addTo(map);
  new L.Control.Zoom({ position: 'topright' }).addTo(map);
  L.control.locate({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
  L.control.locations({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
  // Set up the hash
  var hash = new L.Hash(map);
  var marker;
  var markers = {};
  var remove_markers = function(){
  	for (key in markers) {
      map.removeLayer(markers[key]);
      delete markers[key];
    }
  };

  $rootScope.$on( 'map.setView', function( ev, geo, zoom ){
    map.setView( geo, zoom || 8 );
  });

  $rootScope.$on( 'map.highlightMarker', function(ev, id) {
  	marker = markers[id];
  	marker.addTo(map)
  	marker.openPopup();
  })

  $rootScope.$on( 'map.dropMarker', function( ev, geo, text, icon_name, id ){
    marker = new L.marker(geo).bindPopup(text);
    map.addLayer(marker);
    markers[id] = marker;
    marker.openPopup();
  });

  $rootScope.$on( 'map.dropGeoJson', function( ev, data ){
    remove_markers();
    var geoJsonLayer = L.geoJson(data, {
      onEachFeature: function (feature, layer) {
        markers[feature.properties.id] = layer;
        layer.bindPopup(feature.properties.text);
      }
    });
    geoJsonLayer.addData(data);
  });

  $rootScope.$on( 'map.removeAllMarkers', function( ev, geo, text ){
    remove_markers();
  });

  $rootScope.$on( 'fullTextSearch', function( ev, text, searchType, geoBias ){
    $(document).trigger({
      'type': "pelias:fullTextSearch",
      'text' : text,
      'searchType' : searchType,
      'geoBias': geoBias
    });
  });

  map.on('click', function(e) {
    var geo = {
      'lat': e.latlng.lat,
      'lon': e.latlng.lng
    };
    reverse(geo);
  });

  var highlight = function( text, focus ){
    var r = RegExp( '('+ focus + ')', 'gi' );
    return text.replace( r, '<strong>$1</strong>' );
  }

  var icon = function( type ){
    if( type.match('geoname') ){
      return 'screenshot';
    } else if( type.match('osm') ){
      return 'globe';
    } else if( type.match('admin0') ){
      return 'flag';
    } else if( type.match('admin') ){
      return 'tower';
    } else if( type.match('neighborhood') ){
      return 'home';
    } else if( type.match('search') ){
      return 'search';
    }
    return 'map-marker';
  };

  var resultSelected = function(result, changeQuery) {
    var search = result.properties.text;
    var geo = result.geometry.coordinates;
    var id = result.properties.id;

    if (!id) {
	    $rootScope.$emit( 'map.removeAllMarkers' );
	    if (changeQuery) {
	      $scope.search = search;
	      $rootScope.$emit( 'hideall' );
	    }
	    
	    $rootScope.$emit( 'map.setView', geo.reverse(), $rootScope.geobase.zoom );
	    $rootScope.$emit( 'map.dropMarker', geo, search, 'search', id);
    } else {
    	$rootScope.$emit( 'map.highlightMarker', id);
    }
    
  };

  var computeDistance = function(geo) {
    var p1 = new LatLon( $rootScope.geobase.lat, $rootScope.geobase.lon );
    var p2 = new LatLon( geo[1], geo[0] );
    var distance = Number( p1.distanceTo(p2) );
    return distance.toFixed( distance < 1 ? 2 : 0 );
  }

  var reverse = function(geo) {
    $http({
      url: $scope.api_url+'/reverse',
      method: 'GET',
      params: {
        lat: geo.lat,
        lon: geo.lon,
        zoom:$rootScope.geobase ? $rootScope.geobase.zoom : 12
      },
      headers: { 'Accept': 'application/json' }
    }).success(function (data, status, headers, config) {
      if (data) {
        var geo = data.features[0].geometry.coordinates;
        var txt = data.features[0].properties.text;
        var id = data.features[0].properties.id;

        $rootScope.$emit( 'map.dropMarker', geo.reverse(), txt, 'star', id);
      } else { }
    })
  };

  var getResults = function(url, resultkey) {
    var params = {
      input: $scope.search,
      // datasets: $scope.queryDatasets.join(','),
      size: 5
    }

    if ($scope.geobias === 'bbox') {
      var bounds = map.getBounds();
      params.bbox = bounds.toBBoxString();
    } 

    // for suggester to work, you need lat/lon even if geobias=bbox
    if ($scope.geobias === 'bbox' || $scope.geobias === 'loc') {
      params.lat = $rootScope.geobase ? $rootScope.geobase.lat : 0;
      params.lon = $rootScope.geobase ? $rootScope.geobase.lon : 0;
      params.zoom= $rootScope.geobase ? $rootScope.geobase.zoom : 12;
    }
    
    $http({
      url: $scope.api_url+url,
      method: 'GET',
      params: params,
      headers: { 'Accept': 'application/json' }
    }).success(function (data, status, headers, config) {
      if( data ){
        if (resultkey=='searchresults') {
          $rootScope.$emit( 'map.dropGeoJson', data );
        }
        $scope[resultkey].length = 0;
        $scope[resultkey] = data.features.map( function( res ){
          res.htmltext = $sce.trustAsHtml(highlight( res.properties.text, $scope.search ));
          res.icon = icon( res.properties.layer || 'search' );
          res.type = res.properties.layer;
          res.distance = computeDistance(res.geometry.coordinates);
          return res;
        });
      }
      else {
        $scope[resultkey] = [];
      }
    }).error(function (data, status, headers, config) {
      $scope[resultkey] = [];
    });
  };

  $scope.search = '';
  $scope.searchresults = [];
  
  $scope.geobias = 'bbox';
  $scope.geobiasClass = 'fa-th';
  $scope.geobiasInfo = 'the view port/ bounding box';
  $scope.searchType = 'fine';
  $scope.api_url = '//pelias.stage.mapzen.com';

  $scope.switchType = function(type) {
    $scope.searchType = type === 'fine' ? 'coarse' : 'fine';
    $rootScope.$emit( 'hideall' );
    $scope.fullTextSearch();
  };

  $scope.setGeobias = function(geobias) {
    if (geobias === 'bbox') {
      $scope.geobias = 'bbox';
      $scope.geobiasClass = 'fa-th';
      $scope.geobiasInfo = 'the view port/ bounding box';
    } else if (geobias === 'loc') {
      $scope.geobias = 'loc';
      $scope.geobiasClass = 'fa-location-arrow';
      $scope.geobiasInfo = 'the lat/lon/zoom (center of the screen)';
    } else if (geobias === 'off') {
      $scope.geobias = 'off';
      $scope.geobiasClass = 'fa-globe';
      $scope.geobiasInfo = 'no location information';
    } else {
      $scope.switchGeobias();
    }
  };

  $scope.switchGeobias = function(geobias) {
    if (geobias === 'bbox') {
      $scope.setGeobias('loc');
    } else if (geobias === 'loc') {
      $scope.setGeobias('off');
    } else if (geobias === 'off') {
      $scope.setGeobias('bbox');
    } else {
      $scope.setGeobias('off');
    }
    $rootScope.$emit( 'hideall' );
    $scope.fullTextSearch();
  };

  $scope.selectResult = function( result, changeQuery ){
    resultSelected(result, changeQuery)
  }

  $rootScope.$on( 'hideall', function( ev ){
    $scope.searchresults = []
  });

  $scope.keyPressed = function(e) {
    var list = $("#searchresults").children();
    var selected = $('.' + 'pelias-selected')[0];
    var selectedPosition;

    for (var i = 0; i < list.length; i++) {
      if(list[i] === selected){
        selectedPosition = i;
        break;
      }
    }
    
    // TODO cleanup
    switch(e.keyCode) {
      // 13 = enter
      case 13:
        if(selected){
          var id = $(selected).data('prop-id');
          $rootScope.$emit( 'map.highlightMarker', id);
        } else {
          // perform a full text search on enter
          // var text = (e.target || e.srcElement).value;
          // this.search(text);
        }
        L.DomEvent.preventDefault(e);
        break;
      // 38 = up arrow
      case 38:
        if(selected){
          L.DomUtil.removeClass(selected, 'pelias-selected');
        }

        var previousItem = list[selectedPosition-1];

        if(selected && previousItem) {
          L.DomUtil.addClass(previousItem, 'pelias-selected');
          var id = $(previousItem).data('prop-id');
          $rootScope.$emit( 'map.highlightMarker', id);
        } else {
          var elem = list[list.length-1];
          var id = $(elem).data('prop-id');
          L.DomUtil.addClass(elem, 'pelias-selected');
          $rootScope.$emit( 'map.highlightMarker', id);
        }
        L.DomEvent.preventDefault(e);
        break;
      // 40 = down arrow
      case 40:
        if(selected){
          L.DomUtil.removeClass(selected, 'pelias-selected');
        }

        var nextItem = list[selectedPosition+1];
        
        if(selected && nextItem) {
          L.DomUtil.addClass(nextItem, 'pelias-selected');
          var id = $(nextItem).data('prop-id');
          $rootScope.$emit( 'map.highlightMarker', id);
        } else {
          var elem = list[list.length-1];
          var id = $(elem).data('prop-id');
          L.DomUtil.addClass(list[0], 'pelias-selected');
          $rootScope.$emit( 'map.highlightMarker', id);
        }
        L.DomEvent.preventDefault(e);
        break;
      // all other keys
      default: 
        break;
    } 
  }

  $scope.onFocus = function(ev) {
    // $("#searchresults").removeClass("smaller");
  }

  $scope.onBlur = function(ev) {
    // $("#searchresults").addClass("smaller");
  }

  $scope.fullTextSearch = function(){

    if( !$scope.search.length ) {
      $rootScope.$emit( 'hideall' );
      return;
    }
    $rootScope.$emit('fullTextSearch', $scope.search, $scope.searchType, $scope.geobias);

    var url = $scope.searchType.toLowerCase() === 'fine' ? '/search' : '/search/coarse';
    getResults(url, 'searchresults');
  }

  $scope.$watch( 'search', function( input ){
    $scope.fullTextSearch();
  });

  // faking a search when query params are present
  var hash_query  = hash_params ? hash_params.q : false;
  if (hash_query){
    $scope.search = hash_query
    $scope.keyPressed({ 'which': 13});
  }
  var hash_search_type  = hash_params ? hash_params.t : false;
  if (hash_search_type){
    $scope.searchType = hash_search_type;
    $scope.keyPressed({ 'which': 13});
  }
  var hash_geobias  = hash_params ? hash_params.gb : false;
  if (hash_geobias){
    $scope.geobias = hash_geobias;
    $scope.setGeobias(hash_geobias);
    $scope.keyPressed({ 'which': 13});
  }

})
