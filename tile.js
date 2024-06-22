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
            "costing_options": {"bicycle": {"bicycle_type": bikeType}},
            "directions_options": {"units": "miles"}
        };

    let url = VHServer + '/locate?json=' + JSON.stringify(query);
    console.log(url);
    statusUpdate("Locating square:"+x+","+y);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            // Typical action to be performed when the document is ready:
            result = JSON.parse(xhttp.responseText);
            console.log(result[0].edges);
            if (result[0].edges == null) {
                statusUpdate("Failed to locate....")
            } else {
                let count = data.length;
                data[count] = result;
                data[count].sqrx = x;
                data[count].sqry = y;
            }
        }

    };
    xhttp.open("GET", url, false);
    xhttp.send();
}

function getCrossoverPoints(polyline) {
    let points = plinedecode(polyline);
    let last = "0::0";
    let before = [0, 0];
    let after = [0, 0]
    let num = 0;
    let crossings = [];
    for (let i = 0; i < points.length; i++) {
        //x is long
        let x = long2tile(points[i][1], 14);
        let y = lat2tile(points[i][0], 14);
        if (last == "0::0") {
            //setup the first before point as the initial start....
            last = x + "::" + y;
            before = [points[i][1], points[i][0], x, y];
        }
        if (last != x + "::" + y) {
            last = x + "::" + y; //set this as last seen square
            //record the point we crossed
            after = [points[i][1], points[i][0], x, y];
            crossings[num] = before;
            num++;
            crossings[num] = after;
            num++;
        }
        before = [points[i][1], points[i][0], x, y];
    }
    return crossings;
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


function pointstoGPX(points) {
    let gpxstring = "<?xml version=\"1.0\" encoding=\"UTF-8\"?>\n" +
        "   <gpx creator=\"StravaGPX\" xmlns:xsi=\"http://www.w3.org/2001/XMLSchema-instance\" xsi:schemaLocation=\"http://www.topografix.com/GPX/1/1 http://www.topografix.com/GPX/1/1/gpx.xsd\" version=\"1.1\" xmlns=\"http://www.topografix.com/GPX/1/1\">\n" +
        "    <metadata>\n" +
        "     <name>" + gpxtitle + "</name>\n" +
        "     <author>\n" +
        "      <name>O Smith</name>\n" +
        "      <link href=\"https://www.strava.com/athletes/609144\"/>\n" +
        "     </author>\n" +
        "    </metadata>\n" +
        "    <trk>\n" +
        "     <name>" + gpxtitle + "</name>\n" +
        "     <type>cycling</type>\n" +
        "     <trkseg>";
    for (let k = 0; k < points.length; k++) {
        gpxstring += '   <trkpt lat="' + points[k][0] + '" lon="' + points[k][1] + '">\n' +
            '   </trkpt>'
    }

    gpxstring += '     </trkseg>\n' +
        '    </trk>\n' +
        '   </gpx>';
    return gpxstring;
}

function download(filename, text) {
    statusUpdate("Downloading GPX file");
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

function buildURLopto(data) {
    if (data.length == 0) {
        statusUpdate("Error no points found to route");
        exit (1);
    }
    let type = "optimized_route";
    let locations = {
        "locations": [],
        "costing": "bicycle",
        "costing_options": {"bicycle": {"bicycle_type": bikeType}},
        "directions_options": {"units": "miles"}
    };
    for (let i = 0; i < data.length; i++) {
        locations.locations[i] = {"lat": data[i][0].edges[0].correlated_lat, "lon": data[i][0].edges[0].correlated_lon}
    }
    locations.locations[data.length++] = {
        "lat": data[0][0].edges[0].correlated_lat,
        "lon": data[0][0].edges[0].correlated_lon
    }
    return VHServer + '/' + type + '?json=' + JSON.stringify(locations);
}

function buildURLstandard(data) {
    let type = "route";
    let locations = {
        "locations": [],
        "costing": "bicycle",
        "costing_options": {"bicycle": {"bicycle_type": bikeType}},
        "directions_options": {"units": "miles"}
    };
    for (let i = 0; i < data.length; i++) {
        locations.locations[i] = {"lat": data[i][1], "lon": data[i][0]};
    }
    return VHServer + '/route?json=' + JSON.stringify(locations);
}

function compare(loopvar, thevariable, comsign,) {
    if (comsign == "<") {
        return loopvar < thevariable;
    }
    if (comsign == ">") {
        return loopvar > thevariable;
    }
}

function initApp() {
    //for each square in sqr of sqrs
    // find lat and longtiude
    // use locate() to find closest rela point using valhalla locate
    //add something in to start centrally? or top/bottom/left/right
    let xinc = 1;
    let yinc = 1;
    let comsignx = "<";
    let comsigny = "<";
    if (StartCorner == "tl") {
        //no change needed
    }
    if (StartCorner == "tr") {
        gridsizex = -gridsizex
        xinc = -1
        comsignx = ">"
    }
    if (StartCorner == "bl") {
        gridsizey = -gridsizey
        yinc = -1
        comsigny = ">"
    }
    if (StartCorner == "br") {
        gridsizex = -gridsizex
        gridsizey = -gridsizey
        xinc = -1
        yinc = -1
        comsignx = ">"
        comsigny = ">"
    }
    for (let x = 0; compare(x, gridsizex, comsignx); x = x + xinc) {
        for (let y = 0; compare(y, gridsizey, comsigny); y = y + yinc) {
            let thislong = tile2long(startx + x + offset, zoom);
            let thislat = tile2lat(starty + y + offset, zoom);
            locate(thislong, thislat, startx + x, starty + y);
        }
    }

    // build a optimized route URL query
    // then query VH and put reply in data var (erk rename)
    let url = buildURLopto(data); //using data var built in locate()

    let optodata = []; //unset data
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            optodata = JSON.parse(xhttp.responseText);
        }
    };
    xhttp.open("GET", url, false);
    xhttp.send();

    //console.log(data);
    //loop through each part of journey and record the points before an after crossing a square edge
    let legs = optodata.trip.legs;
    let cop = [];
    let crossings = [];
    for (let j = 0; j < legs.length; j++) {
        cop = getCrossoverPoints(legs[j].shape);
        for (let k = 0; k < cop.length; k++) {
            crossings[crossings.length++] = cop[k];
        }
    }

    // build a URL for a stadard roiute between all the crossing points
    // if you do an opto it will reroute and miss squares!
    let newurl = buildURLstandard(crossings);
    console.log(newurl);

    let newdata = [];
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            newdata = JSON.parse(xhttp.responseText);
        }
    };
    xhttp.open("GET", newurl, false);
    xhttp.send();

    //get all the points from the reuslt and build a gpx file
    let points = [];
    let newlegs = newdata.trip.legs;
    let ss = [];
    for (let j = 0; j < newlegs.length; j++) {
        let pline = plinedecode(newlegs[j].shape);
        points = points.concat(pline);
    }

    let gpxstring = pointstoGPX(points);
    //weird fake download thing...
    download(gpxtitle + ".gpx", gpxstring);
}

function statusUpdate(msg){
    var d1 = document.getElementById('status');
    d1.insertAdjacentHTML('beforeend', msg+'<br>');
    d1.scrollTop = d1.scrollHeight;
}