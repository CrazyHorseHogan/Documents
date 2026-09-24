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
    "-350 0 6700 7250";
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
drawAllZoneBoundaries(polygons);
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

    road.setAttribute(
        "x",
        -100
    );

    /*
       Real Y = 0 corresponds to
       SVG Y = 7000.

       Negative real-world Y extends
       downward on the SVG.
    */

    road.setAttribute(
        "y",
        SVG_HEIGHT
    );

    road.setAttribute(
        "width",
        6600
    );

    road.setAttribute(
        "height",
        200
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