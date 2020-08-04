/* This program shows an animation of a number of small, randomly
 * colored balls bouncing around inside a cube.  The cube is shown
 * as a transparent box. The user can rotate the view of the scene 
 * the mouse.  The canvas in which the scene is drawn occupies the
 * entire browser window, and the animation runs continuously.  This
 * is how three.js is typically used, although it is not how I use
 * it in other examples that I have written.
 * 
 * (Note:  The balls do not bounce off each other; balls just pass through
 * other balls.)
 */

"use strict";

var scene, camera, renderer;  // Three.js rendering basics.

var canvas;  // The canvas on which the renderer will draw.
             // This will be created by the renderer, and it will
             // be added to the body of the page.
             
var controls;  // an object of type TrackballControls, the handles roatation using the mouse.

var cameraAndLight;  // Object holding both camera and light.  The
                     // light shines from the direction of the camera.

var animating = false; // Animates or not
var balls = [];   // An array of objects, each object has data for one bouncing ball.

var BALL_COUNT = 5;  // Number of balls to be created.

var swl, grd ; // Main WT elements


/**
 * Wind Turbine functions 
**/
function createSeaLevelObject(width){
    var swl_geo = new THREE.PlaneGeometry(width, width, 2, 2)
    var swl_mat = new THREE.MeshBasicMaterial( {
            polygonOffset: true,  // will make sure the edges are visible.
            polygonOffsetUnits: 1,
            polygonOffsetFactor: 1,
            color: 0xa0bfe0,
            transparent: true,
            opacity: 0.5,
            side: THREE.DoubleSide
    });
    var swl     = new THREE.Mesh( swl_geo, swl_mat );
    swl.rotation.set(Math.PI/2,0,0);
    return swl;
}
function createSeaBedObject(width, depth){
    var grd_geo = new THREE.PlaneGeometry(width, width, 2, 2)
    var grd_mat = new THREE.MeshBasicMaterial( {
            polygonOffset: true,  // will make sure the edges are visible.
            polygonOffsetUnits: 1,
            polygonOffsetFactor: 1,
            color: 0xaf8000,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
    });

    var grd= new THREE.Mesh( grd_geo, grd_mat );
    grd.rotation.set(Math.PI/2,0,0);
    grd.geometry.translate(0,0,-depth);
    return grd;
}

/**
 *  Creates the bouncing balls and the translucent cube in which the balls bounce,
 *  and adds them to the scene.  A light that shines from the direction of the
 *  camera's view is also bundled with the camera and added to the scene.
 */
function createWorld() {

    renderer.setClearColor( 0 );  // black background
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(38, canvas.width/canvas.height, 0.1, 700);

    /* Get object/domain extent*/
    var e = getExtent();
    document.getElementById("DEBUG").innerHTML = e.xmin ;


    /* Add the camera and a light to the scene, linked into one object. */
    var light = new THREE.DirectionalLight();
    light.position.set(0,-50,100);
    camera.position.set(0,40,100);
    camera.lookAt(scene.position);
	camera.add(light);
    scene.add(camera);

    
    /* Create some balls and add them to the scene */
    var geom = new THREE.SphereGeometry(1,20,12);  // Geometry will be reused for all the balls.
    for (var i = 0; i < BALL_COUNT; i++) {
        var ball = {};  // object will contain a sphere plus its position and velocity info
        balls.push(ball);
        
        ball.obj = new THREE.Mesh( 
            geom, 
            new THREE.MeshPhongMaterial( {
                color: Math.floor(Math.random() * 0x1000000), // random color
                specular:0x080808,
                shininess: 32
            })
        );

        ball.x = 18*Math.random() - 9;   // set random ball position
        ball.y = 18*Math.random() - 9;
        ball.z = 18*Math.random() - 9;
        ball.dx = Math.random() * 6 + 2;  // set random ball velocity, in units per second
        ball.dy = Math.random() * 6 + 2;
        ball.dz = Math.random() * 6 + 2;
        if (Math.random() < 0.5)
            ball.dx = -ball.dx;
        if (Math.random() < 0.5)
            ball.dy = -ball.dy;
        if (Math.random() < 0.5)
            ball.dz = -ball.dz;

        ball.obj.position.set( ball.x, ball.y, ball.z);
        scene.add(ball.obj);
    }

    /* Adding a line */
    var lineGeom = new THREE.Geometry();
    lineGeom.vertices = [
        new THREE.Vector3(-20,-2,0),
        new THREE.Vector3(2,-20,0),
        new THREE.Vector3(0,20,0),
        new THREE.Vector3(0,20,20),
    ];
    var lineMat = new THREE.LineBasicMaterial( {
        color: 0x00f0A0, // purple; the default is white
        linewidth: 10 // 2 pixels; the default is 1
    } );
    var line = new THREE.Line( lineGeom, lineMat );
    scene.add(line)


    /* Adding a cylinder*/
    //new THREE.CylinderGeometry(radiusTop, radiusBottom, height,
    //radiusSegments, heightSegments, openEnded, thetaStart, thetaLength)
    var cyl_geo = new THREE.CylinderGeometry(2, 4, 10, 20, 2, false)
    var cyl_mat = new THREE.MeshBasicMaterial( {color: 0xff00f0} );
    var cyl     = new THREE.Mesh( cyl_geo, cyl_mat );
    scene.add(cyl)

    /* Add planes*/
    swl = createSeaLevelObject(40);
    scene.add(swl)
    grd = createSeaBedObject(40, -10);
    scene.add(grd)


    /* Create and add the transparent cube to the scene */
    var cube = new THREE.Mesh(
        new THREE.BoxGeometry(20,20,20),
        new THREE.MeshPhongMaterial( {
            polygonOffset: true,  // will make sure the edges are visible.
            polygonOffsetUnits: 1,
            polygonOffsetFactor: 1,
            color: "white",
            specular: 0x202020,
            transparent: true,
            opacity: 0.3
        } )
    );
	scene.add(cube);
    
    /* Create and add a wireframe cube to the scene, to show the edges of the cube. */
	var edgeGeometry = new THREE.EdgesGeometry(cube.geometry);  // contains edges of cube without diagonal edges
	cube.add(new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({color:0xffffff})));


    var e = getExtent();
}

function getExtent(){
    var e = {
        xmin : Infinity,
        xmax : -Infinity,
        ymin : Infinity,
        ymax : -Infinity,
        zmin : Infinity,
        zmax : -Infinity,
        centerX: 0,
        centerY: 0,
        centerZ: 0,
        max: 0,
        scale: 0
    };
    scene.traverse( function( node ) {
        if ( (node instanceof THREE.Mesh)  || (node instanceof THREE.LineLoop)  ) {
           //node.material = new THREE.MeshNormalMaterial()
           var geom =  node.geometry;
           //console.log(geom);
           for (var i = 0; i < geom.vertices.length; i++) {
                var v = geom.vertices[i];
                if (v.x < e.xmin)
                    e.xmin = v.x;
                else if (v.x > e.xmax)
                    e.xmax = v.x;
                if (v.y < e.ymin)
                    e.ymin = v.y;
                else if (v.y > e.ymax)
                    e.ymax = v.y;
                if (v.z < e.zmin)
                    e.zmin = v.z;
                else if (v.z > e.zmax)
                    e.zmax = v.z;
           }
        }
    } );


    e.centerX = (e.xmin+e.xmax)/2;
    e.centerX = (e.ymin+e.ymax)/2;
    e.centerX = (e.zmin+e.zmax)/2;
    e.max = Math.max(e.centerX - e.xmin, e.xmax - e.centerX);
    e.max = Math.max(e.max, Math.max(e.centerY - e.ymin, e.ymax - e.centerY) );
    e.max = Math.max(e.max, Math.max(e.centerZ - e.zmin, e.zmax - e.centerZ) );
    e.scale = 10/e.max;

    if (window.console) {
           console.log("Get Extent, scale: " + e.scale);
           console.log("Center at ( " + e.centerX + ", " + e.centerY + ", " + e.centerZ + " )");
           console.log(e);
    }
    return e;
}


/**
 *  Render the scene.  This is called for each frame of the animation, after updating
 *  the position and velocity data of the balls.
 */
function render() {
    renderer.render(scene, camera);
}

/*  This page uses THREE.TrackballControls to let the user use the mouse to rotate
 *  the view.  TrackballControls are designed to be used during an animation, where
 *  the rotation is updated as part of preparing for the next frame.  The scene
 *  is not automatically updated just because the user drags the mouse.  To get
 *  the rotation to work without animation, I add another mouse listener to the
 *  canvas, just to call the render() function when the user drags the mouse.
 *  The same thing holds for touch events -- I call render for any mouse move
 *  event with one touch.
 */
function installTrackballControls() {
    controls = new THREE.TrackballControls(camera, canvas);  // note: TrackballControls require animation.
    controls.noPan = false;   // Don't do panning with the right mosue button.
    controls.noZoom = false;  // Don't do zooming with middle mouse button.
    controls.staticMoving = true;

    function move() {
        controls.update();
		if (!animating) {
			render();
		}
    }
    function down() {
        document.addEventListener("mousemove", move, false);
    }
    function up() {
        document.removeEventListener("mousemove", move, false);
    }
    function touch(event) {
        if (event.touches.length == 1) {
            move();
        }
    }
    canvas.addEventListener("mousedown", down, false);
    canvas.addEventListener("touchmove", touch, false);
}

/** 
    Reset controls view
*/
function resetControls() {
    controls.reset();
    if (!animating) {
      render();
    }
}

/**
 *  When an animation is in progress, this function is called just before rendering each
 *  frame of the animation.  In this case, the bouncing balls are moved by an amount
 *  
 */
function updateForFrame() { 
   var dt = clock.getDelta();  // time since last update
   for (var i = 0; i < balls.length; i++) {
       var ball = balls[i];
       
       /* update ball position based on ball velocity and elapsed time */
       ball.x += ball.dx * dt;
       ball.y += ball.dy * dt;
       ball.z += ball.dz * dt;
       
       /* if ball has moved outside the cube, reflect it back into the cube */
       if (ball.x > 9) {
           ball.x -= 2*(ball.x - 9);
           ball.dx = -Math.abs(ball.dx);
       }
       else if (ball.x < -9) {
           ball.x += 2*(-9 - ball.x);
           ball.dx = Math.abs(ball.dx);
       }
       if (ball.y > 9) {
           ball.y -= 2*(ball.y - 9);
           ball.dy = -Math.abs(ball.dy);
       }
       else if (ball.y < -9) {
           ball.y += 2*(-9 - ball.y);
           ball.dy = Math.abs(ball.dy);
       }
       if (ball.z > 9) {
           ball.z -= 2*(ball.z - 9);
           ball.dz = -Math.abs(ball.dz);
       }
       else if (ball.z < -9) {
           ball.z += 2*(-9 - ball.z);
           ball.dz = Math.abs(ball.dz);
       }
       
       ball.obj.position.set(ball.x, ball.y, ball.z);
   }
}


//--------------------------- animation support -----------------------------------

var clock;  // Keeps track of elapsed time of animation.

function doFrame() {
    if (animating) {
        updateForFrame();
        controls.update();
        render();
        requestAnimationFrame(doFrame); 
    }
}

function startAnimation() {
    if (!animating) {
       //prevTime = Date.now();
	   animating = true;
       //prevMixerTime = Date.now();
	   requestAnimationFrame(doFrame);
	}
}

function pauseAnimation() {
	if (animating) {
	    animating = false;
	}
}

function doAnimationCheckbox() {
    console.log('WTF do animation');
    var anim = document.getElementById("animate").checked
    if ( anim == animating ) { // should not happen
      return;
    }
    if ( anim ) {
    	startAnimation();
        document.getElementById("DEBUG").innerHTML = 'Start animation' ;
    }
    else {
    	pauseAnimation();
        document.getElementById("DEBUG").innerHTML = 'Pause animation' ;
    }
}


//----------------------- show/hide elements -------------------------------
function showHide(elem, elem_name) {
    if (document.getElementById(elem_name).checked) {
    	elem.visible=true;
        console.log('Show '+elem_name);
    }
    else {
    	elem.visible=false;
        console.log('Hide '+elem_name);
    }
}
function showSeaLevel() { 
    showHide(swl,'show-sealevel');
    render();
}
function showSeaBed()   { 
    showHide(grd,'show-seabed'); 
    render();
}
//----------------------- respond to window resizing -------------------------------

/* When the window is resized, we need to adjust the aspect ratio of the camera.
 * We also need to reset the size of the canvas that used by the renderer to
 * match the new size of the window.
 */
 function doResize() {
     var width  = window.innerWidth*1.0;
     var height = window.innerHeight*0.6;
     camera.aspect = width/ height;
     camera.updateProjectionMatrix(); // Need to call this for the change in aspect to take effect.
     renderer.setSize(width, height);
 }


//----------------------------------------------------------------------------------

/**
 *  This init() function is called when by the onload event when the document has loaded.
 */
function init() {
    try {
        try {
            canvas = document.getElementById("maincanvas");
			renderer = new THREE.WebGLRenderer( { 
               canvas: canvas,
			   antialias: true
			} );
        }
        catch (e) { 
            document.body.innerHTML="<h3><b>Sorry, WebGL is required but is not available.</b><h3>";
            return;
        }
        // --- If canvas is not provided by to renderer
        //canvas = renderer.domElement;  // The canvas was created by the renderer.
        //renderer.setSize(window.innerWidth, window.innerHeight);  // match size of canvas to window
        //document.body.appendChild(canvas);  // The canvas must be added to the body of the page.
        window.addEventListener("resize", doResize, false);  // Set up handler for resize event
        clock = new THREE.Clock(); // For keeping time during the animation.
        createWorld();
        installTrackballControls();
        doResize();


        // --- GUI and Callbacks
        //document.getElementById("DEBUG").innerHTML = 'Hello' ;
        document.getElementById("animate").checked = false;
        document.getElementById("animate").onchange = doAnimationCheckbox;
        document.getElementById("show-sealevel").checked = true;
        document.getElementById("show-sealevel").onchange = showSeaLevel;
        document.getElementById("show-seabed").checked = true;
        document.getElementById("show-seabed").onchange = showSeaBed;
        //showSeaLevel();
        //showSeaBed();


        //requestAnimationFrame(doFrame);  // Start the animation.
        render();

    }
    catch (e) {
        document.body.innerHTML = "<h3><b>Sorry, an error occurred:<br>" + e + "</b></h3>";
	}



}

