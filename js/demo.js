var map = L.map('map', { zoomControl: false }).setView([40.7259, -73.9805], 12);
L.tileLayer('http://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
  attribution: 'Map data &copy; <a href="http://openstreetmap.org">OpenStreetMap</a> contributors'
}).addTo(map);
new L.Control.Zoom({ position: 'topright' }).addTo(map);
L.control.locate({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
L.control.locations({ position: 'topright', keepCurrentZoomLevel: true }).addTo(map);
L.control.geocoder({ position: 'topright' }).addTo(map);