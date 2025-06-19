# square-routes

### very much a proof of concept

1. Fire up a instance of https://github.com/nilsnolde/docker-valhalla?tab=readme-ov-file
2. use ./vahalla-config.sh to generate a config file
3. Install some maps

1. Fire up a webserver to access index.html
2. fill in the form and generate a gpx route of a square of squares

- Square X and Y coords come from https://veloviewer.com/explorer

### How it works

1. The 'App' calculates the center of all the squares
    - initApp()
2. It uses the Vahalla Server to locate a street/path/intersection near to that
    - locate()
3. Once all the points are know the Vahlla server generates a optimised route
    - buildURLopto()
4. The App loops thru the route checking which points cross the border of a square and chops the route
    - getCrossoverPoints()
5. The App then request an unoptimised route without any unneed bits of route (reqesting optimised will miss out squares)
    - buildURLstandard()
6. App then creates a gpx file for download and displays the route on the website
    - pointstoGPX()
    - displayGPXonMap()
    - download()

### Helper functions 
#### gets long and lat from tile xy or the reverse
- long2tile
- lat2tile
- tile2long
- tile2lat
#### This is adapted from the implementation in Project-OSRM:
(decodes polylines https://developers.google.com/maps/documentation/utilities/polylinealgorithm?_gl=1*1bpw0oe*_up*MQ..*_ga*MTUyMTI5MjY0Ny4xNzUwMTU0MDM0*_ga_NRWSTWS78N*czE3NTAxNTQwMzMkbzEkZzEkdDE3NTAxNTQwMzUkajU4JGwwJGgw )
- plinedecode 

![website](screenshot.png)
![squares](squaresExample.png)





 




