var map = L.map('map', { zoomControl: false }).setView([40.7259, -73.9805], 12);

// using tangram
var layer = Tangram.leafletLayer({
    scene: 'https://tangrams.github.io/carousel/daynight.yaml',
    attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
}).addTo(map);

// add controls
new L.Control.Zoom({ position: 'topright' }).addTo(map);
L.control.locate({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
L.control.locations({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);

// add pelias geocoder control
L.control.geocoder({ position: 'topright' }).addTo(map);

// add mapzen bug
var mzBug = new MapzenBug({
  name: 'Pelias Demo using Tangram',
  tweet: 'Another cool demo from @mapzen!',
  repo: 'https://github.com/pelias/pelias/'
});