var app = angular.module('pelias', []);
app.run(function($rootScope) {
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
      zoom: 12, 
      zoomControl: false,
      center: [40.7259, -73.9805]
  });

  L.tileLayer('http://{s}.tiles.mapbox.com/v3/hk23.tm2-basemap/{z}/{x}/{y}.png', {
      attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors, <a href="http://creativecommons.org/licenses/by-sa/2.0/">CC-BY-SA</a>, Imagery © <a href="http://mapbox.com">Mapbox</a>',
      maxZoom: 18
  }).addTo(map);
  new L.Control.Zoom({ position: 'topright' }).addTo(map);

  // Set up the hash
  var hash = new L.Hash(map);
  var marker;

  $rootScope.$on( 'map.setView', function( ev, geo, zoom ){
    map.setView( geo, zoom || 8 );
  });

  $rootScope.$on( 'map.dropMarker', function( ev, geo, text ){
    marker = new L.marker(geo).bindPopup(text);
    map.addLayer(marker);
    marker.openPopup();
  });

  $rootScope.$on( 'map.removeAllMarkers', function( ev, geo, text ){
    if (marker) {
      map.removeLayer(marker);
    }
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

  var resultSelected = function(search, geo) {
    $rootScope.$emit( 'map.removeAllMarkers' );
    $scope.search = search;
    $rootScope.$emit( 'map.setView', geo.reverse(), $rootScope.geobase.zoom );
    $rootScope.$emit( 'map.dropMarker', geo, search);
    $rootScope.$emit( 'hidesuggest' );
    $rootScope.$emit( 'hidesearch' );
  };

  var computeDistance = function(geo) {
    var p1 = new LatLon( $rootScope.geobase.lat, $rootScope.geobase.lon );
    var p2 = new LatLon( geo[1], geo[0] );
    var distance = Number( p1.distanceTo(p2) );
    return distance.toFixed( distance < 1 ? 2 : 0 );
  }

  var getResults = function(url, resultkey, successCallback) {
    $http({
      url: $scope.api_url+url,
      method: 'GET',
      params: {      
        input: $scope.search,
        // datasets: $scope.queryDatasets.join(','),
        lat: $rootScope.geobase ? $rootScope.geobase.lat : 0,
        lon: $rootScope.geobase ? $rootScope.geobase.lon : 0,
        zoom:$rootScope.geobase ? $rootScope.geobase.zoom : 12,
        size: 10
      },
      headers: { 'Accept': 'application/json' }
    }).success(function (data, status, headers, config) {
      if( data ){
        successCallback(data);
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
  $scope.suggestresults = [];
  $scope.api_url = 'http://localhost:3100';

  $scope.selectResult = function( result ){
    resultSelected(result.properties.text, result.geometry.coordinates)
  }

  $scope.selectSearchResult = function( result ){
    resultSelected(result.properties.suggest.output, result.geometry.coordinates)
  }

  $rootScope.$on( 'hideall', function( ev ){
    $scope.suggestresults = [];
    $scope.searchresults = []
  });

  $rootScope.$on( 'hidesuggest', function( ev ){
    $scope.suggestresults = [];
  });

  $rootScope.$on( 'hidesearch', function( ev ){
    $scope.searchresults = [];
  });

  $scope.keyPressed = function(ev) {
    if (ev.which == 13) {
      $("#suggestresults").addClass("smaller");
      $scope.fullTextSearch();
    } else {
      $("#suggestresults").removeClass("smaller");
      $rootScope.$emit('hidesearch');
    }
  }

  $scope.suggest = function(){
    
    if( !$scope.search.length ) {
      $rootScope.$emit( 'hideall' );
      return;
    }
    
    getResults('/suggest', 'suggestresults', function(data) {
      $scope.suggestresults.length = 0;
      $scope.suggestresults = data.features.map( function( res ){
        res.htmltext = $sce.trustAsHtml(highlight( res.properties.text, $scope.search ));
        res.icon = icon( res.properties.type );
        res.distance = computeDistance(res.geometry.coordinates);
        return res;
      });
    });
  }

  $scope.fullTextSearch = function(){
    
    if( !$scope.search.length ) {
      $rootScope.$emit( 'hideall' );
      return;
    }

    getResults('/search', 'searchresults', function(data) {
      $scope.searchresults.length = 0;
      $scope.searchresults = data.features.map( function( res ){
        res.htmltext = $sce.trustAsHtml(highlight( res.properties.suggest.output, $scope.search ));
        res.icon = icon( res.properties.type );
        res.distance = computeDistance(res.geometry.coordinates);
        return res;
      });
    });
    
  }

  $scope.$watch( 'search', function( input ){
    $scope.suggest();
  });
  $(document).on('new-location', $scope.suggest);
})
