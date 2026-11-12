// GardenDex phone sync test 🌱
/* =========================================
   GARDENDEX
   Supabase + Garden Map
========================================= */


/* =========================================
   1. SUPABASE CONNECTION
========================================= */

const SUPABASE_URL =
    "https://sgwkcriiejahqalomecg.supabase.co";


const SUPABASE_PUBLISHABLE_KEY =
    "sb_publishable_0KyxhEkWwMVmcDsdP9yCXA_GDjKaCu4";


const supabaseClient =
    supabase.createClient(
        SUPABASE_URL,
        SUPABASE_PUBLISHABLE_KEY
    );


/* =========================================
   2. PAGE ELEMENTS
========================================= */

const gardenMap =
    document.getElementById("garden-map");

const currentZone =
    document.getElementById("current-zone");

const backToGarden =
    document.getElementById("back-to-garden");

let plantViewFilter = "current";
const WHOLE_GARDEN_VIEW =
    "-350 0 6700 7400";
const connectionStatus =
    document.getElementById("connection-status");


const plantPanel =
    document.getElementById("plant-panel");


const closePanel =
    document.getElementById("close-panel");


/* =========================================
   3. LOAD GARDEN FROM SUPABASE
========================================= */

async function loadGarden() {

    connectionStatus.textContent =
        "Loading garden...";


    const { data, error } =
        await supabaseClient

            .from("Full_Zones")

            .select(
                "polygon, point_order, geogebra_point, x_cm, y_cm"
            )

            .order(
                "point_order",
                { ascending: true }
            );


    if (error) {

        console.error(
            "Supabase error:",
            error
        );


        connectionStatus.textContent =
            "Connection error";


        return;
    }


    console.log(
        "Garden data from Supabase:",
        data
    );


    connectionStatus.textContent =
        `${data.length} map points loaded`;


    drawGarden(data);

await loadPlants();

}


/* =========================================
   4. GROUP DATA INTO POLYGONS
========================================= */

function drawGarden(rows) {
    window.gardenSurveyRows = rows;


    /*
       Supabase gives us rows like:

       BigGarden | 1 | D | 920 | 400
       BigGarden | 2 | E | 1060 | 0

       We first group those rows
       by polygon name.
    */


    const polygons = {};


    rows.forEach(row => {


        if (!polygons[row.polygon]) {

            polygons[row.polygon] = [];

        }


        polygons[row.polygon].push({

            pointName:
                row.geogebra_point,

            order:
                Number(row.point_order),

            x:
                Number(row.x_cm),

            y:
                Number(row.y_cm)

        });

    });


    console.log(
        "Grouped polygons:",
        polygons
    );


    /*
       Clear map before drawing.
    */

    gardenMap.innerHTML = "";
addGardenMaterials();
createMapLayers();
drawRoad();
    /*
       Draw every polygon Supabase returned.
    */


    Object.entries(polygons)
        .forEach(
            ([polygonName, points]) => {


                drawPolygon(
                    polygonName,
                    points
                );


            }
        );
drawStoneWallBoundary();
drawGardenStructures(polygons);
refreshGardenAtlas();
drawObservedGardenLamps();
}

function createMapLayers() {

    const svgNS =
        "http://www.w3.org/2000/svg";

    const layers = [
        "terrain-layer",
        "boundary-layer",
        "structure-layer",
        "plant-layer",
        "overlay-layer"
    ];

    layers.forEach(id => {

        const layer =
            document.createElementNS(
                svgNS,
                "g"
            );

        layer.setAttribute(
            "id",
            id
        );

        gardenMap.appendChild(
            layer
        );

    });
}


/* =========================================
   GARDENDEX ROAD
   REAL COORDINATES:
   X = -100 → 6500
   Y = 0 → -200
========================================= */

/* =========================================
   GARDENDEX ROAD
   REAL COORDINATES:
   X = -350 → 6500
   Y = 0 → -350
========================================= */

function drawRoad() {

    const svgNS =
        "http://www.w3.org/2000/svg";

    const SVG_HEIGHT = 7000;

    const terrainLayer =
        gardenMap.querySelector(
            "#terrain-layer"
        );

    if (!terrainLayer) {
        return;
    }

    const road =
        document.createElementNS(
            svgNS,
            "image"
        );

    /*
       Extend road farther left.
    */
    road.setAttribute(
        "x",
        -350
    );

    /*
       Real Y = 0
       starts at SVG Y = 7000.
    */
    road.setAttribute(
        "y",
        SVG_HEIGHT
    );

    /*
       -350 → 6500
       gives total width of 6850 cm.
    */
    road.setAttribute(
        "width",
        6850
    );

    /*
       Road now extends 350 cm
       downward:
       real Y = 0 → -350.
    */
    road.setAttribute(
        "height",
        350
    );

    road.setAttribute(
        "href",
        "assets/terrain/Road.PNG"
    );

    road.setAttribute(
        "preserveAspectRatio",
        "none"
    );

    road.style.pointerEvents =
        "none";

    terrainLayer.appendChild(
        road
    );
}
/* =========================================
   GARDENDEX TEMPORARY ALL BOUNDARIES
   USES EXACT SUPABASE POLYGON GEOMETRY
========================================= */

function drawAllZoneBoundaries(polygons) {

    const svgNS = "http://www.w3.org/2000/svg";
    const SVG_HEIGHT = 7000;

    const boundaryLayer =
        gardenMap.querySelector("#boundary-layer");

    if (!boundaryLayer) {
        return;
    }

    /*
       VISUAL SETTINGS ONLY.
       Geometry remains exactly as stored
       in Supabase.
    */

    const wallWidth = 45;
    const tileLength = 180;

    Object.entries(polygons).forEach(
        ([polygonName, points]) => {

            /*
               House is a structure rather than
               a garden boundary, so don't put
               a stone wall around the house.
            */

            if (polygonName === "House") {
                return;
            }

            /*
               Preserve exact GeoGebra order.
            */

            const orderedPoints =
                [...points].sort(
                    (a, b) =>
                        a.order - b.order
                );


            /*
               Convert the exact polygon into
               individual boundary segments.

               The final point automatically
               reconnects to the first point.
            */

            for (
                let i = 0;
                i < orderedPoints.length;
                i++
            ) {

                const start =
                    orderedPoints[i];

                const end =
                    orderedPoints[
                        (i + 1) %
                        orderedPoints.length
                    ];


                const startX =
                    Number(start.x);

                const startY =
                    SVG_HEIGHT -
                    Number(start.y);

                const endX =
                    Number(end.x);

                const endY =
                    SVG_HEIGHT -
                    Number(end.y);


                const dx =
                    endX - startX;

                const dy =
                    endY - startY;


                const length =
                    Math.sqrt(
                        (dx * dx) +
                        (dy * dy)
                    );


                if (length <= 0) {
                    continue;
                }


                const angle =
                    Math.atan2(
                        dy,
                        dx
                    ) * 180 / Math.PI;


                /*
                   Segment group.
                */

                const group =
                    document.createElementNS(
                        svgNS,
                        "g"
                    );


                group.setAttribute(
                    "transform",
                    `translate(${startX} ${startY}) rotate(${angle})`
                );


                group.setAttribute(
                    "data-boundary-zone",
                    polygonName
                );


                group.style.pointerEvents =
                    "none";


                /*
                   Very subtle shadow.
                */

                const shadow =
                    document.createElementNS(
                        svgNS,
                        "rect"
                    );


                shadow.setAttribute(
                    "x",
                    "0"
                );


                shadow.setAttribute(
                    "y",
                    (-wallWidth / 2) + 5
                );


                shadow.setAttribute(
                    "width",
                    length
                );


                shadow.setAttribute(
                    "height",
                    wallWidth
                );


                shadow.setAttribute(
                    "fill",
                    "#26372f"
                );


                shadow.setAttribute(
                    "opacity",
                    "0.12"
                );


                group.appendChild(
                    shadow
                );


                /*
                   Repeat wall artwork along
                   this exact segment.
                */

                for (
                    let x = 0;
                    x < length;
                    x += tileLength
                ) {

                    const remaining =
                        length - x;


                    const pieceLength =
                        Math.min(
                            tileLength,
                            remaining
                        );


                    const wallImage =
                        document.createElementNS(
                            svgNS,
                            "image"
                        );


                    wallImage.setAttribute(
                        "href",
                        "assets/boundary/mossywall.png"
                    );


                    wallImage.setAttribute(
                        "x",
                        x
                    );


                    wallImage.setAttribute(
                        "y",
                        -wallWidth / 2
                    );


                    wallImage.setAttribute(
                        "width",
                        pieceLength
                    );


                    wallImage.setAttribute(
                        "height",
                        wallWidth
                    );


                    wallImage.setAttribute(
                        "preserveAspectRatio",
                        "none"
                    );


                    wallImage.style.pointerEvents =
                        "none";


                    group.appendChild(
                        wallImage
                    );
                }


                boundaryLayer.appendChild(
                    group
                );
            }
        }
    );
}
/* =========================================
   5. DRAW ONE POLYGON
========================================= */

function drawPolygon(
    polygonName,
    points
) {


    /*
       Always respect GeoGebra
       vertex order.
    */

    points.sort(
        (a, b) =>
            a.order - b.order
    );


    /*
       Create SVG polygon.
    */

    const polygon =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "polygon"
        );


    /*
       IMPORTANT

       GeoGebra:
       Y increases upwards.

       Browser SVG:
       Y increases downwards.

       Therefore we flip Y for DISPLAY ONLY.

       Original Supabase coordinates
       remain completely untouched.
    */


    const SVG_HEIGHT = 7000;


    const svgPoints =
        points.map(point => {


            const displayX =
                point.x;


            const displayY =
                SVG_HEIGHT - point.y;


            return (
                `${displayX},${displayY}`
            );


        }).join(" ");


    polygon.setAttribute(
        "points",
        svgPoints
    );


    polygon.setAttribute(
        "class",
        "map-polygon"
    );


    polygon.setAttribute(
        "data-polygon",
        polygonName
    );


    polygon.setAttribute(
        "fill",
        getPolygonColour(
            polygonName
        )
    );


    /*
       Click polygon to check
       what GardenDex thinks it is.
    */

    polygon.addEventListener(
    "click",
    (event) => {

        if (placementMode) {
            return;
        }

        event.stopPropagation();

        zoomToZone(
            polygon,
            polygonName
        );

    }
);

const terrainLayer =
    gardenMap.querySelector(
        "#terrain-layer"
    );

terrainLayer.appendChild(
    polygon
);

if (polygonName === "House") {

    // Concrete pavement underneath the house
    drawTerrainArtwork(
        points,
        "house-pavement",
        "assets/terrain/pavement.png",
        450
    );

    // House structure above the pavement
    drawHouseArtwork(
        points
    );

}


if (polygonName === "Bark") {

    drawBarkArtwork(
        points
    );

}
if (polygonName === "BigGarden") {
    drawTerrainArtwork(
        points,
        "big-garden",
        "assets/terrain/grass.png",
        400
    );
}

if (polygonName === "ChildrenGarden") {
    drawTerrainArtwork(
        points,
        "children-garden",
        "assets/terrain/grass.png",
        400
    );
}

if (polygonName === "PineTrees") {
    drawTerrainArtwork(
        points,
        "pine-trees",
        "assets/terrain/pine.png",
        350
    );
}

if (polygonName === "Driveway") {
    drawTerrainArtwork(
        points,
        "driveway",
        "assets/terrain/drivewaymoss.png",
        300
    );
}
}
/* =========================================
   GARDENDEX STONE WALL BOUNDARY
   TOP-DOWN MOSSY WALL TEXTURE
   REAL SURVEY COORDINATES
========================================= */

function drawStoneWallBoundary() {

    const svgNS = "http://www.w3.org/2000/svg";
    const SVG_HEIGHT = 7000;

    const boundaryLayer =
        gardenMap.querySelector("#boundary-layer");

    if (!boundaryLayer) {
        return;
    }

    /*
       REAL SURVEYED WALL SECTIONS

       Gate opening remains empty:
       (550,400) → (920,400)
    */

    const wallSections = [
        [
            { x: 0, y: 0 },
            { x: 410, y: 0 },
            { x: 550, y: 400 }
        ],
        [
            { x: 920, y: 400 },
            { x: 1060, y: 0 },
            { x: 1430, y: 0 }
        ]
    ];

    /*
       Visual settings only.
       These DO NOT alter survey geometry.
    */

    const wallWidth = 70;
    const tileLength = 180;

    wallSections.forEach(section => {

        for (let i = 0; i < section.length - 1; i++) {

            const start = section[i];
            const end = section[i + 1];

            /*
               Convert real garden coordinates
               to SVG display coordinates.
            */

            const startX = start.x;
            const startY = SVG_HEIGHT - start.y;

            const endX = end.x;
            const endY = SVG_HEIGHT - end.y;

            const dx = endX - startX;
            const dy = endY - startY;

            const length =
                Math.sqrt(
                    (dx * dx) +
                    (dy * dy)
                );

            const angle =
                Math.atan2(dy, dx) *
                180 / Math.PI;


            /*
               Each wall section starts at its
               exact surveyed coordinate and
               rotates along the exact segment.
            */

            const group =
                document.createElementNS(
                    svgNS,
                    "g"
                );

            group.setAttribute(
                "transform",
                `translate(${startX} ${startY}) rotate(${angle})`
            );

            group.style.pointerEvents = "none";


            /*
               Small shadow underneath wall.
            */

            const shadow =
                document.createElementNS(
                    svgNS,
                    "rect"
                );

            shadow.setAttribute("x", "0");
            shadow.setAttribute(
                "y",
                (-wallWidth / 2) + 8
            );

            shadow.setAttribute(
                "width",
                length
            );

            shadow.setAttribute(
                "height",
                wallWidth
            );

            shadow.setAttribute(
                "fill",
                "#26372f"
            );

            shadow.setAttribute(
                "opacity",
                "0.18"
            );

            group.appendChild(shadow);


            /*
               Repeat the TOP-DOWN wall PNG
               along the surveyed segment.
            */

            for (
                let x = 0;
                x < length;
                x += tileLength
            ) {

                const remaining =
                    length - x;

                const pieceLength =
                    Math.min(
                        tileLength,
                        remaining
                    );

                const wallImage =
                    document.createElementNS(
                        svgNS,
                        "image"
                    );

                wallImage.setAttribute(
                    "href",
                    "assets/boundary/mossywall.png"
                );

                wallImage.setAttribute(
                    "x",
                    x
                );

                wallImage.setAttribute(
                    "y",
                    -wallWidth / 2
                );

                wallImage.setAttribute(
                    "width",
                    pieceLength
                );

                wallImage.setAttribute(
                    "height",
                    wallWidth
                );

                wallImage.setAttribute(
                    "preserveAspectRatio",
                    "none"
                );

                wallImage.style.pointerEvents =
                    "none";

                group.appendChild(
                    wallImage
                );
            }

            boundaryLayer.appendChild(group);
        }
    });
}/* =========================================
   GARDENDEX HOUSE ARTWORK
   VISUAL ONLY — GEOMETRY NEVER CHANGES
========================================= */

function drawHouseArtwork(points) {

    const svgNS =
        "http://www.w3.org/2000/svg";

    const SVG_HEIGHT = 7000;


    /*
       Convert the REAL House coordinates
       into SVG display coordinates.

       Supabase coordinates remain untouched.
    */

    const displayPoints =
        points.map(point => ({
            x: Number(point.x),
            y: SVG_HEIGHT - Number(point.y)
        }));


    /*
       Find exact display bounds of
       the existing House polygon.
    */

    const xs =
        displayPoints.map(point => point.x);

    const ys =
        displayPoints.map(point => point.y);


    const minX = Math.min(...xs);
    const maxX = Math.max(...xs);

    const minY = Math.min(...ys);
    const maxY = Math.max(...ys);


    const width =
        maxX - minX;

    const height =
        maxY - minY;


    /*
       Create an exact clip path from
       the existing House polygon.
    */

    const defs =
        gardenMap.querySelector(
            "#gardendex-materials"
        );

    const clipPath =
        document.createElementNS(
            svgNS,
            "clipPath"
        );

    clipPath.setAttribute(
        "id",
        "house-artwork-clip"
    );


    const clipPolygon =
        document.createElementNS(
            svgNS,
            "polygon"
        );


    const clipPoints =
        displayPoints
            .map(point =>
                `${point.x},${point.y}`
            )
            .join(" ");


    clipPolygon.setAttribute(
        "points",
        clipPoints
    );


    clipPath.appendChild(
        clipPolygon
    );


    defs.appendChild(
        clipPath
    );


    /*
       Load the illustrated PNG.
    */

    const houseImage =
        document.createElementNS(
            svgNS,
            "image"
        );


    houseImage.setAttribute(
        "href",
        "assets/structures/house.png"
    );


    /*
       Fit artwork to the REAL
       House polygon bounds.
    */

    const houseScale = 1.20;

const scaledWidth =
    width * houseScale;

const scaledHeight =
    height * houseScale;

houseImage.setAttribute(
    "x",
    minX - ((scaledWidth - width) / 2)
);

const houseYOffset = -100; // move house 1 metre upward

houseImage.setAttribute(
    "y",
    minY - ((scaledHeight - height) / 2) + houseYOffset
);

houseImage.setAttribute(
    "width",
    scaledWidth
);

houseImage.setAttribute(
    "height",
    scaledHeight
);


    /*
       Fill the House footprint.

       slice avoids empty bands around
       the artwork. Anything outside
       the real polygon gets clipped.
    */

    houseImage.setAttribute(
        "preserveAspectRatio",
        "xMidYMid meet"
    );

    houseImage.setAttribute(
        "class",
        "house-artwork"
    );


    /*
       The polygon underneath remains
       responsible for interaction.
    */

    houseImage.style.pointerEvents =
        "none";


 const structureLayer =
    gardenMap.querySelector(
        "#structure-layer"
    );

structureLayer.appendChild(
    houseImage
);
}
/* =========================================
   GARDENDEX BARK ARTWORK
   VISUAL ONLY — GEOMETRY NEVER CHANGES
========================================= */

function drawBarkArtwork(points) {

    const svgNS =
        "http://www.w3.org/2000/svg";

    const SVG_HEIGHT = 7000;

    // Convert REAL Supabase coordinates
    // to SVG display coordinates.
    const displayPoints =
        points.map(point => ({
            x: Number(point.x),
            y: SVG_HEIGHT - Number(point.y)
        }));

    const defs =
        gardenMap.querySelector(
            "#gardendex-materials"
        );

    // Exact Bark polygon from Supabase.
    const clipPath =
        document.createElementNS(
            svgNS,
            "clipPath"
        );

    clipPath.setAttribute(
        "id",
        "bark-artwork-clip"
    );

    const clipPolygon =
        document.createElementNS(
            svgNS,
            "polygon"
        );

    clipPolygon.setAttribute(
        "points",
        displayPoints
            .map(point =>
                `${point.x},${point.y}`
            )
            .join(" ")
    );

    clipPath.appendChild(
        clipPolygon
    );

    defs.appendChild(
        clipPath
    );


    // Create a SMALL repeating Bark texture.
    const pattern =
        document.createElementNS(
            svgNS,
            "pattern"
        );

    pattern.setAttribute(
        "id",
        "bark-artwork-pattern"
    );

    pattern.setAttribute(
        "patternUnits",
        "userSpaceOnUse"
    );


    // ↓ THIS controls bark-chip scale.
    const tileSize = 280;

    pattern.setAttribute(
        "width",
        tileSize
    );

    pattern.setAttribute(
        "height",
        tileSize
    );


    const tileImage =
        document.createElementNS(
            svgNS,
            "image"
        );

    tileImage.setAttribute(
        "href",
        "assets/terrain/bark.png"
    );

    tileImage.setAttribute(
        "x",
        "0"
    );

    tileImage.setAttribute(
        "y",
        "0"
    );

    tileImage.setAttribute(
        "width",
        tileSize
    );

    tileImage.setAttribute(
        "height",
        tileSize
    );

    tileImage.setAttribute(
        "preserveAspectRatio",
        "xMidYMid slice"
    );

    pattern.appendChild(
        tileImage
    );

    defs.appendChild(
        pattern
    );


    // Draw one polygon using the repeating texture.
    const barkTerrain =
        document.createElementNS(
            svgNS,
            "polygon"
        );

    barkTerrain.setAttribute(
        "points",
        displayPoints
            .map(point =>
                `${point.x},${point.y}`
            )
            .join(" ")
    );

    barkTerrain.setAttribute(
        "fill",
        "url(#bark-artwork-pattern)"
    );

    barkTerrain.setAttribute(
        "clip-path",
        "url(#bark-artwork-clip)"
    );

    barkTerrain.setAttribute(
        "class",
        "bark-artwork"
    );

    // Original map polygon remains clickable.
    barkTerrain.style.pointerEvents =
        "none";

    const terrainLayer =
    gardenMap.querySelector(
        "#terrain-layer"
    );

terrainLayer.appendChild(
    barkTerrain
);
}
/* =========================================
   GARDENDEX REUSABLE TERRAIN ARTWORK
   EXACT GEOMETRY + SMALL REPEATING TEXTURE
========================================= */

function drawTerrainArtwork(
    points,
    terrainName,
    imagePath,
    tileSize
) {

    const svgNS =
        "http://www.w3.org/2000/svg";

    const SVG_HEIGHT = 7000;


    // REAL Supabase coordinates.
    const displayPoints =
        points.map(point => ({
            x: Number(point.x),
            y: SVG_HEIGHT - Number(point.y)
        }));


    const pointString =
        displayPoints
            .map(point =>
                `${point.x},${point.y}`
            )
            .join(" ");


    const defs =
        gardenMap.querySelector(
            "#gardendex-materials"
        );


    /* ---------- EXACT CLIP ---------- */

    const clipId =
        `${terrainName}-artwork-clip`;

    const clipPath =
        document.createElementNS(
            svgNS,
            "clipPath"
        );

    clipPath.setAttribute(
        "id",
        clipId
    );


    const clipPolygon =
        document.createElementNS(
            svgNS,
            "polygon"
        );

    clipPolygon.setAttribute(
        "points",
        pointString
    );

    clipPath.appendChild(
        clipPolygon
    );

    defs.appendChild(
        clipPath
    );


    /* ---------- REPEATING TEXTURE ---------- */

    const patternId =
        `${terrainName}-artwork-pattern`;

    const pattern =
        document.createElementNS(
            svgNS,
            "pattern"
        );

    pattern.setAttribute(
        "id",
        patternId
    );

    pattern.setAttribute(
        "patternUnits",
        "userSpaceOnUse"
    );

    pattern.setAttribute(
        "width",
        tileSize
    );

    pattern.setAttribute(
        "height",
        tileSize
    );


    const tileImage =
        document.createElementNS(
            svgNS,
            "image"
        );

    tileImage.setAttribute(
        "href",
        imagePath
    );

    tileImage.setAttribute(
        "x",
        0
    );

    tileImage.setAttribute(
        "y",
        0
    );

    tileImage.setAttribute(
        "width",
        tileSize
    );

    tileImage.setAttribute(
        "height",
        tileSize
    );

    tileImage.setAttribute(
        "preserveAspectRatio",
        "xMidYMid slice"
    );


    pattern.appendChild(
        tileImage
    );

    defs.appendChild(
        pattern
    );


    /* ---------- TERRAIN ---------- */

    const terrain =
        document.createElementNS(
            svgNS,
            "polygon"
        );

    terrain.setAttribute(
        "points",
        pointString
    );

    terrain.setAttribute(
        "fill",
        `url(#${patternId})`
    );

    terrain.setAttribute(
        "clip-path",
        `url(#${clipId})`
    );

    terrain.setAttribute(
        "class",
        "terrain-artwork"
    );

    terrain.style.pointerEvents =
        "none";


    const terrainLayer =
    gardenMap.querySelector(
        "#terrain-layer"
    );

terrainLayer.appendChild(
    terrain
);
}
/* =========================================
   6. POLYGON COLOURS
========================================= */

function getPolygonColour(name) {

    const materials = {

        BigGarden:
            "url(#lawn-pattern)",

        ChildrenGarden:
            "url(#soft-lawn-pattern)",

        Driveway:
            "url(#gravel-pattern)",

        Bark:
            "url(#bark-pattern)",

        PineTrees:
            "url(#woodland-pattern)",

        House:
            "url(#house-pattern)"

    };


    return (
        materials[name] ||
        "#d8d3c5"
    );
}


   
/* =========================================
   ZONE NAVIGATION
========================================= */

function zoomToZone(
    polygon,
    polygonName
) {
    if (!placementMode && (window.gardenSurveyRows?.some(row => row.polygon === polygonName) || polygonName === "ArchwayPath")) { openGarden3D(polygonName); return; }

    /*
       SVG calculates the exact bounding
       rectangle of the polygon as drawn.

       No garden coordinates are modified.
    */

    const box =
        polygon.getBBox();


    /*
       Add some breathing room around
       the selected zone.

       This affects DISPLAY only.
    */

    const padding =
        Math.max(
            box.width,
            box.height
        ) * 0.08;


    const viewX =
        box.x - padding;

    const viewY =
        box.y - padding;

    const viewWidth =
        box.width + (padding * 2);

    const viewHeight =
        box.height + (padding * 2);


    gardenMap.setAttribute(
        "viewBox",
        `${viewX} ${viewY} ${viewWidth} ${viewHeight}`
    );


    /*
       Update top navigation.
    */

    currentZone.textContent =
        formatZoneName(
            polygonName
        );


    backToGarden.classList.remove(
        "hidden"
    );
// Show Enter House button only when House is selected
let enterHouseBtn =
    document.getElementById("enter-house-btn");

if (polygonName === "House") {

    if (!enterHouseBtn) {
        enterHouseBtn =
            document.createElement("button");

        enterHouseBtn.id = "enter-house-btn";
        enterHouseBtn.className = "enter-house-btn";
        enterHouseBtn.textContent = "🏠 Enter House";

        document.body.appendChild(enterHouseBtn);

        enterHouseBtn.addEventListener(
            "click",
            enterHouse
        );
    }

    enterHouseBtn.classList.add("visible");

} else if (enterHouseBtn) {

    enterHouseBtn.classList.remove("visible");
}

    /*
       Fade the other zones.
    */

    document
        .querySelectorAll(
            ".map-polygon"
        )
        .forEach(zone => {

            if (zone === polygon) {

                zone.classList.add(
                    "zone-selected"
                );

                zone.classList.remove(
                    "zone-muted"
                );

            } else {

                zone.classList.add(
                    "zone-muted"
                );

                zone.classList.remove(
                    "zone-selected"
                );

            }

        });

}


/* =========================================
   RETURN TO WHOLE GARDEN
========================================= */

function showWholeGarden() {

    gardenMap.setAttribute(
        "viewBox",
        WHOLE_GARDEN_VIEW
    );


    currentZone.textContent =
        "Whole Garden";


    backToGarden.classList.add(
        "hidden"
    );


    document
        .querySelectorAll(
            ".map-polygon"
        )
        .forEach(zone => {

            zone.classList.remove(
                "zone-selected"
            );

            zone.classList.remove(
                "zone-muted"
            );

        });

}


backToGarden.addEventListener(
    "click",
    showWholeGarden
);


/* =========================================
   PRETTY ZONE NAMES
========================================= */

function formatZoneName(name) {

    /*
       Examples:

       BigGarden
       becomes
       Big Garden

       ChildrenGarden
       becomes
       Children Garden

       PineTrees
       becomes
       Pine Trees
    */

    return name
        .replace(
            /([a-z])([A-Z])/g,
            "$1 $2"
        );

}
/* =========================================
   GARDENDEX MAP MATERIALS
   VISUAL ONLY — NEVER CHANGES GEOMETRY
========================================= */

function addGardenMaterials() {

    const oldDefs =
        gardenMap.querySelector(
            "#gardendex-materials"
        );

    if (oldDefs) {
        oldDefs.remove();
    }

    const svgNS =
        "http://www.w3.org/2000/svg";

    const defs =
        document.createElementNS(
            svgNS,
            "defs"
        );

    defs.setAttribute(
        "id",
        "gardendex-materials"
    );

    defs.innerHTML = `

        <!-- BIG GARDEN / LAWN -->

        <pattern
            id="lawn-pattern"
            width="90"
            height="90"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="90"
                height="90"
                fill="#b8cb91"
            />

            <circle cx="18" cy="22" r="3"
                fill="#9fb97a"
                opacity="0.28"
            />

            <circle cx="68" cy="53" r="2.5"
                fill="#d3dfb5"
                opacity="0.35"
            />

            <path
                d="M38 74 l4 -9 M42 74 l5 -7"
                stroke="#91aa70"
                stroke-width="2"
                opacity="0.18"
            />
        </pattern>


        <!-- CHILDREN'S GARDEN -->

        <pattern
            id="soft-lawn-pattern"
            width="100"
            height="100"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="100"
                height="100"
                fill="#c8d6aa"
            />

            <circle
                cx="24"
                cy="34"
                r="3"
                fill="#a9bd87"
                opacity="0.25"
            />

            <circle
                cx="76"
                cy="72"
                r="2"
                fill="#e2e9cf"
                opacity="0.35"
            />
        </pattern>


        <!-- DRIVEWAY / GRAVEL -->

        <pattern
            id="gravel-pattern"
            width="70"
            height="70"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="70"
                height="70"
                fill="#d7d0bd"
            />

            <circle cx="12" cy="17" r="5"
                fill="#c0b7a2"
                opacity="0.48"
            />

            <circle cx="47" cy="13" r="3"
                fill="#eee8d8"
                opacity="0.65"
            />

            <circle cx="31" cy="48" r="4"
                fill="#b8af9c"
                opacity="0.42"
            />

            <circle cx="61" cy="57" r="2.5"
                fill="#f0eadb"
                opacity="0.72"
            />
        </pattern>


        <!-- BARK -->

        <pattern
            id="bark-pattern"
            width="85"
            height="85"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="85"
                height="85"
                fill="#8b6546"
            />

            <path
                d="M8 18 l19 8
                   M48 11 l22 12
                   M19 55 l24 -9
                   M54 66 l20 -8"
                stroke="#67482f"
                stroke-width="7"
                stroke-linecap="round"
                opacity="0.55"
            />

            <path
                d="M14 39 l13 5
                   M55 38 l15 -5
                   M31 75 l14 3"
                stroke="#ad8560"
                stroke-width="5"
                stroke-linecap="round"
                opacity="0.48"
            />
        </pattern>


        <!-- PINE / WOODLAND FLOOR -->

        <pattern
            id="woodland-pattern"
            width="90"
            height="90"
            patternUnits="userSpaceOnUse"
        >
            <rect
                width="90"
                height="90"
                fill="#65745a"
            />

            <path
                d="M12 19 l22 8
                   M52 17 l20 10
                   M21 62 l28 9
                   M57 53 l18 6"
                stroke="#4d5d46"
                stroke-width="3"
                opacity="0.38"
            />

            <circle
                cx="38"
                cy="41"
                r="3"
                fill="#879176"
                opacity="0.38"
            />
        </pattern>


        <!-- HOUSE — ILLUSTRATED ARCHITECTURAL MATERIAL -->

<linearGradient
    id="house-base-gradient"
    x1="0%"
    y1="0%"
    x2="100%"
    y2="100%"
>
    <stop
        offset="0%"
        stop-color="#f3eee2"
    />

    <stop
        offset="55%"
        stop-color="#ddd3c1"
    />

    <stop
        offset="100%"
        stop-color="#c9bda9"
    />
</linearGradient>


<pattern
    id="house-pattern"
    width="220"
    height="220"
    patternUnits="userSpaceOnUse"
>
    <rect
        width="220"
        height="220"
        fill="url(#house-base-gradient)"
    />

    <!-- very subtle plaster/stone grain -->

    <circle
        cx="28"
        cy="36"
        r="3"
        fill="#b9ad99"
        opacity="0.12"
    />

    <circle
        cx="143"
        cy="64"
        r="2"
        fill="#ffffff"
        opacity="0.32"
    />

    <circle
        cx="82"
        cy="171"
        r="3"
        fill="#aa9d89"
        opacity="0.10"
    />

    <circle
        cx="196"
        cy="147"
        r="2"
        fill="#ffffff"
        opacity="0.30"
    />

    <!-- soft architectural highlight -->

    <path
        d="M0 18 H220"
        stroke="#ffffff"
        stroke-width="8"
        opacity="0.18"
    />

    <!-- subtle lower depth -->

    <path
        d="M0 205 H220"
        stroke="#a99d89"
        stroke-width="10"
        opacity="0.12"
    />
</pattern>


        <!-- SOFT TERRAIN SHADOW -->

        <filter
            id="terrain-shadow"
            x="-20%"
            y="-20%"
            width="140%"
            height="140%"
        >
            <feDropShadow
                dx="0"
                dy="12"
                stdDeviation="12"
                flood-color="#20382d"
                flood-opacity="0.12"
            />
        </filter>

    `;

    gardenMap.insertBefore(
        defs,
        gardenMap.firstChild
    );
}
/* =========================================
   7. PLANT PANEL
========================================= */

if (closePanel && plantPanel) {

    closePanel.addEventListener(
        "click",
        () => {

            plantPanel.classList.add(
                "hidden"
            );

        }
    );

}


/* =========================================
   8. ADD PLANT — PLACEMENT MODE
========================================= */

const quickAdd =
    document.getElementById("quick-add");

const placementBanner =
    document.getElementById("placement-banner");

const cancelPlacement =
    document.getElementById("cancel-placement");

const addPlantPanel =
    document.getElementById("add-plant-panel");

const closeAddPlant =
    document.getElementById("close-add-plant");

const repositionPlant =
    document.getElementById("reposition-plant");

const newPlantZone =
    document.getElementById("new-plant-zone");

const newPlantCoordinates =
    document.getElementById("new-plant-coordinates");

const addPlantForm =
    document.getElementById("add-plant-form");


let placementMode = false;

let pendingPlantLocation = null;
let rowEndPlacementMode = false;

let pendingRowEndLocation = null;

/* =========================================
   START PLACEMENT
========================================= */

function startPlantPlacement() {

    placementMode = true;

    pendingPlantLocation = null;

    placementBanner.classList.remove(
        "hidden"
    );

    addPlantPanel.classList.add(
        "hidden"
    );

    gardenMap.classList.add(
        "placement-mode"
    );

}


/* =========================================
   CANCEL PLACEMENT
========================================= */

function cancelPlantPlacement() {

    placementMode = false;

    pendingPlantLocation = null;

    placementBanner.classList.add(
        "hidden"
    );

    addPlantPanel.classList.add(
        "hidden"
    );

    gardenMap.classList.remove(
        "placement-mode"
    );
const pendingMarker =
    document.getElementById(
        "pending-plant-marker"
    );

if (pendingMarker) {
    pendingMarker.remove();
}
}


/* =========================================
   MAP CLICK → GARDEN COORDINATES
========================================= */

gardenMap.addEventListener(
    "click",
    (event) => {

        if (!placementMode) {
            return;
        }

        event.preventDefault();
        event.stopPropagation();


        /*
           Convert the mouse/touch position
           into the SVG coordinate system.

           This automatically accounts for
           whichever zone is currently zoomed.
        */

        const svgPoint =
            gardenMap.createSVGPoint();

        svgPoint.x =
            event.clientX;

        svgPoint.y =
            event.clientY;


        const screenMatrix =
            gardenMap.getScreenCTM();

        if (!screenMatrix) {
            return;
        }


        const mapPoint =
            svgPoint.matrixTransform(
                screenMatrix.inverse()
            );


        /*
           SVG DISPLAY coordinates:

           X stays the same.

           Y was flipped when we drew
           the garden:

           displayY = 7000 - gardenY

           Therefore:

           gardenY = 7000 - displayY
        */

        const gardenX =
            mapPoint.x;

        const gardenY =
            7000 - mapPoint.y;


        /*
           Keep full precision internally.

           We only round what the user sees.
        */
/* =========================================
   ROW END CLICK
========================================= */

if (rowEndPlacementMode) {

    pendingRowEndLocation = {
        x: gardenX,
        y: gardenY,
        zone: pendingPlantLocation.zone
    };

    rowEndPlacementMode = false;
    placementMode = false;

    gardenMap.classList.remove(
        "placement-mode"
    );

    placementBanner.classList.add(
        "hidden"
    );

    drawPendingPlantRow();

    showPlantCoordinatePreview();

    return;
}


/* =========================================
   NORMAL / ROW START CLICK
========================================= */

pendingPlantLocation = {

    x: gardenX,

    y: gardenY,

    zone:
        getCurrentPlacementZone(
            event
        )

};


drawPendingPlantMarker(
    mapPoint.x,
    mapPoint.y
);


placementMode = false;

gardenMap.classList.remove(
    "placement-mode"
);

placementBanner.classList.add(
    "hidden"
);


showPlantCoordinatePreview();

    }
);



/* =========================================
   DETERMINE SELECTED ZONE
========================================= */

function getCurrentPlacementZone(event) {

    const clickedPolygon =
        event.target.closest(
            ".map-polygon"
        );


    if (clickedPolygon) {

        return clickedPolygon.getAttribute(
            "data-polygon"
        );

    }


    const displayedZone =
        currentZone.textContent
            .replace(/\s+/g, "");


    if (
        displayedZone &&
        displayedZone !== "WholeGarden"
    ) {

        return displayedZone;

    }


    return "Unassigned";

}

/* =========================================
   TEMPORARY PLANT LOCATION MARKER
========================================= */

function drawPendingPlantMarker(
    displayX,
    displayY
) {

    /*
       Remove any previous temporary marker.
    */

    const oldMarker =
        document.getElementById(
            "pending-plant-marker"
        );

    if (oldMarker) {
        oldMarker.remove();
    }


    /*
       Create marker group.
    */

    const marker =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

    marker.setAttribute(
        "id",
        "pending-plant-marker"
    );

    marker.setAttribute(
        "transform",
        `translate(${displayX} ${displayY})`
    );


    /*
       Outer circle.
    */

    const circle =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

    circle.setAttribute("r", "55");
    circle.setAttribute("fill", "#ffffff");
    circle.setAttribute("stroke", "#173f32");
    circle.setAttribute("stroke-width", "12");
    circle.setAttribute(
        "vector-effect",
        "non-scaling-stroke"
    );


    /*
       Centre dot.
    */

    const dot =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "circle"
        );

    dot.setAttribute("r", "18");
    dot.setAttribute("fill", "#173f32");


    marker.appendChild(circle);
    marker.appendChild(dot);

    gardenMap.appendChild(marker);

}/* =========================================
   TEMPORARY PLANT ROW
========================================= */

function drawPendingPlantRow() {

    if (
        !pendingPlantLocation ||
        !pendingRowEndLocation
    ) {
        return;
    }

    const oldMarker =
        document.getElementById(
            "pending-plant-marker"
        );

    if (oldMarker) {
        oldMarker.remove();
    }

    const oldRow =
        document.getElementById(
            "pending-plant-row"
        );

    if (oldRow) {
        oldRow.remove();
    }

    const quantity =
        Math.max(
            2,
            Number(newQuantity.value) || 2
        );

    const startX =
        pendingPlantLocation.x;

    const startY =
        7000 - pendingPlantLocation.y;

    const endX =
        pendingRowEndLocation.x;

    const endY =
        7000 - pendingRowEndLocation.y;


    const rowGroup =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

    rowGroup.setAttribute(
        "id",
        "pending-plant-row"
    );


    for (let i = 0; i < quantity; i++) {

        const progress =
            i / (quantity - 1);

        const x =
            startX +
            ((endX - startX) * progress);

        const y =
            startY +
            ((endY - startY) * progress);


        const marker =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "g"
            );

        marker.setAttribute(
            "transform",
            `translate(${x} ${y})`
        );


        const circle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

        circle.setAttribute("r", "55");
        circle.setAttribute("fill", "#ffffff");
        circle.setAttribute("stroke", "#173f32");
        circle.setAttribute("stroke-width", "8");

        circle.setAttribute(
            "vector-effect",
            "non-scaling-stroke"
        );


        const icon =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );

        icon.setAttribute(
            "text-anchor",
            "middle"
        );

        icon.setAttribute(
            "dominant-baseline",
            "central"
        );

        icon.setAttribute(
            "font-size",
            "70"
        );

        icon.setAttribute(
            "pointer-events",
            "none"
        );

        icon.textContent =
            getPlantIcon(
                document.getElementById(
                    "new-plant-type"
                ).value
            );


        marker.appendChild(circle);
        marker.appendChild(icon);

        rowGroup.appendChild(marker);
    }


    gardenMap.appendChild(rowGroup);
}
/* =========================================
   SHOW COORDINATE PREVIEW
========================================= */

function showPlantCoordinatePreview() {

    if (!pendingPlantLocation) {
        return;
    }


    newPlantZone.textContent =
        formatZoneName(
            pendingPlantLocation.zone
        );


    newPlantCoordinates.textContent =
        `X: ${Math.round(
            pendingPlantLocation.x
        )} cm · Y: ${Math.round(
            pendingPlantLocation.y
        )} cm`;


    addPlantPanel.classList.remove(
        "hidden"
    );

}


/* =========================================
   BUTTONS
========================================= */

quickAdd.addEventListener(
    "click",
    startPlantPlacement
);


cancelPlacement.addEventListener(
    "click",
    cancelPlantPlacement
);


closeAddPlant.addEventListener(
    "click",
    cancelPlantPlacement
);
function startRowEndPlacement() {

    if (!pendingPlantLocation) {
        return;
    }

    rowEndPlacementMode = true;
    placementMode = true;

    pendingRowEndLocation = null;

    placementBanner.classList.remove(
        "hidden"
    );

    placementBanner
        .querySelector("strong")
        .textContent =
        "🌳 Set Row End";

    placementBanner
        .querySelector("span")
        .textContent =
        "Tap the location of the last plant in the row";

    addPlantPanel.classList.add(
        "hidden"
    );

    gardenMap.classList.add(
        "placement-mode"
    );
}

repositionPlant.addEventListener(
    "click",
    () => {

        const recordType =
            document.getElementById(
                "new-record-type"
            ).value;

        const layoutType =
            document.getElementById(
                "new-layout-type"
            ).value;

        if (
            recordType === "Planting Group" &&
            layoutType === "Row"
        ) {
            startRowEndPlacement();
            return;
        }

        startPlantPlacement();
    }
);


/* =========================================
   SAVE PLANT TO SUPABASE
========================================= */

addPlantForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();

        if (!pendingPlantLocation) {
            alert("Please choose a plant location first.");
            return;
        }

        const saveButton =
            document.getElementById("save-plant");

        const formMessage =
            document.getElementById("plant-form-message");

        const commonName =
            document
                .getElementById("new-common-name")
                .value
                .trim();

        const species =
            document
                .getElementById("new-species")
                .value
                .trim();

        const plantType =
            document
                .getElementById("new-plant-type")
                .value;

        const condition =
            document
                .getElementById("new-condition")
                .value;

        const notes =
            document
                .getElementById("new-notes")
                .value
                .trim();


        if (!commonName) {
            formMessage.textContent =
                "Please enter a common name.";
            return;
        }


        /*
           Get the currently signed-in user.

           created_by is used by our
           Supabase RLS policy.
        */

        const {
            data: { user },
            error: userError
        } =
            await supabaseClient.auth.getUser();


        if (userError || !user) {

            console.error(
                "User error:",
                userError
            );

            formMessage.textContent =
                "Could not identify the signed-in user.";

            return;
        }


        saveButton.disabled = true;

        saveButton.textContent =
            "Saving...";

        formMessage.textContent =
            "";


        /*
           IMPORTANT:

           x_cm and y_cm are the ORIGINAL
           garden coordinate system.

           We do not save SVG/display Y.
        */

        const plantRecord = {

            common_name:
                commonName,

            species:
                species || null,

            plant_type:
                plantType,

            x_cm:
                pendingPlantLocation.x,

            y_cm:
                pendingPlantLocation.y,

            zone:
                pendingPlantLocation.zone,

            condition:
                condition,

            notes:
                notes || null,

            created_by:
                user.id

        };


        const {
            data,
            error
        } =
            await supabaseClient

                .from("plants")

                .insert(
                    plantRecord
                )

                .select()

                .single();


        if (error) {

            console.error(
                "Plant save error:",
                error
            );

            formMessage.textContent =
                "Plant could not be saved.";

            saveButton.disabled = false;

            saveButton.textContent =
                "Save Plant";

            return;
        }


        console.log(
            "Plant saved:",
            data
        );


        formMessage.textContent =
            "Plant saved ✓";


        /*
           Remove temporary marker.
        */

        const pendingMarker =
            document.getElementById(
                "pending-plant-marker"
            );

        if (pendingMarker) {
            pendingMarker.remove();
        }


        /*
           Reset form.
        */

        addPlantForm.reset();

        pendingPlantLocation = null;


        /*
           Close Add Plant panel.
        */

        setTimeout(
            () => {

                addPlantPanel.classList.add(
                    "hidden"
                );

                formMessage.textContent = "";

                saveButton.disabled = false;

                saveButton.textContent =
                    "Save Plant";

            },
            500
        );

    }
);
/* =========================================
   9. LOAD SAVED PLANTS
========================================= */

async function loadPlants() {

    const { data, error } =
        await supabaseClient
            .from("plants")
            .select("*")
            .order("id", { ascending: true });

    if (error) {

        console.error(
            "Plant load error:",
            error
        );

        return;
    }

    /*
       Remove old markers before redrawing.
       Prevents duplicates if loadPlants()
       runs more than once.
    */

    document
        .querySelectorAll(".saved-plant-marker")
        .forEach(marker => marker.remove());


    data.forEach(plant => {

    const status =
        (plant.status || "Existing")
            .toLowerCase();

    const shouldShow =
        plantViewFilter === "all" ||
        (
            plantViewFilter === "current" &&
            status === "existing"
        ) ||
        (
            plantViewFilter === "future" &&
            status === "planned"
        );

    if (shouldShow && status !== "removed") {
        drawPlantMarker(plant);
    }

});

}
/* =========================================
   GARDENDEX PLANT ARTWORK LIBRARY
========================================= */

function getPlantArtwork(plant) {
    const botanicalArtwork = getBotanicalPlantArtwork(plant);
    if (botanicalArtwork) return botanicalArtwork;

    const commonName =
        (plant.common_name || "")
            .trim()
            .toLowerCase();

    const species =
        (plant.species || "")
            .trim()
            .toLowerCase();

    /*
       NORWAY MAPLE
       Reusable artwork for every
       Norway Maple in GardenDex.
    */

    if (
        commonName === "norway maple" ||
        species === "acer platanoides"
    ) {
        return {
            image:
                "assets/plants/Norwaymaple.png",

            size:
                420
        };
    }

    /*
       No species artwork yet.
       Fall back to normal marker.
    */

    return null;
}/* =========================================
   DRAW SAVED PLANT MARKER
========================================= */

/* =========================================
   DRAW SAVED PLANT MARKER
========================================= */

function drawPlantMarker(plant) {

    /*
       Supabase stores ORIGINAL garden
       coordinates.

       Convert Y into SVG display coordinates
       using the exact same transformation
       as the garden polygons.
    */

    const displayX =
        Number(plant.x_cm);

    const displayY =
        7000 - Number(plant.y_cm);


    const marker =
        document.createElementNS(
            "http://www.w3.org/2000/svg",
            "g"
        );

    marker.setAttribute(
        "class",
        "plant-marker saved-plant-marker"
    );

    marker.setAttribute(
        "transform",
        `translate(${displayX} ${displayY})`
    );

    marker.setAttribute(
        "data-plant-id",
        plant.id
    );


    /*
       Check whether this species has
       custom GardenDex artwork.
    */

    const artwork =
        getPlantArtwork(plant);


    if (artwork) {

        /*
           CUSTOM PLANT ARTWORK

           The image is centred exactly on
           the saved Supabase coordinate.
        */

        const plantImage =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "image"
            );

        plantImage.setAttribute(
            "href",
            artwork.image
        );

        plantImage.setAttribute(
            "x",
            -artwork.size / 2
        );

        plantImage.setAttribute(
            "y",
            -artwork.size / 2
        );

        plantImage.setAttribute(
            "width",
            artwork.size
        );

        plantImage.setAttribute(
            "height",
            artwork.size
        );

        plantImage.setAttribute(
            "preserveAspectRatio",
            "xMidYMid meet"
        );

       plantImage.setAttribute(
    "pointer-events",
    "visiblePainted"
);

        marker.appendChild(
            plantImage
        );

    } else {

        /*
           FALLBACK MARKER

           Used for species that do not yet
           have custom GardenDex artwork.
        */

        const circle =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "circle"
            );

        circle.setAttribute(
            "r",
            "72"
        );

        circle.setAttribute(
            "fill",
            getConditionColour(
                plant.condition
            )
        );

        circle.setAttribute(
            "stroke",
            "#ffffff"
        );

        circle.setAttribute(
            "stroke-width",
            "5"
        );

        circle.setAttribute(
            "vector-effect",
            "non-scaling-stroke"
        );


        const icon =
            document.createElementNS(
                "http://www.w3.org/2000/svg",
                "text"
            );

        icon.setAttribute(
            "text-anchor",
            "middle"
        );

        icon.setAttribute(
            "dominant-baseline",
            "central"
        );

        icon.setAttribute(
            "font-size",
            "92"
        );

        icon.setAttribute(
            "pointer-events",
            "none"
        );

        icon.textContent =
            getPlantIcon(
                plant.plant_type
            );


        marker.appendChild(
            circle
        );

        marker.appendChild(
            icon
        );
    }


    /*
       Clicking the artwork/marker opens
       the existing GardenDex plant profile.
    */

    marker.addEventListener(
        "click",
        (event) => {

            event.preventDefault();
            event.stopPropagation();

            openPlantProfile(
                plant
            );

        }
    );


    gardenMap.appendChild(
        marker
    );

}

/* =========================================
   PLANT TYPE ICON
========================================= */

function getPlantIcon(type) {

    const icons = {

        "Tree":
            "🌳",

        "Shrub":
            "🌿",

        "Conifer":
            "🌲",

        "Flower":
            "🌸",

        "Hedge":
            "🌿",

        "Fruit Tree":
            "🍎",

        "Climber":
            "🌱",

        "Grass":
            "🌾",

        "Crop":
            "🥬"

    };


    return (
        icons[type] ||
        "🌱"
    );

}


/* =========================================
   CONDITION COLOUR
========================================= */

function getConditionColour(condition) {

    const colours = {

        "Healthy":
            "#4f8f45",

        "Good":
            "#82b95b",

        "Monitor":
            "#e5bd3d",

        "Poor":
            "#df7c32",

        "Serious":
            "#c94a3f",

        "Unknown":
            "#8b918d"

    };


    return (
        colours[condition] ||
        colours.Unknown
    );

}


/* =========================================
   OPEN GARDENDEX PLANT PROFILE
========================================= */

function openPlantProfile(plant) {
    renderPlantRemoval(plant);
    let dexButton=document.getElementById('profile-dex-card');
    if(!dexButton){dexButton=document.createElement('button');dexButton.id='profile-dex-card';plantPanel.append(dexButton);}
    dexButton.textContent='Open GardenDex card';
    dexButton.hidden=!/beech|fagus sylvatica|bluebell|hyacinthoides/i.test((plant.common_name||'')+' '+(plant.species||''));
    dexButton.onclick=()=>window.openGardenDexCard?.(plant);

    document
        .getElementById("plant-name")
        .textContent =
        plant.common_name ||
        "Unnamed Plant";


    document
        .getElementById("plant-species")
        .textContent =
        plant.species ||
        "Species not recorded";


    document
        .getElementById("plant-health")
        .textContent =
        plant.condition ||
        "Unknown";


    document
        .getElementById("plant-zone")
        .textContent =
        formatZoneName(
            plant.zone ||
            "Unassigned"
        );


    plantPanel.classList.remove(
        "hidden"
    );

}
/* =========================================
   9. START GARDENDEX
========================================= */
/* =========================================
   GARDENDEX AUTHENTICATION
========================================= */

const loginScreen =
    document.getElementById("login-screen");

const loginForm =
    document.getElementById("login-form");

const loginMessage =
    document.getElementById("login-message");


async function checkLogin() {

    const {
        data: { session }
    } =
        await supabaseClient.auth.getSession();


    if (session) {

        loginScreen.classList.add("hidden");

        await loadGarden();

    } else {

        loginScreen.classList.remove("hidden");

        connectionStatus.textContent =
            "Sign in required";

    }

}


loginForm.addEventListener(
    "submit",
    async (event) => {

        event.preventDefault();


        loginMessage.textContent =
            "Signing in...";


        const email =
            document
                .getElementById("login-email")
                .value;


        const password =
            document
                .getElementById("login-password")
                .value;


        const { error } =
            await supabaseClient
                .auth
                .signInWithPassword({
                    email,
                    password
                });


        if (error) {

            console.error(error);

            loginMessage.textContent =
                "Email or password is incorrect.";

            return;
        }


        loginMessage.textContent = "";

        loginScreen.classList.add(
            "hidden"
        );


        await loadGarden();

    }
);
/* =========================================
   PLANTING GROUP CONTROL
========================================= */

const newRecordType =
    document.getElementById("new-record-type");

const quantityField =
    document.getElementById("quantity-field");

const newQuantity =
    document.getElementById("new-quantity");

const layoutField =
    document.getElementById("layout-field");

const newLayoutType =
    document.getElementById("new-layout-type");


function updatePlantingGroupFields() {

    const isGroup =
        newRecordType.value === "Planting Group";

    if (isGroup) {

        quantityField.classList.remove("hidden");
        layoutField.classList.remove("hidden");

        newQuantity.disabled = false;
        newQuantity.required = true;

        newLayoutType.disabled = false;

        if (Number(newQuantity.value) < 2) {
            newQuantity.value = 2;
        }

    } else {

        quantityField.classList.add("hidden");
        layoutField.classList.add("hidden");

        newQuantity.disabled = true;
        newQuantity.required = false;

        newLayoutType.disabled = true;

        newQuantity.value = 1;
        newLayoutType.value = "Point";
    }
}


newRecordType.addEventListener(
    "change",
    updatePlantingGroupFields
);


/* Set correct state when GardenDex loads */
updatePlantingGroupFields();
/* =========================================
   PLANT VIEW FILTER
========================================= */

document
    .querySelectorAll(".plant-filter-button")
    .forEach(button => {

        button.addEventListener(
            "click",
            async () => {

                plantViewFilter =
                    button.dataset.filter;

                document
                    .querySelectorAll(
                        ".plant-filter-button"
                    )
                    .forEach(btn => {
                        btn.classList.remove(
                            "active"
                        );
                    });

                button.classList.add(
                    "active"
                );

                await loadPlants();

                plantPanel.classList.add(
                    "hidden"
                );

            }
        );

    });
checkLogin();
/* =========================
   HOUSE INTERIOR
========================= */

const houseInterior = document.getElementById("house-interior");
const exitHouseBtn = document.getElementById("exit-house-btn");

function enterHouse() {
    houseInterior.classList.add("active");
}

function exitHouse() {
    houseInterior.classList.remove("active");
}

exitHouseBtn?.addEventListener("click", exitHouse);
/* Physical features aligned to survey coordinates (centimetres).
   Arch location is approximate, based on the owner's annotated plan. */
function drawGardenStructures(polygons) {
 const ns='http://www.w3.org/2000/svg';
 const terrain=gardenMap.querySelector('#terrain-layer');
 const boundary=gardenMap.querySelector('#boundary-layer');
 const structures=gardenMap.querySelector('#structure-layer');
 const make=(tag,attrs,parent)=>{const e=document.createElementNS(ns,tag);Object.entries(attrs).forEach(([k,v])=>e.setAttribute(k,v));parent.appendChild(e);return e;};
 const label=(e,text)=>{const t=make('title',{},e);t.textContent=text;};
 const xy=p=>`${p.x},${7000-p.y}`;
 // Fill the surveyed splayed entrance between the road and recessed gate.
 const entrance=make('g',{'id':'driveway-entrance','pointer-events':'none'},terrain);
 label(entrance,'Tarmac entrance connecting the road to the garden driveway');
 make('polygon',{points:'410,7000 550,6600 920,6600 1060,7000',fill:'#53534b',stroke:'#8b897d','stroke-width':8},entrance);
 const defs=gardenMap.querySelector('defs')||make('defs',{},gardenMap);
 const pattern=make('pattern',{id:'entrance-tarmac',width:300,height:300,patternUnits:'userSpaceOnUse'},defs);
 make('image',{href:'assets/terrain/drivewaymoss.png',width:300,height:300},pattern);
 make('polygon',{points:'410,7000 550,6600 920,6600 1060,7000',fill:'url(#entrance-tarmac)'},entrance);
 // Ancient dry-stone wall: irregular, staggered stones along the west boundary.
 const wall=make('g',{id:'west-dry-stone-wall','pointer-events':'none'},boundary);
 label(wall,'Ancient loose dry-stone wall along the left boundary');
 make('path',{d:'M 0 7000 L 0 0',stroke:'#343c30','stroke-width':105,fill:'none','stroke-linecap':'round',opacity:.28,transform:'translate(12 10)'},wall);
 make('path',{d:'M 0 7000 L 0 0',stroke:'#686b58','stroke-width':82,fill:'none'},wall);
 const colours=['#8c8b75','#a5a18a','#777e68','#b2ad96','#91967b'];
 for(let i=0;i<110;i++) {
  const y=i*65, shift=i%2?13:-16;
  make('path',{d:`M ${shift-29} ${y+5} l 44 -4 15 19 -7 36 -44 4 -13 -23 Z`,fill:colours[i%5],stroke:'#525b49','stroke-width':5},wall);
  if(i%3===0)make('path',{d:`M ${shift-20} ${y+45} l 28 -5`,stroke:'#5c7547','stroke-width':9,'stroke-linecap':'round',opacity:.8},wall);
 }
 // White timber fence follows only the children's garden's south and east edges.
 const points=[...(polygons.ChildrenGarden||[])].sort((a,b)=>a.order-b.order);
 const fence=make('g',{id:'children-garden-fence','pointer-events':'none'},structures);
 label(fence,'Weathered concrete post-and-rail fence around the children’s garden, with a masonry archway opening');
 const fenceSegment=(a,b)=>{
  const dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy);if(!len)return;
  const offset=12;
  const rail=make('path',{d:`M ${xy(a)} L ${xy(b)}`,fill:'none',stroke:'#60664d','stroke-width':32,opacity:.35,transform:'translate(8 12)'},fence);
  make('path',{d:rail.getAttribute('d'),fill:'none',stroke:'#b9b9a6','stroke-width':22,'stroke-linecap':'round'},fence);
  make('path',{d:rail.getAttribute('d'),fill:'none',stroke:'#d3d0bc','stroke-width':7,transform:`translate(0 ${-offset})`},fence);
  const n=Math.ceil(len/95);
  for(let i=0;i<=n;i++){const x=a.x+dx*i/n,y=7000-(a.y+dy*i/n);make('rect',{x:x-12,y:y-29,width:24,height:48,rx:4,fill:'#bcbca9',stroke:'#7e8774','stroke-width':4},fence);}
 };
 // Traverse the recorded chain from the west edge to the eastern boundary.
 if(points.length>=7){
  const chain=[points[5],points[4],points[3],points[2],points[1],points[0]];
  chain.slice(0,-1).forEach((a,i)=>{const b=chain[i+1];
   if(a.x<2650&&b.x>2650){const at=x=>({x,y:a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x)});fenceSegment(a,at(2500));fenceSegment(at(2800),b);}else fenceSegment(a,b);
  });
  const a=points[3],b=points[2],cx=2650,cy=a.y+(b.y-a.y)*(cx-a.x)/(b.x-a.x),sy=7000-cy;
  // Tarmac spur crosses the full bark strip, joining the driveway to the arch.
  // Derived from existing boundary segments; width follows the arch opening.
  const borderY=x=>a.y+(b.y-a.y)*(x-a.x)/(b.x-a.x);
  const driveA={x:2453.35638574316,y:4817.98704243306};
  const driveB={x:3464.10161513775,y:5000};
  const driveY=x=>driveA.y+(driveB.y-driveA.y)*(x-driveA.x)/(driveB.x-driveA.x);
  const spur=make('g',{id:'archway-tarmac-path'},structures);
  label(spur,'Tarmac path from the driveway to the children’s garden archway, dividing the bark into two sections');
  const spurPoints=[{x:2500,y:borderY(2500)+5},{x:2800,y:borderY(2800)+5},{x:2850,y:driveY(2850)-45},{x:2450,y:driveY(2450)-45}];
  make('polygon',{points:spurPoints.map(xy).join(' '),fill:'#53534b'},spur);
  const path=make('polygon',{points:spurPoints.map(xy).join(' '),fill:'#53534b',stroke:'#8b897d','stroke-width':7,'stroke-linejoin':'round'},spur);
  path.addEventListener('click',event=>{if(placementMode)return;event.stopPropagation();zoomToZone(path,'ArchwayPath');});
  const arch=make('g',{id:'children-garden-archway',transform:`translate(${cx} ${sy})`,'pointer-events':'none'},structures);
  label(arch,'Rendered masonry archway at the children’s garden border; position approximate');
  make('ellipse',{cx:0,cy:35,rx:205,ry:48,fill:'#263b29',opacity:.2},arch);
  make('path',{d:'M -150 35 L -150 -200 Q 0 -440 150 -200 L 150 35',fill:'none',stroke:'#69745c','stroke-width':37,transform:'translate(8 10)'},arch);
  make('path',{d:'M -150 35 L -150 -200 Q 0 -440 150 -200 L 150 35',fill:'none',stroke:'#c6c6b8','stroke-width':55,'stroke-linejoin':'round'},arch);
  make('path',{d:'M -192 -276 L -192 -355 L 192 -355 L 192 -276',fill:'#c6c6b8',stroke:'#929b8b','stroke-width':8},arch);
 }
 // Recessed entrance gate between the two existing surveyed wall ends.
 const gate=make('g',{id:'entrance-gate','pointer-events':'none'},structures);
 label(gate,'Double timber entrance gate, spanning the surveyed 3.7 metre opening');
 for(const x of [550,920])make('rect',{x:x-23,y:6570,width:46,height:65,rx:5,fill:'#b0ac96',stroke:'#666954','stroke-width':7},gate);
 const leaf=(x,w)=>{make('rect',{x,y:6582,width:w,height:37,rx:3,fill:'#716247',stroke:'#3d4335','stroke-width':7},gate);for(let t=x+12;t<x+w;t+=25)make('path',{d:`M ${t} 6583 V 6617`,stroke:'#bcab7f','stroke-width':9},gate);make('path',{d:`M ${x+5} 6615 L ${x+w-5} 6587`,stroke:'#4b503c','stroke-width':8},gate);};
 leaf(565,165);leaf(740,165);
}

/* Botanical atlas presentation. Survey polygons and house artwork are unchanged. */
function refreshGardenAtlas() {
 const ns='http://www.w3.org/2000/svg';
 const el=(tag,attrs,parent)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);parent.append(e);return e;};
 const defs=gardenMap.querySelector('#gardendex-materials');
 const pattern=(id,colour)=>{const p=el('pattern',{id,width:240,height:240,patternUnits:'userSpaceOnUse'},defs);el('rect',{width:240,height:240,fill:colour},p);return p;};
 const grass=pattern('atlas-lawn','#a8bc81');
 el('rect',{width:120,height:240,fill:'#b4c68d',opacity:.45},grass);
 for(let i=0;i<20;i++)el('path',{d:`M ${(i*67)%240} ${(i*37)%240} l 3 -9 3 9`,fill:'none',stroke:'#768c58','stroke-width':1.5,opacity:.35},grass);
 const pine=pattern('atlas-pine','#647b53');
 for(let i=0;i<24;i++)el('circle',{cx:(i*71)%240,cy:(i*43)%240,r:4+(i%4),fill:i%2?'#a3ae7a':'#344f40',opacity:.4},pine);
 const bark=pattern('atlas-bark','#a18463');
 for(let i=0;i<24;i++)el('path',{d:`M ${(i*73)%240} ${(i*41)%240} l ${10+i%9} ${i%2?7:-8}`,stroke:i%2?'#795f46':'#c3ab87','stroke-width':4,'stroke-linecap':'round',opacity:.6},bark);
 const tarmac=pattern('atlas-tarmac','#60675f');
 for(let i=0;i<50;i++)el('circle',{cx:(i*67)%240,cy:(i*43)%240,r:1.6,fill:i%2?'#d8dbbf':'#303e35',opacity:.35},tarmac);
 for(const [id,replacement] of [['big-garden-artwork-pattern','atlas-lawn'],['children-garden-artwork-pattern','atlas-lawn'],['pine-trees-artwork-pattern','atlas-pine'],['driveway-artwork-pattern','atlas-tarmac']]) {
  gardenMap.querySelectorAll(`[fill="url(#${id})"]`).forEach(e=>e.setAttribute('fill',`url(#${replacement})`));
 }
 gardenMap.querySelectorAll('.bark-artwork').forEach(e=>e.setAttribute('fill','url(#atlas-bark)'));
 gardenMap.querySelectorAll('#archway-tarmac-path polygon,#driveway-entrance polygon').forEach(e=>{e.setAttribute('fill','url(#atlas-tarmac)');e.setAttribute('stroke','none');});
 // Label existing zones, with no invented planting or changes to measured boundaries.
 const layer=el('g',{id:'atlas-labels','pointer-events':'none'},gardenMap.querySelector('#overlay-layer'));
 const text=(x,y,name)=>{const t=el('text',{x,y,'text-anchor':'middle','font-family':'Georgia,serif','font-size':92,fill:'#304e3d','paint-order':'stroke',stroke:'#e7edd6','stroke-width':9,'stroke-linejoin':'round'},layer);t.textContent=name;};
 text(1700,850,'Children’s garden');text(3500,4200,'Main garden');

}

(() => {
 const css=document.createElement('style');css.textContent=`
 :root{--forest:#244c3b;--cream:#f4f1e8;--text:#294b3c}
 .top-bar{background:#faf8f0;color:#234734;border-bottom:1px solid #d4dacb;height:86px;padding:0 26px;box-shadow:0 3px 16px #304f3710}
 .brand h1{font-family:Georgia,serif;font-weight:400;font-size:29px;letter-spacing:-.04em}.brand p{opacity:1;color:#73816b;font-size:11px;letter-spacing:.1em}
 .location-label{color:#7b8773}.connection-status{background:#e6ecdf;color:#446347;border:1px solid #d5deca;font-size:11px}
 main{height:calc(100dvh - 86px)}#map-container{background-color:#b4c39a;background-image:radial-gradient(ellipse at 12% 20%,#dce3c788,transparent 45%),radial-gradient(ellipse at 87% 72%,#7e9e6e55,transparent 50%),radial-gradient(#6f8c5640 .8px,transparent 1.2px),radial-gradient(#e5e9cd55 1px,transparent 1.7px);background-size:100% 100%,100% 100%,13px 17px,23px 29px;background-position:0 0,0 0,0 0,6px 9px}
 #garden-map{filter:drop-shadow(0 12px 18px #334f3020)}.map-polygon{stroke:#6e805d;stroke-width:5;filter:none}
 .plant-view-filter{top:103px;left:20px;padding:5px 7px;background:#fffdf5ee;box-shadow:0 3px 12px #263e3010;border-radius:30px}.filter-buttons{border-radius:24px;background:#eef0e7}.plant-filter-button{border-radius:22px;min-height:38px}.filter-label{padding-left:9px}
 #atlas-controls{position:absolute;top:106px;right:20px;z-index:21;display:flex;gap:8px;align-items:center;background:#fffdf5ee;border:1px solid #d4ddc9;border-radius:24px;padding:5px 12px;box-shadow:0 3px 12px #263e3010;font-size:12px;color:#3d5b43}
 #atlas-controls label{display:flex;align-items:center;gap:7px;cursor:pointer;min-height:35px}#atlas-controls input{accent-color:#365d40;width:17px;height:17px;min-height:17px;margin:0}#atlas-fit{border:0;background:none;color:#355a40;padding:6px 2px;cursor:pointer;min-height:35px}
 #landscape-launch{background:#244c3b!important;font-weight:500!important;box-shadow:0 8px 24px #23453025!important;border-color:#fff9!important}#quick-add{background:#244c3b;box-shadow:0 8px 24px #23453025}
 #plant-panel,#add-plant-panel{background:#fcfaf2;border:1px solid #d8dfcf;border-radius:20px;box-shadow:0 16px 50px #233f3025}.dex-number{color:#89936f;letter-spacing:.15em}#plant-panel h2,#add-plant-panel h2{font-family:Georgia,serif;font-weight:400}
 .login-card{background:#fcfaf4;border:1px solid #d8dfcf;box-shadow:0 20px 70px #173f3220}.login-card h1{font-family:Georgia,serif;font-weight:400}
 @media(max-width:700px){.top-bar{height:78px;padding:0 17px}.brand h1{font-size:25px}.brand p{font-size:8px;letter-spacing:.05em}.connection-status{display:none}main{height:calc(100dvh - 78px)}.plant-view-filter{top:91px;left:12px}.plant-filter-button{font-size:12px;min-height:36px;padding:5px 10px}#atlas-controls{top:148px;left:12px;right:auto;font-size:11px;padding:2px 11px}#atlas-controls label{min-height:33px}#atlas-fit{min-height:33px}#landscape-launch{font-size:13px!important;padding:13px 15px!important;bottom:20px!important}#quick-add{width:52px;height:52px;right:15px;bottom:20px}}
 `;document.head.append(css);
 document.querySelector('.brand p').textContent='HOGAN GARDEN · LIVING ATLAS';
 const controls=document.createElement('div');controls.id='atlas-controls';controls.innerHTML='<button id="atlas-fit" type="button" title="Fit the whole garden">Fit garden</button>';document.body.append(controls);
 document.getElementById('atlas-fit').onclick=()=>showWholeGarden();
 gardenMap.setAttribute('viewBox',WHOLE_GARDEN_VIEW);
})();

/* Photo survey: observations are drafts until positioned and saved by the owner.
   Source photographs are not published to the public source repository. */
const gardenPhotoObservations = [
 {id:'red-rose',name:'Red rose by archway',species:'Rosa (cultivar unconfirmed)',type:'Climber',confidence:'Rose confirmed; climbing habit/cultivar to verify',location:'Left side of masonry arch in the supplied photo',notes:'Photo observation: red rose beside archway. Cultivar not legible enough to confirm. Leaf spotting and yellowing visible; diagnosis not confirmed from photo. Position must be selected on map.'},
 {id:'pink-rose',name:'Pale-pink rose by archway',species:'Rosa (cultivar unconfirmed)',type:'Climber',confidence:'Rose confirmed; cultivar to verify',location:'Right side of masonry arch in the supplied photo',notes:'Photo observation: pale-pink rose beside archway. Pot visible in one photograph; confirm current planting status. Cultivar unconfirmed. Position must be selected on map.'},
 {id:'azalea-geisha',name:'Azalea — Geisha Purple',species:"Rhododendron 'Geisha Purple'",type:'Shrub',confidence:'Confirmed by readable plant label',location:'Existing azalea record: inspect before adding another',existing:true,notes:"Photo label reads Azalea Geisha Purple. RHS lists Rhododendron 'Geisha Purple' (also 'Fumiko'). Existing azalea entries found; do not add a duplicate."},
 {id:'glossy-shrub',name:'Glossy evergreen shrub — identification pending',species:'',type:'Shrub',confidence:'Possible Aucuba japonica; needs closer identification',location:'Near azalea, under trees by concrete fence',notes:'Photo observation: broad glossy evergreen leaves. Possible Aucuba japonica, not confirmed. Need clear close-up of a complete leaf, its edges, leaf arrangement and any flowers or berries. Do not apply species-specific pruning advice until identified.'},
 {id:'ivy',name:'Ivy patch',species:'Hedera sp.',type:'Climber',confidence:'Ivy visible; species not confirmed',location:'Ground and woody stems in shaded border',notes:'Photo observation: ivy in shaded border. Record as a patch rather than an individual plant. Location and extent not surveyed.'},
 {id:'bramble',name:'Bramble patch',species:'Rubus fruticosus aggregate (provisional)',type:'Shrub',confidence:'Probable bramble from leaves; confirmation needed',location:'Shaded border photographs',notes:'Photo observation: probable bramble. Identification and patch extent need confirmation before maintenance work.'},
 {id:'dock',name:'Dock-like plants',species:'Rumex sp. (provisional)',type:'Flower',confidence:'Probable dock; species not confirmed',location:'Grass beside newly cleared border',notes:'Photo observation: broad-leaved dock-like plants along cleared bed. Need close-ups of leaf base, stem and seedhead for species confirmation.'},
 {id:'purple-trees',name:'Purple-leaved boundary trees',species:'',type:'Tree',confidence:'Unconfirmed: copper beech or purple-leaved maple among possibilities',location:'Boundary and wide garden photographs',notes:'Distant purple-leaved trees cannot be confidently matched to existing maple or beech records. Need leaf and bark close-ups plus trunk locations. Do not add duplicates or assume species from foliage colour.'}
];
function drawObservedGardenLamps() {
 const ns='http://www.w3.org/2000/svg',layer=gardenMap.querySelector('#structure-layer');
 const group=document.createElementNS(ns,'g');group.id='photo-survey-lamps';group.setAttribute('pointer-events','none');layer.append(group);
 const title=document.createElementNS(ns,'title');title.textContent='Two cream garden lamps observed in photographs; map positions approximate and require confirmation';group.append(title);
 for(const [x,y] of [[3330,5180],[1520,4200]]) {
  const g=document.createElementNS(ns,'g');g.setAttribute('transform',`translate(${x} ${7000-y})`);group.append(g);
  const shape=(tag,attrs)=>{const e=document.createElementNS(ns,tag);for(const [k,v] of Object.entries(attrs))e.setAttribute(k,v);g.append(e);};
  shape('ellipse',{cx:18,cy:16,rx:36,ry:14,fill:'#263a30',opacity:.2});
  shape('path',{d:'M 0 0 L 0 -160',stroke:'#e7e3c8','stroke-width':14});
  shape('path',{d:'M -38 -170 Q 0 -191 38 -170 L 24 -140 Q 0 -127 -24 -140 Z',fill:'#f3edcf',stroke:'#8c9d79','stroke-width':6});
  shape('ellipse',{cx:0,cy:-172,rx:39,ry:10,fill:'#667f5e'});
  shape('circle',{cx:0,cy:8,r:38,fill:'none',stroke:'#be8c43','stroke-width':5,'stroke-dasharray':'9 8'});
 }
}
(() => {
 const css=document.createElement('style');css.textContent=`#photo-survey-open{position:fixed;bottom:82px;left:20px;z-index:61;background:#faf8ef;color:#315440;border:1px solid #cdd7bf;border-radius:24px;padding:11px 16px;min-height:44px;cursor:pointer;box-shadow:0 4px 16px #23453015}#photo-survey-panel{position:fixed;inset:0;z-index:1400;background:#f5f2e8;overflow:auto;color:#2b4c3a;padding:24px max(20px,calc((100% - 900px)/2));font:15px/1.5 Arial}#photo-survey-panel[hidden]{display:none}#photo-survey-panel h2{font:30px Georgia,serif}#photo-survey-panel article{padding:20px;background:#fffdf6;border:1px solid #d7dfce;border-radius:14px;margin:14px 0}#photo-survey-panel h3{margin:0 0 6px}#photo-survey-panel small{color:#6c755e}#photo-survey-panel button{padding:10px 15px;min-height:44px;background:#2b533d;color:white;border:0;border-radius:9px;cursor:pointer}#photo-survey-panel a{color:#36583d}#photo-survey-panel p{margin:8px 0}#photo-survey-panel .survey-warning{padding:14px;background:#eae5d2;border-radius:10px}@media(max-width:700px){#photo-survey-open{left:12px;bottom:80px;font-size:12px}}`;
 document.head.append(css);
 const button=document.createElement('button');button.id='photo-survey-open';button.textContent='Photo survey · 8 observations';document.body.append(button);
 const panel=document.createElement('section');panel.id='photo-survey-panel';panel.hidden=true;panel.setAttribute('aria-label','Garden photo survey');document.body.append(panel);
 const escape=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const close=()=>{panel.hidden=true;button.focus();};
 button.onclick=()=>{
 panel.innerHTML='<button id="photo-survey-close">Back to garden</button><h2>Your garden, observed</h2><p>Plant observations from your photographs. These are identification drafts, not saved plant records. Match existing plants first; select the real location before saving a new one.</p><p class="survey-warning">The two cream lamps are shown with amber dashed position markers: their locations are approximate. The archway and fence now reflect masonry and concrete seen in your photographs. No source photos have been published.</p>'+gardenPhotoObservations.map(o=>`<article><h3>${escape(o.name)}</h3><small>${escape(o.confidence)}</small><p>${escape(o.location)}</p><p>${escape(o.notes)}</p>${o.existing?'<button data-existing="azalea">View existing azalea</button>':`<button data-observation="${o.id}">Choose location & review plant</button>`}</article>`).join('')+'<p>Identification references: <a href="https://www.rhs.org.uk/plants/51322/rhododendron-geisha-purple/details" target="_blank" rel="noopener">Azalea Geisha Purple</a> · <a href="https://www.rhs.org.uk/plants/148757/aucuba-japonica/details" target="_blank" rel="noopener">Aucuba comparison</a></p>';
 panel.hidden=false;document.getElementById('photo-survey-close').onclick=close;
 panel.querySelectorAll('[data-observation]').forEach(b=>b.onclick=async()=>{
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){alert('Sign in to GardenDex first, then choose a location and save the plant using your existing plant form.');return;}
  const o=gardenPhotoObservations.find(o=>o.id===b.dataset.observation);panel.hidden=true;
  addPlantForm.reset();document.getElementById('new-common-name').value=o.name;document.getElementById('new-species').value=o.species;document.getElementById('new-plant-type').value=o.type;document.getElementById('new-condition').value='Unknown';document.getElementById('new-notes').value=o.notes+' Identification confidence: '+o.confidence;
  updatePlantingGroupFields();startPlantPlacement();
 });
 panel.querySelector('[data-existing]').onclick=async()=>{
  const {data,error}=await supabaseClient.from('plants').select('*').ilike('common_name','%azalea%').order('id').limit(1);
  if(error||!data?.length){alert('Could not load an existing azalea record. Please check your connection.');return;}
  panel.hidden=true;openPlantProfile(data[0]);
 };
 };
 panel.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
})();

/* Illustrated map symbols: representative artwork, not mature-size measurements. */
function getBotanicalPlantArtwork(plant) {
 const name=((plant.common_name||'')+' '+(plant.species||'')).toLowerCase();
 let body='';
 const leaves='<ellipse cx="63" cy="146" rx="32" ry="15" transform="rotate(35 63 146)" fill="#426e43"/><ellipse cx="131" cy="132" rx="31" ry="14" transform="rotate(-35 131 132)" fill="#688d4a"/><ellipse cx="76" cy="176" rx="28" ry="13" transform="rotate(30 76 176)" fill="#5d8447"/>';
 if(/rose|rosa\b/.test(name)) {
  const pink=/pink|pale|blush/.test(name), base=pink?'#d87894':'#a32849',light=pink?'#f6c4cf':'#e76b83';
  body='<path d="M 100 195 Q 84 133 105 82" fill="none" stroke="#41633e" stroke-width="9" stroke-linecap="round"/>'+leaves;
  for(let i=0;i<9;i++){const a=i*Math.PI*2/9;body+=`<ellipse cx="${100+Math.cos(a)*27}" cy="${73+Math.sin(a)*25}" rx="25" ry="20" transform="rotate(${i*40} ${100+Math.cos(a)*27} ${73+Math.sin(a)*25})" fill="${i%2?base:light}" stroke="${base}" stroke-width="2"/>`;}
  body+=`<circle cx="100" cy="73" r="25" fill="${base}"/><path d="M 85 75 Q 86 48 111 58 Q 133 76 104 87 Q 87 90 94 68 Q 107 59 113 73" fill="none" stroke="${light}" stroke-width="5" stroke-linecap="round"/>`;
 } else if(/azalea|rhododendron/.test(name)) {
  for(let i=0;i<17;i++){const a=i*2.4,r=15+(i%4)*13;body+=`<ellipse cx="${100+Math.cos(a)*r}" cy="${111+Math.sin(a)*r}" rx="25" ry="17" fill="${i%2?'#416c48':'#729356'}"/>`;}
  for(const [x,y] of [[70,90],[123,99],[95,130],[132,143],[64,136]]){for(let i=0;i<5;i++){const a=i*Math.PI*2/5;body+=`<circle cx="${x+Math.cos(a)*10}" cy="${y+Math.sin(a)*10}" r="10" fill="${i%2?'#ad5e9f':'#d993c8'}"/>`;}body+=`<circle cx="${x}" cy="${y}" r="4" fill="#f4d0a7"/>`;}
 } else if(/bluebell|hyacinthoides/.test(name)) {
  for(const x of [67,100,133]){body+=`<path d="M ${x} 194 Q ${x-15} 99 ${x+9} 48" fill="none" stroke="#527449" stroke-width="5"/>`;for(let i=0;i<4;i++)body+=`<path d="M ${x+5} ${62+i*24} q 23 -8 22 15 l -22 4 q -7 -11 0 -19 Z" fill="${i%2?'#8274b8':'#5c5fa1'}" stroke="#494f86" stroke-width="2"/>`;}
  body+='<path d="M 100 200 Q 30 150 47 97 Q 69 143 100 200 M 100 200 Q 157 150 160 108 Q 175 169 100 200" fill="#698c4c"/>';
 } else return null;
 const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220"><ellipse cx="100" cy="201" rx="58" ry="10" fill="#253f30" opacity=".16"/>${body}</svg>`;
 return {image:'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg),size:/rose|rosa\b/.test(name)?290:310};
}

function renderPlantRemoval(plant) {
 let section=document.getElementById('plant-removal');
 if(!section){section=document.createElement('section');section.id='plant-removal';section.className='plant-section';plantPanel.append(section);}
 section.replaceChildren();
 const button=document.createElement('button');button.type='button';button.textContent='Delete plant';button.style.cssText='padding:12px 16px;border:1px solid #c99a8a;border-radius:10px;background:#fff5ee;color:#8c3e2e;min-height:44px;cursor:pointer';
 const note=document.createElement('p');note.style.cssText='font-size:12px;color:#6c786a';note.textContent='Removes this entry from the map. The record is archived so it can be recovered.';
 const message=document.createElement('p');message.setAttribute('aria-live','polite');section.append(button,note,message);
 button.onclick=async()=>{
  const {data:{session}}=await supabaseClient.auth.getSession();
  if(!session){message.textContent='Sign in to delete a plant.';return;}
  if(!confirm(`Delete “${plant.common_name||'this plant'}” from the garden map? The record will be archived.`))return;
  button.disabled=true;message.textContent='Removing plant…';
  try {
   const {data,error}=await supabaseClient.from('plants').update({status:'Removed'}).eq('id',plant.id).select('id');
   if(error)throw error;if(!data?.length)throw new Error('Your account does not have permission to update this plant.');
   plantPanel.classList.add('hidden');await loadPlants();showPlantRemovalUndo(plant);
  } catch(error){message.textContent='Could not remove plant: '+error.message;button.disabled=false;}
 };
}
function showPlantRemovalUndo(plant) {
 document.getElementById('plant-removal-toast')?.remove();
 const toast=document.createElement('div');toast.id='plant-removal-toast';toast.style.cssText='position:fixed;bottom:145px;left:20px;right:20px;max-width:480px;z-index:1200;padding:16px;background:#fcfaf1;border:1px solid #c4d1b9;border-radius:14px;box-shadow:0 8px 30px #193c3022;color:#294b39';toast.setAttribute('role','status');
 const text=document.createElement('span');text.textContent=(plant.common_name||'Plant')+' removed. ';
 const undo=document.createElement('button');undo.textContent='Undo';undo.style.cssText='min-height:44px;padding:8px 16px;margin-left:8px;border:0;border-radius:8px;background:#294b39;color:white;cursor:pointer';
 const close=document.createElement('button');close.textContent='Dismiss';close.style.cssText='min-height:44px;padding:8px;margin-left:8px;border:0;background:none;cursor:pointer';close.onclick=()=>toast.remove();toast.append(text,undo,close);document.body.append(toast);
 undo.onclick=async()=>{undo.disabled=true;try{const {data,error}=await supabaseClient.from('plants').update({status:plant.status||'Existing'}).eq('id',plant.id).select('id');if(error)throw error;if(!data?.length)throw new Error('No record was restored.');await loadPlants();toast.remove();}catch(error){text.textContent='Could not restore: '+error.message;undo.disabled=false;}};
}

/* First 3D zone: surveyed ground layout, illustrative vertical dimensions. */
(() => {
 const style=document.createElement('style');style.textContent=`#garden-3d{position:fixed;inset:0;z-index:1500;background:#e5eadc;color:#244733;font:14px Arial,sans-serif}#garden-3d[hidden]{display:none}#garden-3d header{position:absolute;top:0;left:0;right:0;z-index:2;padding:17px 22px;background:#faf8f2ed;display:flex;gap:14px;align-items:center;justify-content:space-between;border-bottom:1px solid #cdd8c1}#garden-3d h2{margin:3px 0;font:25px Georgia,serif}#garden-3d small{color:#6b7e61}#garden-3d button{background:#28513b;border:0;color:white;border-radius:10px;padding:11px 14px;min-height:44px;cursor:pointer}#garden-3d-canvas{width:100%;height:100%;display:block;touch-action:none}#garden-3d-help{position:absolute;bottom:18px;left:18px;right:18px;max-width:600px;background:#fffdf1ed;padding:13px 16px;border:1px solid #d4ddc8;border-radius:12px;line-height:1.5;pointer-events:none}#garden-3d-message{position:absolute;top:120px;left:20px;right:20px;text-align:center;z-index:3}#garden-3d-launch{position:fixed;bottom:134px;left:20px;z-index:60;padding:11px 16px;min-height:44px;border:1px solid #cdd7bf;background:#faf8ef;color:#315440;border-radius:24px;cursor:pointer}@media(max-width:700px){#garden-3d header{padding:12px;align-items:flex-start;gap:6px}#garden-3d header button{font-size:11px;padding:8px}#garden-3d h2{font-size:20px}#garden-3d header small{font-size:10px}#garden-3d-help{font-size:11px;bottom:12px;left:12px;right:12px}#garden-3d-launch{bottom:132px;left:12px;font-size:12px}}`;
 document.head.append(style);
 const button=document.createElement('button');button.id='garden-3d-launch';button.textContent='Explore garden · 3D';button.onclick=()=>openGarden3D('WholeGarden');document.body.append(button);
 const root=document.createElement('section');root.id='garden-3d';root.hidden=true;root.setAttribute('aria-label','Interactive garden zones in 3D');root.innerHTML='<header><div><small>GARDENDEX · 3D PROTOTYPE</small><h2 id="garden-3d-title">Whole garden</h2><label style="font-size:12px">Zone <select id="garden-3d-zone" aria-label="Zone" style="padding:7px;border:1px solid #cad5bd;border-radius:7px;color:#284b36;background:#fffdf5;max-width:180px"></select></label><small>Surveyed layout · estimated heights and plant forms</small></div><div style="display:flex;gap:8px"><button id="garden-3d-reset">Reset view</button><button id="garden-3d-close">Back to map</button></div></header><canvas id="garden-3d-canvas" aria-label="Rotate and zoom the 3D garden"></canvas><div id="garden-3d-message" role="status"></div><div id="garden-3d-help">Drag to rotate · Pinch or scroll to zoom · Two fingers or right-drag to pan.<br>Ground outlines and saved plant positions follow the map. House shape, heights, canopy sizes, terrain and photographed feature positions are illustrative. This is not a construction survey.</div>';document.body.append(root);
 let renderer=null,scene,camera,controls,resizeObserver=null,building=null,frame=0,returnFocus=null,activeZone="WholeGarden",threeLibrary=null,zoneOutline=null;
 const names={WholeGarden:"Whole garden",ChildrenGarden:"Children’s garden",BigGarden:"Main garden",Bark:"Bark borders",Driveway:"Driveway",PineTrees:"Pine trees",House:"House",ArchwayPath:"Archway path"};
 const message=document.getElementById('garden-3d-message');
 const setView=()=>{
  if(!camera||!controls)return;
  let rows=(window.gardenSurveyRows||[]).filter(r=>activeZone==='WholeGarden'||r.polygon===activeZone);
  if(activeZone==='ArchwayPath')rows=[{x_cm:2450,y_cm:4772},{x_cm:2850,y_cm:5183}];
  if(!rows.length)return;
  const xs=rows.map(r=>Number(r.x_cm)/100),ys=rows.map(r=>Number(r.y_cm)/100);
  const cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;
  const span=Math.max(Math.max(...xs)-Math.min(...xs),Math.max(...ys)-Math.min(...ys),9);
  const aspect=Math.max(.4,camera.aspect),distance=span*Math.max(1,1/aspect)*1.35;
  camera.far=Math.max(250,distance*6);camera.updateProjectionMatrix();controls.maxDistance=Math.max(160,distance*2);
  camera.position.set(cx+distance*.65,Math.max(12,distance*.7),-cy+distance*.8);controls.target.set(cx,0,-cy);controls.update();
  if(zoneOutline){scene.remove(zoneOutline);zoneOutline.geometry.dispose();zoneOutline.material.dispose();zoneOutline=null;}
  if(activeZone!=='WholeGarden'&&activeZone!=='ArchwayPath'&&threeLibrary){
   const T=threeLibrary;rows.sort((a,b)=>Number(a.point_order)-Number(b.point_order));
   const points=rows.map(r=>new T.Vector3(Number(r.x_cm)/100,.085,-Number(r.y_cm)/100));
   zoneOutline=new T.LineLoop(new T.BufferGeometry().setFromPoints(points),new T.LineBasicMaterial({color:'#c89d43'}));scene.add(zoneOutline);
  }
 };
 document.getElementById('garden-3d-zone').onchange=e=>{activeZone=e.target.value;document.getElementById('garden-3d-title').textContent=names[activeZone]||activeZone;setView();};
 function close(){root.hidden=true;cancelAnimationFrame(frame);returnFocus?.focus();}
 document.getElementById('garden-3d-close').onclick=close;document.getElementById('garden-3d-reset').onclick=setView;root.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
 function animate(){if(root.hidden)return;controls.update();renderer.render(scene,camera);frame=requestAnimationFrame(animate);}
 async function build(){
  const [THREE,orbit]=await Promise.all([import('https://esm.sh/three@0.180.0'),import('https://esm.sh/three@0.180.0/examples/jsm/controls/OrbitControls.js')]);
  threeLibrary=THREE;
  const canvas=document.getElementById('garden-3d-canvas');
  let compatibility=false;
  try{renderer=new THREE.WebGLRenderer({canvas,antialias:true,alpha:false});}
  catch{const {SVGRenderer}=await import('https://esm.sh/three@0.180.0/examples/jsm/renderers/SVGRenderer.js');renderer=new SVGRenderer();renderer.setQuality('low');renderer.domElement.id='garden-3d-canvas';renderer.domElement.setAttribute('aria-label','Rotate and zoom the 3D garden');canvas.replaceWith(renderer.domElement);compatibility=true;}
  if(renderer.setPixelRatio)renderer.setPixelRatio(Math.min(window.devicePixelRatio||1,1.5));if(renderer.shadowMap){renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;}
  if(compatibility)document.getElementById('garden-3d-help').append(' Compatibility rendering: simplified lighting.');
  scene=new THREE.Scene();scene.background=new THREE.Color('#dce6d0');scene.fog=new THREE.Fog('#dce6d0',100,185);
  camera=new THREE.PerspectiveCamera(43,1,.1,250);controls=new orbit.OrbitControls(camera,renderer.domElement);controls.enableDamping=true;controls.dampingFactor=.08;controls.minDistance=7;controls.maxDistance=110;controls.maxPolarAngle=Math.PI/2.08;
  scene.add(new THREE.HemisphereLight('#fff7df','#6b8054',2.4));const sun=new THREE.DirectionalLight('#fff1cc',3);sun.position.set(15,55,0);sun.castShadow=true;sun.shadow.mapSize.set(1024,1024);Object.assign(sun.shadow.camera,{left:-75,right:75,top:75,bottom:-75,near:1,far:140});sun.shadow.bias=-.001;scene.add(sun);
  const mat=(colour)=>compatibility?new THREE.MeshBasicMaterial({color:colour}):new THREE.MeshStandardMaterial({color:colour,roughness:.95});
  const grass=mat('#9fb479'),bark=mat('#987856'),tarmac=mat('#626960'),concrete=mat('#b8b8a8'),stone=mat('#848a72'),leaf=mat('#527746');
  const mesh=(geometry,material,x,y,z,parent=scene)=>{const m=new THREE.Mesh(geometry,material);m.position.set(x,y,z);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;};
  const box=(w,h,d,m,x,y,z)=>mesh(new THREE.BoxGeometry(w,h,d),m,x,y,z);
  if(!compatibility)mesh(new THREE.PlaneGeometry(200,200),mat('#b0c094'),25,-.09,-35).rotation.x=-Math.PI/2;
  const groups={};for(const row of window.gardenSurveyRows||[])(groups[row.polygon]??=[]).push(row);
  if(!groups.ChildrenGarden)throw Error('The garden survey is not loaded. Open your map first, then retry.');
  for(const [name,rows] of Object.entries(groups)) {
   rows.sort((a,b)=>Number(a.point_order)-Number(b.point_order));const shape=new THREE.Shape();rows.forEach((p,i)=>{const x=Number(p.x_cm)/100,y=Number(p.y_cm)/100;i?shape.lineTo(x,y):shape.moveTo(x,y);});shape.closePath();
   const materials={ChildrenGarden:grass,BigGarden:grass,Bark:bark,Driveway:tarmac,PineTrees:mat('#60754e'),House:concrete};
   const ground=mesh(new THREE.ShapeGeometry(shape),materials[name]||grass,0,.01,0);ground.rotation.x=-Math.PI/2;ground.castShadow=false;
  }
  // Simple exterior massing built on the recorded house footprint.
  // This is a model approximation; the existing 2D house artwork is unchanged.
  if(groups.House){
   const shape=new THREE.Shape();groups.House.forEach((p,i)=>i?shape.lineTo(Number(p.x_cm)/100,Number(p.y_cm)/100):shape.moveTo(Number(p.x_cm)/100,Number(p.y_cm)/100));shape.closePath();
   const walls=mesh(new THREE.ExtrudeGeometry(shape,{depth:2.7,bevelEnabled:false}),mat('#e6e2cf'),0,2.72,0);walls.rotation.x=Math.PI/2;walls.scale.y=-1;
   const roofMat=mat('#77524b');
   const pitchedRoof=(x,y,w,d)=>{
    const points=new Float32Array([-w/2,0,-d/2,w/2,0,-d/2,0,1.6,-d/2,-w/2,0,d/2,w/2,0,d/2,0,1.6,d/2]);
    const g=new THREE.BufferGeometry();g.setAttribute('position',new THREE.BufferAttribute(points,3));g.setIndex([0,2,1,3,4,5,0,3,5,0,5,2,1,2,5,1,5,4,0,1,4,0,4,3]);g.computeVertexNormals();mesh(g,roofMat,x,2.75,-y);
   };
   pitchedRoof(47.5,62.15,19.2,6.7);pitchedRoof(46.25,56.45,5.1,5.3);
   // Readable window and entrance accents, approximate façade locations.
   for(const x of [40.5,43,51,54])box(.9,1,.06,mat('#526a68'),x,1.55,-58.76);
   box(.9,1.9,.07,mat('#506050'),46.3,.95,-54.05);
  }
  // Saved plants use their own stored coordinates; forms and heights are estimates.
  const plantResult=await supabaseClient.from('plants').select('id,common_name,species,plant_type,x_cm,y_cm,status');
  if(plantResult.error)throw new Error('Plant records could not be loaded. Please check the connection and retry');
  const canopyGeo=new THREE.IcosahedronGeometry(1,1),trunkMat=mat('#71614a');
  for(const p of plantResult.data||[]){
   if((p.status||'Existing').toLowerCase()!=='existing'||!Number.isFinite(Number(p.x_cm))||!Number.isFinite(Number(p.y_cm)))continue;
   const x=Number(p.x_cm)/100,z=-Number(p.y_cm)/100,name=((p.common_name||'')+' '+(p.species||'')).toLowerCase();
   const isTree=p.plant_type==='Tree'&&!/shubs|shrubs/.test(name),isConifer=p.plant_type==='Conifer';
   if(isTree||isConifer){
    mesh(new THREE.CylinderGeometry(.12,.2,2.4,7),trunkMat,x,1.2,z);
    if(isConifer)mesh(new THREE.ConeGeometry(1.6,4.5,9),leaf,x,3,z);
    else{const c=mesh(canopyGeo,/maple/.test(name)?mat('#815368'):leaf,x,3.6,z);c.scale.set(2,2.1,2);}
   }else if(p.plant_type==='Shrub'||/shubs|shrubs/.test(name)){const c=mesh(canopyGeo,leaf,x,.6,z);c.scale.set(.7,.7,.7);if(/azalea/.test(name))for(let i=0;i<4;i++)mesh(new THREE.SphereGeometry(.09,6,4),mat('#c978ac'),x+Math.sin(i*2)*.4,.9,z+Math.cos(i*2)*.4);}
   else if(/bluebell/.test(name)){for(let i=0;i<5;i++){const px=x+Math.sin(i*3)*.25,pz=z+Math.cos(i*3)*.25;mesh(new THREE.CylinderGeometry(.015,.02,.35,4),leaf,px,.18,pz);mesh(new THREE.SphereGeometry(.075,5,4),mat('#7976bc'),px,.36,pz);}}
  }
  // Shared tarmac spur and road entrance, without a raised kerb.
  const groundPoly=points=>{const s=new THREE.Shape();points.forEach(([x,y],i)=>i?s.lineTo(x,y):s.moveTo(x,y));s.closePath();const m=mesh(new THREE.ShapeGeometry(s),tarmac,0,.035,0);m.rotation.x=-Math.PI/2;m.castShadow=false;};
  groundPoly([[25,50.85],[28,51.83],[28.5,48.44],[24.5,47.72]]);groundPoly([[4.1,0],[5.5,4],[9.2,4],[10.6,0]]);
  const rail=(a,b,h,material,width=.12)=>{const start=new THREE.Vector3(a[0],h,-a[1]),end=new THREE.Vector3(b[0],h,-b[1]),delta=end.clone().sub(start);const m=mesh(new THREE.BoxGeometry(width,width,delta.length()),material,...start.clone().add(end).multiplyScalar(.5).toArray());m.quaternion.setFromUnitVectors(new THREE.Vector3(0,0,1),delta.normalize());};
  const fenceChain=[[0,50],[10.629,48.798],[20.723,49.416],[25,50.853]];
  const rightChain=[[28,51.826],[28.344,51.888],[34.524,53.948],[34.641,70]];
  for(const chain of [fenceChain,rightChain])for(let i=0;i<chain.length-1;i++){
   const a=chain[i],b=chain[i+1],length=Math.hypot(b[0]-a[0],b[1]-a[1]),n=Math.ceil(length/2.5);
   for(const h of [.35,.7,1.05])rail(a,b,h,concrete,.13);
   for(let j=0;j<=n;j++)box(.18,1.28,.18,concrete,a[0]+(b[0]-a[0])*j/n,.64,-(a[1]+(b[1]-a[1])*j/n));
  }
  // Thick rendered masonry arch, built as a true extruded opening.
  const archShape=new THREE.Shape();archShape.moveTo(-1.88,0);archShape.lineTo(-1.88,3.65);archShape.lineTo(1.88,3.65);archShape.lineTo(1.88,0);archShape.lineTo(1.48,0);archShape.lineTo(1.48,2);archShape.absellipse(0,2,1.48,1.25,0,Math.PI,false,0);archShape.lineTo(-1.48,0);archShape.closePath();
  const arch=mesh(new THREE.ExtrudeGeometry(archShape,{depth:.4,bevelEnabled:true,bevelSize:.025,bevelThickness:.025,bevelSegments:1,steps:1}),concrete,26.5,0,-51.35);arch.rotation.y=.31;
  box(4.02,.14,.6,mat('#919c89'),26.5,3.7,-51.35);
  // West dry-stone boundary, repeatable irregular stones; no change to its line.
  const stoneGeo=new THREE.DodecahedronGeometry(.27,0);
  for(let i=0;i<90;i++){const m=mesh(stoneGeo,stone,0,.25+(i%2)*.3,-(47+i*.27));m.scale.set(.95,1,1.35);m.rotation.set(i*.7,i*.4,0);}
  const lamp=(x,z)=>{mesh(new THREE.CylinderGeometry(.045,.07,2.3,8),mat('#ddd9c0'),x,1.15,z);mesh(new THREE.CylinderGeometry(.26,.13,.25,12),mat('#f5edcd'),x,2.4,z);mesh(new THREE.ConeGeometry(.3,.12,12),mat('#71876b'),x,2.58,z);};lamp(33.3,-51.8);lamp(15.2,-42);
  // Roses observed beside archway: stylised, approximate placement and growth.
  const bloomMaterial=mat('#b63e62'),pink=mat('#e6a0b4'),stem=mat('#42613d');
  for(const [x,z,flowerMat] of [[24.75,-51.1,bloomMaterial],[28.2,-51.9,pink]]){
   mesh(new THREE.CylinderGeometry(.025,.035,1.5,6),stem,x,.75,z);
   for(let i=0;i<7;i++){const a=i*2.4,y=.35+i*.2;const m=mesh(new THREE.SphereGeometry(.16,7,5),leaf,x+Math.cos(a)*.17,y,z+Math.sin(a)*.17);m.scale.set(1,.4,1.7);}
   for(let i=0;i<4;i++){const bx=x+Math.sin(i*2)*.23,bz=z+Math.cos(i*2)*.18,by=1+i*.16;for(let p=0;p<6;p++){const a=p*Math.PI/3;mesh(new THREE.SphereGeometry(.095,7,5),flowerMat,bx+Math.cos(a)*.065,by,bz+Math.sin(a)*.065);}}
  }
  // Grass detail stays within the surveyed children's garden (deterministic sampling).
  const boundary=groups.ChildrenGarden.map(p=>[Number(p.x_cm)/100,Number(p.y_cm)/100]);
  const inside=(x,y)=>{let yes=false;for(let i=0,j=boundary.length-1;i<boundary.length;j=i++){const a=boundary[i],b=boundary[j];if(((a[1]>y)!==(b[1]>y))&&(x<(b[0]-a[0])*(y-a[1])/(b[1]-a[1])+a[0]))yes=!yes;}return yes;};
  const tuftGeo=new THREE.ConeGeometry(.055,.22,3),tufts=new THREE.InstancedMesh(tuftGeo,mat('#7e9b5d'),240),dummy=new THREE.Object3D();let count=0;
  for(let i=0;i<300&&count<240;i++){const x=((i*7919)%3400)/100,y=49+((i*3571)%2100)/100;if(!inside(x,y))continue;dummy.position.set(x,.11,-y);dummy.rotation.y=i;dummy.updateMatrix();tufts.setMatrixAt(count++,dummy.matrix);}tufts.count=count;if(!compatibility)scene.add(tufts);
  const resize=()=>{const w=root.clientWidth,h=root.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();};resizeObserver=new ResizeObserver(resize);resizeObserver.observe(root);resize();setView();
 }
 window.openGarden3D=async(zone='WholeGarden')=>{
  activeZone=zone;const selector=document.getElementById('garden-3d-zone');selector.replaceChildren();
  for(const id of ['WholeGarden',...new Set((window.gardenSurveyRows||[]).map(r=>r.polygon))]){const option=document.createElement('option');option.value=id;option.textContent=names[id]||id;selector.append(option);}
  if(zone==='ArchwayPath'){const option=document.createElement('option');option.value=zone;option.textContent=names[zone];selector.append(option);}
  selector.value=zone;document.getElementById('garden-3d-title').textContent=names[zone]||zone;
  returnFocus=document.activeElement;root.hidden=false;message.textContent='Preparing your 3D garden…';document.getElementById('garden-3d-close').focus();
  try{if(!window.gardenSurveyRows?.length){message.textContent='Load your garden map first, then open the 3D view.';return;}
   if(!renderer){building??=build();await building;}
   setView();message.textContent='';cancelAnimationFrame(frame);animate();
  }catch(error){message.textContent='3D view could not load: '+error.message+'. You can return to the map and retry.';building=null;if(renderer){renderer.dispose();renderer=null;}}
 };
})();

/* Reusable plant templates; garden instances are saved only after placement. */
(() => {
 const plants = [
 {id:'beech',name:'European beech',species:'Fagus sylvatica',type:'Tree',habit:'Deciduous',colour:'#70864e',art:'beech',light:'Sun / partial shade',soil:'Well-drained soil',water:'Check moisture while establishing.',care:'Allow space for a tree, or maintain a trained hedge with appropriate pruning.',wildlife:'A substantial canopy provides shelter and habitat.',note:'Tree and hedge are alternative managed forms. Illustrations are not a size or age scale.',source:'https://www.rhs.org.uk/plants/beech/growing-guide'},
 {id:'rose-red',name:'Red climbing rose',species:'Rosa — cultivar unconfirmed',type:'Climber',habit:'Deciduous',colour:'#ba6578',art:'Red rose',light:'Sun',soil:'Fertile, well-drained soil',water:'Check root-zone moisture, especially while establishing.',care:'Train long stems onto a support. Confirm cultivar before choosing a pruning routine.',wildlife:'Open flowers are generally more accessible to insects than very double blooms.',note:'Representative rose template; cultivar and mature size need confirmation.',source:'https://www.rhs.org.uk/plants/roses/climbing/growing-guide'},
 {id:'rose-pink',name:'Pink climbing rose',species:'Rosa — cultivar unconfirmed',type:'Climber',habit:'Deciduous',colour:'#ba6578',art:'Pale pink rose',light:'Sun',soil:'Fertile, well-drained soil',water:'Check root-zone moisture during establishment and dry spells.',care:'Tie stems loosely to the arch; leave space for stems to thicken.',wildlife:'Pollinator value depends on flower form and cultivar.',note:'Representative rose template; cultivar and mature size need confirmation.',source:'https://www.rhs.org.uk/plants/roses/climbing/growing-guide'},
 {id:'azalea',name:'Azalea · Geisha Purple',species:"Rhododendron 'Geisha Purple'",type:'Shrub',habit:'Evergreen',colour:'#477e65',art:'Azalea',light:'Partial / dappled shade',soil:'Acidic, humus-rich; moist but well drained',water:'Keep evenly moist; avoid waterlogged ground.',care:'Usually needs little pruning. Shelter from strong winds and avoid frost pockets.',wildlife:'Flowering shrub; combine with locally native habitat planting.',note:'Harmful if eaten. Template matches the readable label in your photograph.',source:'https://www.rhs.org.uk/plants/51322/rhododendron-geisha-purple/details'},
 {id:'bluebell',name:'Native bluebell',species:'Hyacinthoides non-scripta',type:'Flower',habit:'Seasonal bulb',colour:'#8274b8',art:'Bluebells',light:'Partial shade',soil:'Moist but well-drained woodland soil',water:'Check moisture while growing; do not keep waterlogged.',care:'Let foliage die back naturally after flowering.',wildlife:'Native woodland spring flowers support pollinating insects.',note:'This is the native bluebell template. Confirm your bulbs’ identity before using it for existing plants.',source:'https://www.nationaltrust.org.uk/discover/gardening-tips/how-to-grow-bluebells-in-your-own-garden'},
 {id:'holly',name:'Holly',species:'Ilex aquifolium',type:'Tree',habit:'Evergreen',colour:'#477e65',art:'holly',light:'Sun / partial shade',soil:'Most well-drained soils',water:'Check moisture while establishing.',care:'Allow room for a substantial mature tree or manage as a hedge.',wildlife:'Dense shelter; female plants can carry berries when suitably pollinated.',note:'Spiny foliage; berries are not for eating. Native species template, not an identification of an existing tree.',source:'https://www.rhs.org.uk/plants/hollies/how-to-grow-hollies'},
 {id:'birch',name:'Silver birch',species:'Betula pendula',type:'Tree',habit:'Deciduous',colour:'#b6864c',art:'birch',light:'Sun',soil:'Well-drained soil',water:'Monitor young trees in dry spells.',care:'Choose a position with enough space for a mature tree; avoid unnecessary pruning.',wildlife:'Light canopy and native tree habitat.',note:'Mature size depends on site; this illustration is symbolic and not a scale guide.',source:'https://www.rhs.org.uk/plants/2261/betula-pendula/details'}
 ];
 const esc=s=>String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 function artwork(p){
  // Library portraits use the same simple vector style as the rose cards.
  // Realistic growth and overhead assets remain available separately.
  if(p.id==='beech'){
   const svg='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220"><ellipse cx="100" cy="202" rx="53" ry="9" fill="#173d30" opacity=".12"/><path d="M88 199L94 112H108L114 199Z" fill="#9b9985"/><path d="M100 150L67 111M101 135L133 97" stroke="#9b9985" stroke-width="9" stroke-linecap="round"/><path d="M44 133C19 119 26 88 43 80C33 58 56 37 77 41C86 16 122 18 134 40C161 35 179 58 165 81C188 98 175 132 153 135C140 158 116 154 100 146C78 162 51 153 44 133Z" fill="#4c7848"/><path d="M43 85C32 65 55 44 77 48C85 28 117 27 128 46C151 42 167 58 158 77C139 87 128 77 111 82C88 101 64 88 43 85Z" fill="#7da35b"/><path d="M56 120C70 129 83 127 92 120M118 108C133 116 145 113 153 106" fill="none" stroke="#648e50" stroke-width="8" stroke-linecap="round"/></svg>';
   return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
  }
  const existing=getBotanicalPlantArtwork({common_name:p.art});if(existing)return existing.image;
  const birch=p.art==='birch';let leaves='';
  for(let i=0;i<23;i++){const a=i*2.4,r=20+(i%5)*9,x=100+Math.cos(a)*r,y=90+Math.sin(a)*r;leaves+=`<ellipse cx="${x}" cy="${y}" rx="${birch?19:23}" ry="${birch?24:18}" fill="${['#37634d','#568260','#83a46c'][i%3]}"/>`;}
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 220"><ellipse cx="100" cy="202" rx="58" ry="9" fill="#173d30" opacity=".12"/><path d="M100 199V81 M100 149L63 108 M100 128L137 88" stroke="${birch?'#e7e4d6':'#80684c'}" stroke-width="12" stroke-linecap="round"/>${leaves}${birch?'<path d="M95 173h9m-9 12h7m-5-32h8" stroke="#777a71" stroke-width="3"/>':'<g fill="#c44f56"><circle cx="72" cy="102" r="6"/><circle cx="84" cy="107" r="6"/><circle cx="128" cy="75" r="6"/></g>'}</svg>`;
  return 'data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);
 }
 const css=document.createElement('style');css.textContent=`
 #plant-library-open{position:fixed;right:20px;bottom:100px;z-index:62;border:1px solid #d6dfd4;background:#fffdf7;color:#254e3c;border-radius:24px;padding:12px 17px;min-height:44px;box-shadow:0 5px 20px #16382b18;cursor:pointer}
 #plant-library{position:fixed;inset:0;z-index:1600;background:#f5f4ed;color:#264438;overflow:auto;font:15px/1.5 system-ui,sans-serif}#plant-library[hidden]{display:none}#plant-library *{box-sizing:border-box}#plant-library button,#plant-library input,#plant-library select{font:inherit}#plant-library button{cursor:pointer;min-height:44px;border:0;border-radius:24px;padding:10px 18px}#plant-library button:focus-visible,#plant-library input:focus-visible,#plant-library select:focus-visible{outline:3px solid #bd8a3f;outline-offset:3px}.pc-shell{max-width:1060px;margin:auto;padding:24px}.pc-top{display:flex;align-items:center;justify-content:space-between;gap:12px}.pc-top button{background:#e4e9df;color:#254e3c}.pc-kicker{font-size:11px;text-transform:uppercase;letter-spacing:.2em;color:#738375}.pc-shell h1{font:42px Georgia,serif;margin:24px 0 8px}.pc-filters{display:flex;gap:10px;margin:24px 0}.pc-filters input,.pc-filters select{border:1px solid #d8dfd3;border-radius:16px;padding:13px;background:#fff;min-width:0}.pc-filters input{flex:1}.pc-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(230px,1fr));gap:22px}.pc-card{background:#fff;border-radius:28px;overflow:hidden;box-shadow:0 8px 24px #203d2910}.pc-art{background:var(--pc);height:170px;display:flex;justify-content:center;position:relative}.pc-art:before{content:'';position:absolute;width:130px;height:130px;border:1px solid #ffffff30;border-radius:50%;top:20px}.pc-art img{position:relative;width:150px;height:185px;object-fit:contain;z-index:1;filter:drop-shadow(0 8px 8px #15372b20)}.pc-info{padding:25px 20px 20px}.pc-info h2{font:24px Georgia,serif;margin:0 0 4px}.pc-info small{color:#7a857c}.pc-tag{display:inline-block;background:var(--pc);color:white;border-radius:20px;padding:4px 11px;font-size:11px;margin:12px 3px 4px 0}.pc-info button{width:100%;margin-top:12px;background:#eff2eb;color:#264438}.pc-detail{max-width:570px;margin:24px auto;background:white;border-radius:30px;overflow:hidden;box-shadow:0 12px 40px #203d2910}.pc-detail .pc-art{height:220px}.pc-detail .pc-art img{height:250px;width:210px}.pc-detail .pc-info{padding:35px 28px 28px}.pc-detail h2{font-size:32px}.pc-tabs{display:flex;gap:4px;margin:24px 0 18px;background:#f1f3ec;border-radius:25px;padding:4px}.pc-tabs button{flex:1;padding:8px!important;background:transparent;color:#64776b}.pc-tabs button[aria-selected=true]{background:var(--pc);color:white}.pc-facts{display:grid;grid-template-columns:100px 1fr;gap:12px;margin:0}.pc-facts dt{color:#7a857c}.pc-facts dd{margin:0}.pc-place{background:var(--pc)!important;color:white!important}.pc-note{font-size:12px;color:#758277}.pc-empty{padding:30px}.pc-info a{color:#47765a}@media(max-width:600px){#plant-library-open{right:12px;bottom:96px;font-size:12px}.pc-shell{padding:18px}.pc-shell h1{font-size:34px}.pc-grid{grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.pc-info{padding:23px 13px 15px}.pc-info h2{font-size:20px}.pc-art{height:140px}.pc-art img{height:160px;width:125px}.pc-filters{flex-direction:column}.pc-detail .pc-info{padding:32px 21px 24px}}
 `;document.head.append(css);
 const opener=document.createElement('button');opener.id='plant-library-open';opener.textContent='Plant library';document.body.append(opener);
 const panel=document.createElement('section');panel.id='plant-library';panel.hidden=true;panel.setAttribute('aria-label','Plant library');document.body.append(panel);
 let query='',filter='All',selected=null,tab='Growing';
 const close=()=>{panel.hidden=true;opener.focus();};
 function render(){panel.innerHTML=`<div class="pc-shell"><div class="pc-top"><span class="pc-kicker">GardenDex / Plant library</span><button data-close>Back to garden</button></div>${selected?detail(selected):`<h1>A little knowledge.<br>A growing garden.</h1><p>Choose a plant, get to know it, then find its place.</p><p class="pc-note">Green · evergreen &nbsp; Amber · deciduous trees &nbsp; Rose · deciduous climbers &nbsp; Violet · seasonal bulbs. Illustrations are representative.</p><div class="pc-filters"><input aria-label="Search plant library" placeholder="Search name or species…" value="${esc(query)}"><select aria-label="Filter plant habit">${['All','Evergreen','Deciduous','Seasonal bulb'].map(s=>`<option${s===filter?' selected':''}>${s}</option>`).join('')}</select></div><div class="pc-grid" id="pc-results"></div><p class="pc-note">Seven reusable starter templates. Selecting a template does not add a plant until you choose a location and save it.</p>`}</div>`;
 panel.querySelector('[data-close]').onclick=close;
 if(!selected){results();panel.querySelector('input').oninput=e=>{query=e.target.value;results();};panel.querySelector('select').onchange=e=>{filter=e.target.value;results();};}
 else{panel.querySelector('[data-list]').onclick=()=>{selected=null;render();};panel.querySelectorAll('[data-tab]').forEach(b=>b.onclick=()=>{tab=b.dataset.tab;render();});panel.querySelector('[data-place]').onclick=place;}
 }
 function results(){const list=plants.filter(p=>(filter==='All'||p.habit===filter)&&(p.name+' '+p.species).toLowerCase().includes(query.toLowerCase()));panel.querySelector('#pc-results').innerHTML=list.length?list.map(p=>`<article class="pc-card" style="--pc:${p.colour}"><div class="pc-art"><img src="${artwork(p)}" alt="Illustration of ${esc(p.name)}"></div><div class="pc-info"><h2>${esc(p.name)}</h2><small>${esc(p.species)}</small><div><span class="pc-tag">${p.habit}</span></div><button data-plant="${p.id}">Explore plant →</button></div></article>`).join(''):'<p class="pc-empty">No matching plants. Try another name or habit.</p>';panel.querySelectorAll('[data-plant]').forEach(b=>b.onclick=()=>{selected=plants.find(p=>p.id===b.dataset.plant);tab='Growing';render();panel.scrollTop=0;});}
 function detail(p){return `<div class="pc-detail" style="--pc:${p.colour}"><div class="pc-art"><img src="${artwork(p)}" alt="Illustration of ${esc(p.name)}"></div><div class="pc-info"><button data-list>← All plants</button><h2>${esc(p.name)}</h2><small><i>${esc(p.species)}</i></small><div><span class="pc-tag">${p.habit}</span><span class="pc-tag">${p.type}</span></div><div class="pc-tabs" role="tablist" aria-label="Plant information">${['Growing','Evolutions','Care','Wildlife'].map(t=>`<button role="tab" data-tab="${t}" aria-selected="${tab===t}">${t}</button>`).join('')}</div><div role="tabpanel">${tab==='Evolutions'?evolutions(p):tab==='Growing'?`<dl class="pc-facts"><dt>Light</dt><dd>${p.light}</dd><dt>Soil</dt><dd>${p.soil}</dd><dt>Water</dt><dd>${p.water}</dd></dl>`:`<p>${tab==='Care'?p.care:p.wildlife}</p>`}</div><p class="pc-note">${p.note}</p><a href="${p.source}" target="_blank" rel="noopener">Growing reference ↗</a><label style="display:block;margin-top:20px" for="pc-status">Add as</label><select id="pc-status" style="width:100%;padding:12px;border:1px solid #d8dfd3;border-radius:12px"><option value="Existing">Existing plant</option><option value="Planned">Future / planned plant</option></select><button class="pc-place" data-place>Place in garden →</button><p id="pc-message" role="status" class="pc-note">Choose the exact map location, review the details, then save.</p></div></div>`;}
 function evolutions(p){
 const stages=p.id==='beech'?['Sapling','Young tree','Mature tree','Managed hedge']:p.id==='bluebell'?['Dormant bulb','Shoots','Leaves','Flowering','Dieback']:null;
 if(!stages)return '<p>Growth artwork for this plant is coming next.</p>';
 return `<p class="pc-note">${p.id==='beech'?'The hedge is an alternative trained form, not the next age stage.':'An annual cycle: dieback returns to dormancy, not plant death.'}</p><div class="pc-evolutions">${stages.map((name,i)=>`<article><img src="assets/evolutions/${p.id}-0-${i}.png" alt="${name} portrait"><strong>${name}</strong><img src="assets/evolutions/${p.id}-1-${i}.png" alt="${name} overhead map view"><small>Map view</small></article>`).join('')}</div>`;
 }
 window.openGardenDexCard=plant=>{const name=((plant.common_name||'')+' '+(plant.species||'')).toLowerCase();selected=plants.find(p=>name.includes(p.species.toLowerCase())||(p.id==='beech'&&/beech/.test(name))||(p.id==='bluebell'&&/bluebell/.test(name)));if(!selected)return;tab='Growing';render();panel.hidden=false;panel.querySelector('[data-close]').focus();};
 async function place(){const button=panel.querySelector('[data-place]');button.disabled=true;try{const {data:{session},error}=await supabaseClient.auth.getSession();if(error)throw error;if(!session){panel.querySelector('#pc-message').textContent='Sign in to GardenDex before placing and saving a plant.';return;}const p=selected,status=panel.querySelector('#pc-status').value;addPlantForm.reset();for(const [id,value] of Object.entries({'new-common-name':p.name,'new-species':p.species,'new-plant-type':p.type,'new-condition':'Unknown','new-status':status,'new-notes':`Plant library template: ${p.id}. ${p.note}\nLight: ${p.light}. Soil: ${p.soil}. ${p.care}\nReference: ${p.source}`}))document.getElementById(id).value=value;updatePlantingGroupFields();panel.hidden=true;startPlantPlacement();placementBanner.querySelector('strong').textContent='Place '+p.name;placementBanner.querySelector('span').textContent='Tap its location, review the details, then save.';}catch(e){panel.querySelector('#pc-message').textContent='Could not start placement. Check your connection and try again.';}finally{button.disabled=false;}}
 opener.onclick=()=>{selected=null;render();panel.hidden=false;panel.querySelector('[data-close]').focus();};panel.addEventListener('keydown',e=>{if(e.key==='Escape')close();});
})();
