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

  $rootScope.$on( 'map.setView', function( ev, geo, zoom ){
    map.setView( geo, zoom || 8 );
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
    }
    return 'map-marker';
  };

  $scope.search = '';
  $scope.results = [];
  $scope.currentText = '';
  $scope.lastSuggest = 0;
  $scope.lastSearch = 0;
  $scope.api_url = 'http://localhost:3100';

  $scope.selectResult = function( result ){
    $scope.currentText = result.properties.text;
    $scope.search = result.properties.text;
    $rootScope.$emit( 'map.setView', result.geometry.coordinates.reverse(), $rootScope.geobase.zoom );
    $rootScope.$emit( 'hidesuggest' );
  }

  $rootScope.$on( 'hidesuggest', function( ev ){
    $scope.results = [];
  });

  $scope.keyPressed = function(ev) {
    if (ev.which == 13) {
      $scope.fullTextSearch();
    }
  }

  $scope.suggest = function(){
    
    if( !$scope.search.length ) {
      $rootScope.$emit( 'hidesuggest' );
      return;
    }
    $http({
      url: $scope.api_url+'/suggest',
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
        $scope.results.length = 0;
        $scope.results = data.features.map( function( res ){
          res.htmltext = $sce.trustAsHtml(highlight( res.properties.text, $scope.search ));
          res.icon = icon( res.properties.type );
          return res;
        });
      }
      else {
        $scope.results = [];
      }
    }).error(function (data, status, headers, config) {
      $rootScope.$emit( 'results', [] );
    });
    
  }

  $scope.fullTextSearch = function(){
    
    if( !$scope.search.length ) {
      $rootScope.$emit( 'hidesuggest' );
      return;
    }
    $http({
      url: $scope.api_url+'/search',
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
        $scope.results.length = 0;
        $scope.results = data.body.map( function( res ){
          res.htmltext = $sce.trustAsHtml(highlight( res.name.default, $scope.search ));
          res.icon = icon("");
          return res;
        });
      }
      else {
        $scope.results = [];
      }
    }).error(function (data, status, headers, config) {
      $rootScope.$emit( 'results', [] );
    });
    
  }

  $scope.$watch( 'search', function( input ){
    $scope.suggest();
  });
  $(document).on('new-location', $scope.suggest);
})
