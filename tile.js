
/**
 * returns the y value of a Square
 * @param {*} lon Longitude
 * @param {*} zoom tile zoom normal 14
 * @returns {number}
 */
const long2tile = (lon, zoom =14) => {
  return Math.floor(((lon + 180) / 360) * (2 ** zoom));
};

/**
 * returns the x value of a square
 * @param {*} lat Latitude
 * @param {*} zoom 
 * @returns {number}
 */
const lat2tile = (lat, zoom =14) => {
  const latRad = lat * Math.PI / 180; // Convert latitude to radians
  const sinLat = Math.sin(latRad);
  const tanLat = Math.tan(latRad);

  // The core Mercator projection formula
  const mercatorN = Math.log(tanLat + (1 / Math.cos(latRad))) / Math.PI;
  const tileY = (1 - mercatorN) / 2 * (2 ** zoom);
  return Math.floor(tileY);
};

/**
 * returns the Latitude of Square X
 * @param {*} x 
 * @param {*} z tile zoom normal 14
 * @returns {number}
 */
const tile2long = (x, z = 14) => {
  return (x / (2 ** z) * 360 - 180);
};

/**
 * returns Longtitude of Square Y
 * @param {*} y 
 * @param {*} z tile zoom normal 14
 * @returns {number}
 */
const tile2lat = (y, z = 14) => {
  // Calculate 'n' based on the inverse Mercator projection formula
  const n = Math.PI - (2 * Math.PI * y) / (2 ** z);
  const latitudeRadians = Math.atan(Math.sinh(n)); // Or Math.atan(0.5 * (Math.exp(n) - Math.exp(-n)));
  // Convert radians to degrees
  return (180 / Math.PI) * latitudeRadians;
};

const locate = (long, lat, x, y, data, callback) => {
    let query =
        {
            "verbose": false,
            "locations": [{"lat": lat, "lon": long,"rank_candidates":"false"}],
            "costing": "bicycle",
            "costing_options": {"bicycle": {"bicycle_type": bikeType}},
            "directions_options": {"units": "miles"}
        };

    let url = VHServer + '/locate?json=' + JSON.stringify(query);
    var xhttp = new XMLHttpRequest();
    xhttp.onreadystatechange = function () {
        if (this.readyState == 4 && this.status == 200) {
            result = JSON.parse(xhttp.responseText);
            if (result[0].edges == null) {
                statusUpdate("Failed to locate square:" + x + "," + y)
                callback(new Error("Failed to locate square:"+ x + "," + y),null);
            } else {
                let count = data.length;
                data[count] = result;
                data[count].sqrx = x;
                data[count].sqry = y;
                callback(null,data);
            }
        }

    };
    xhttp.open("GET", url, false);
    xhttp.send();
}

const getCrossoverPoints = (polyline) => {
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
            before = [points[i][1], points[i][0]];
        }
        if (last != x + "::" + y) {
            last = x + "::" + y; //set this as last seen square
            //record the point we crossed
            after = [points[i][1], points[i][0]];
            crossings[num] = before;
            num++;
            crossings[num] = after;
            num++;
        }
        before = [points[i][1], points[i][0]];
    }
    return crossings;
}

// This is adapted from the implementation in Project-OSRM
// https://github.com/DennisOSRM/Project-OSRM-Web/blob/master/WebContent/routing/OSRM.RoutingGeometry.js
const plinedecode = (str, precision = 6) => {
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


const pointstoGPX = (points) => {
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

const download = (filename, text) => {
    statusUpdate("Downloading GPX file");
    var element = document.createElement('a');
    element.setAttribute('href', 'data:text/plain;charset=utf-8,' + encodeURIComponent(text));
    element.setAttribute('download', filename);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
}

const buildURLopto = (data) => {
    if (data.length == 0) {
        statusUpdate("Error no points found to route");
        exit(1);
    }
    let type = "optimized_route";
    let locations = {
        "locations": [],
        "costing": "bicycle",
        "costing_options": {"bicycle": {"bicycle_type": bikeType}},
        "directions_options": {"units": "km"},
        "directions_type":"none"
    };
    for (let i = 0; i < data.length; i++) {
        locations.locations[i] = {"lat": data[i][0].edges[0].correlated_lat, "lon": data[i][0].edges[0].correlated_lon}
    }
    locations.locations[data.length++] = {
        "lat": data[0][0].edges[0].correlated_lat,
        "lon": data[0][0].edges[0].correlated_lon
    }
    setMap(data[0][0].edges[0].correlated_lat, data[0][0].edges[0].correlated_lon)
    return VHServer + '/' + type + '?json=' + JSON.stringify(locations);
}

const buildURLstandard = (data) => {
    console.log("getting route " + data.length + " points long");
    let type = "optimized_route";
    let locations = {
        "locations": [],
        "costing": "bicycle",
        "costing_options": {"bicycle": {"bicycle_type": bikeType}},
        "directions_options": {"units": "km"},
        "directions_type":"none"
    };
    for (let i = 0; i < data.length; i++) {
        locations.locations[i] = {"lat": data[i][1], "lon": data[i][0]};
    }
    return VHServer + '/route?json=' + JSON.stringify(locations);
}

const compare = (loopvar, thevariable, comsign,) => {
    if (comsign == "<") {
        return loopvar < thevariable;
    }
    if (comsign == ">") {
        return loopvar > thevariable;
    }
}

const initApp = () => {
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
    if (StartCorner != "central") {
        for (let x = 0; compare(x, gridsizex, comsignx); x = x + xinc) {
            for (let y = 0; compare(y, gridsizey, comsigny); y = y + yinc) {
                let thislong = tile2long(startx + x + offset, zoom);
                let thislat = tile2lat(starty + y + offset, zoom);
                locate(thislong, thislat, startx + x, starty + y, data, (error, data) => {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Received data:', data);
                        data = data;
                    }
                }
                );
            }
        }
    } else {
        let cenx = Math.floor(gridsizex / 2);
        let ceny = Math.floor(gridsizey / 2);
        let thislong = tile2long(startx + offset, zoom);
        let thislat = tile2lat(starty + offset, zoom);
        locate(thislong, thislat, startx + cenx, starty + ceny,data, (error, data) => {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Received data:', data);
                        data = data;
                    }
                }
                );
        for (let x = -cenx; compare(x, cenx, comsignx); x = x + xinc) {
            for (let y = -ceny; compare(y, ceny, comsigny); y = y + yinc) {
                if (x == 0 && y == 0) {
                    console.log("Dont redo start");
                } else {
                    let thislong = tile2long(startx + x + offset, zoom);
                    let thislat = tile2lat(starty + y + offset, zoom);
                    locate(thislong, thislat, startx + x, starty + y,data, (error, data) => {
                    if (error) {
                        console.error(error);
                    } else {
                        console.log('Received data:', data);
                        data = data;
                    }
                }
                );
                }
            }
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
    console.log(optodata)
    let legs = optodata.trip.legs;
    let cop = [];
    let crossings = [];
    for (let j = 0; j < legs.length; j++) {
        cop = getCrossoverPoints(legs[j].shape);
        for (let k = 0; k < cop.length; k++) {
            crossings[crossings.length++] = cop[k];
        }
    }
//
    uniqCrossings = [...new Set(crossings)];
    
    minset = getMinimumPoints(uniqCrossings);
    // build a URL for a standard route between all the crossing points
    // if you do an opto it will reroute and miss squares!
    //let newurl = buildURLstandard(uniqCrossings);
    let newurl = buildURLstandard(minset);
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
    for (let j = 0; j < newlegs.length; j++) {
        let pline = plinedecode(newlegs[j].shape);
        points = points.concat(pline);
    }

    let gpxstring = pointstoGPX(points);
    //weird fake download thing...
    displayGPXonMap(gpxstring);
    download(gpxtitle + ".gpx", gpxstring);
}

const getMinimumPoints = (points) => {
    let minimumPoints = [];
    let seenSquares = [];
    for (let i = 0; i < points.length; i++) {
        var ll = points[i];
        let long = ll[0];
        let lat = ll[1];
        let x = long2tile(long);
        let y = lat2tile(lat);
        let mung = x + "::"+ y;
        console.log("Checking for "+mung);
        if( seenSquares[mung] !==undefined && seenSquares[mung] === true ) {
            //ignore this item
            console.log("seen it");
        } else {
            console.log("havent seen it");
            minimumPoints[minimumPoints.length++] = ll;
            seenSquares[mung] = true;
        }
    }
    //add in the finish
    minimumPoints[minimumPoints.length++] = ll;
    console.log(minimumPoints);
    return minimumPoints;
}

const statusUpdate = (msg) => {
    var d1 = document.getElementById('status');
    d1.insertAdjacentHTML('beforeend', msg + '<br>');
    d1.scrollTop = d1.scrollHeight;
}

const setMap = (lat, lon) => {
    map.setView([lat, lon], 10);
    L.tileLayer('https://tile.openstreetmap.org/{z}/{x}/{y}.png', {
        maxZoom: 19,
        attribution: '&copy; <a href="http://www.openstreetmap.org/copyright">OpenStreetMap</a>'
    }).addTo(map);
}

const displayGPXonMap = (gpx) => {
    new L.GPX(gpx, {
        async: true
    }).on('loaded', function (e) {
        map.fitBounds(e.target.getBounds());
        distance = Math.round(e.target.get_distance() / 1000);
        kmpersqr = Math.round((e.target.get_distance() / 10) / (gridsizey * gridsizex)) / 100;
        statusUpdate("Route is " + distance + "km long");
        statusUpdate(kmpersqr + "km per square");
    }).addTo(map);
}