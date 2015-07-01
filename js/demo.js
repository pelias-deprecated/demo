var map = L.map('map', { zoomControl: false }).setView([40.7259, -73.9805], 12);

// using tangram
var layer = Tangram.leafletLayer({
    scene: 'https://tangrams.github.io/carousel/traditional.yaml',
    attribution: '<a href="https://mapzen.com/tangram" target="_blank">Tangram</a> | &copy; OSM contributors | <a href="https://mapzen.com/" target="_blank">Mapzen</a>'
}).addTo(map);

// set up hash
var hash = new L.Hash(map);

// add controls
new L.Control.Zoom({ position: 'topright' }).addTo(map);
L.control.locate({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
L.control.locations({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
L.control.styles({ position: 'topright', scene: layer.scene }).addTo(map);

// add pelias geocoder control
L.control.geocoder({ position: 'topright' }).addTo(map);

// add valhalla routing control
// var rr = L.Routing.control({
//   // you can get api key from Mapzen developer (https://mapzen.com/developers)
//   router: L.Routing.valhalla('valhalla-j5geTgQ','auto'),
//   formatter: new L.Routing.Valhalla.Formatter()
// }).addTo(map);

L.Routing.control({
  waypoints: [
    L.latLng(57.74, 11.94),
    L.latLng(57.6792, 11.949)
  ],
  // you can get valhalla api key at https://mapzen.com/developers
  router: L.Routing.valhalla('valhalla-j5geTgQ','auto'),
  formatter: new L.Routing.Valhalla.Formatter(),
  summaryTemplate:'<div class="start">{name}</div><div class="info {transitmode}">{distance}, {time}</div>',
  routeWhileDragging: false
}).addTo(map);

// add mapzen bug
var mzBug = new MapzenBug({
  name: 'Pelias Demo using Tangram',
  tweet: 'Another cool demo from @mapzen!',
  repo: 'https://github.com/pelias/pelias/'
});