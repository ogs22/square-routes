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

function locate(long, lat, x, y) {
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
            data[count] = JSON.parse(xhttp.responseText);
            data[count].sqrx = x;
            data[count].sqry = y;

        }
    };
    xhttp.open("GET", url, false);
    xhttp.send();
}


function tilesFromPolyline(polyline) {
    let squaresseen = [];
    let points = plinedecode(polyline);
    //console.log(pointstoGPX(points));
    let visits = 0;
    for (let i = 0; i < points.length; i++) {
        //x is long
        let x = long2tile(points[i][1], 14);
        let y = lat2tile(points[i][0], 14);

        squaresseen[x+"::"+y] = [x, y];
    }
    //console.log(squaresseen);
    console.log("next polyline\n\n");
    return squaresseen;
}

// This is adapted from the implementation in Project-OSRM
// https://github.com/DennisOSRM/Project-OSRM-Web/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
function plinedecode(str, precision) {
    var index = 0,
        lat = 0,
        lng = 0,
        coordinates = [],
        shift = 0,
        result = 0,
        byte = null,
        latitude_change,
        longitude_change,
        factor = Math.pow(10, precision || 6);

    // Coordinates have variable length when encoded, so just keep
    // track of whether we've hit the end of the string. In each
    // loop iteration, a single coordinate is decoded.
    while (index < str.length) {

        // Reset shift, result, and byte
        byte = null;
        shift = 0;
        result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        latitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        shift = result = 0;

        do {
            byte = str.charCodeAt(index++) - 63;
            result |= (byte & 0x1f) << shift;
            shift += 5;
        } while (byte >= 0x20);

        longitude_change = ((result & 1) ? ~(result >> 1) : (result >> 1));

        lat += latitude_change;
        lng += longitude_change;

        coordinates.push([lat / factor, lng / factor]);
    }

    return coordinates;
}


function pointstoGPX(points){
    let gpxstring ="   <?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "   <gpx creator=\"StravaGPX\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd\" version=\"1.1\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n" +
        "    <metadata>\n" +
        "     <name>sunday</name>\n" +
        "     <author>\n" +
        "      <name>Owen Ogg Smith</name>\n" +
        "      <link href=\"https://www.strava.com/athletes/609144\"/>\n" +
        "     </author>\n" +
        "    </metadata>\n" +
        "    <trk>\n" +
        "     <name>test ride</name>\n" +
        "     <type>Ride</type>\n" +
        "     <trkseg>";
    for (let k=0; k < points.length;k++){
        gpxstring += '   <trkpt lat="'+ points[k][0]+'" lon="'+ points[k][1]+'">\n' +
            // '    <ele>15.530000000000001</ele>\n' +
            '   </trkpt>'
    }

    gpxstring += '     </trkseg>\n' +
        '    </trk>\n' +
        '   </gpx>';
    return gpxstring;
}