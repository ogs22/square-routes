function long2tile(lon, zoom) {
    return (Math.floor((lon + 180) / 360 * Math.pow(2, zoom)));
}

function lat2tile(lat, zoom) {
    return (Math.floor((1 - Math.log(Math.tan(lat * Math.PI / 180) + 1 / Math.cos(lat * Math.PI / 180)) / Math.PI) / 2 * Math.pow(2, zoom)));
}

function tile2long(x, z) {
    return (x / Math.pow(2, z) * 360 - 180);
}

function tile2lat(y, z) {
    var n = Math.PI - 2 * Math.PI * y / Math.pow(2, z);
    return (180 / Math.PI * Math.atan(0.5 * (Math.exp(n) - Math.exp(-n))));
}

function locate(long, lat,x,y) {
    let query =
        {
            "verbose": false,
            "locations": [{"lat": lat, "lon": long}],
            "costing": "bicycle",
            "costing_options": {"bicycle": {"bicycle_type": "road"}},
            "directions_options": {"units": "miles"}
        };

    let url = 'http://localhost:8002/locate?json=' + JSON.stringify(query);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // Typical action to be performed when the document is ready:
            let count = data.length;
            data[count] = JSON.parse(xhttp.responseText );
            data[count].sqrx = x;
            data[count].sqry = y;

        }
    };
    xhttp.open("GET", url, false);
    xhttp.send();
}

function domapstuff(coordjson) {
    for (var i = 0; i < coordjson.length; i++) {
        var place = coordjson[i];
        //console.log(place);
        // Creating a marker and putting it on the map
        var customIcon = L.icon({
            iconUrl: 'https://leafletjs.com/examples/custom-icons/leaf-green.png',
            iconSize: [38, 40], // size of the icon
            iconAnchor: [10, 40], // point of the icon which will correspond to marker's location
            popupAnchor: [5, -40] // point from which the popup should open relative to the iconAnchor
        });
        var marker = L.marker(place.coordinate);
        marker.addTo(map_var).bindPopup(place.Indirizzo);
    }
}