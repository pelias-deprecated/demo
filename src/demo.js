'use strict';

// Polyfills
require('whatwg-fetch');

// Leaflet, map libraries and Tangram
var L = require('leaflet');
require('leaflet-hash');
require('leaflet.locatecontrol')
require('leaflet-geocoder-mapzen');
// require('drmonty-leaflet-awesome-markers');

var Tangram = require('tangram'); // via browserify-shim

var SEARCH_API_KEY = 'search-KqgQGdk';

// Set this manually inside a bundle
L.Icon.Default.imagePath = 'site/images';

// Leaflet
var map = L.map('map', {
  zoomControl: false,
  worldCopyJump: true
}).setView([40.7259, -73.9805], 12);

// URL Hash
var hash = new L.Hash(map);

// Zoom controls
L.control.zoom({ position: 'topright' }).addTo(map);

// Locate me control
var locator = L.control.locate({
  position: 'topright',
  follow: false,
  showPopup: false,
  keepCurrentZoomLevel: true
}).addTo(map)

// Tangram
var layer = Tangram.leafletLayer({
  scene: 'site/outdoor-style.yaml',
  attribution: '&copy; OSM contributors'
}).addTo(map);

// Search
var geocoder = L.control.geocoder(SEARCH_API_KEY, {
  expanded: true
}).addTo(map);

// Reverse
var markers = [];

map.on('click', function (e) {
  var latlng = e.latlng;
  var reverse = 'https://search.mapzen.com/v1/reverse?point.lat=' + latlng.lat + '&point.lon=' + latlng.lng + '&size=1&layers=address&api_key=' + SEARCH_API_KEY;

  // Add a marker on click immediately
  removeMarkers();
  var marker = new L.marker(latlng);
  markers.push(marker);
  map.addLayer(marker);
  map.panTo(latlng);

  // Reverse geocode and then display things based on it
  window.fetch(reverse)
    .then(function (response) {
      if (!response.ok) {
        throw new Error('status code: ' + response.status);
      }

      return response.json();
    })
    .then(function (response) {
      var label = response.features[0].properties.label;
      marker.bindPopup(label).openPopup();
    })
    .catch(function (error) {
      console.log('error getting reverse geocode. ' + error);
    });

  function removeMarkers () {
    for (var i = 0; i < markers.length; i++) {
      map.removeLayer(markers[i]);
    }
    markers = [];
  };
});

// Hashes update parent if iframed
window.addEventListener('hashchange', function () {
  parent.postMessage(window.location.hash, '*');
});

// Debug
window.map = map;
