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

    if (shouldShow) {
        drawPlantMarker(plant);
    }

});

}
/* =========================================
   GARDENDEX PLANT ARTWORK LIBRARY
========================================= */

function getPlantArtwork(plant) {

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
