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

var renderer, scene, camera, light;   // Three.js rendering basics.

var canvas;  // The canvas on which the renderer will draw.
             // This will be created by the renderer, and it will
             // be added to the body of the page.
             
var controls;  // an object of type TrackballControls, the handles roatation using the mouse.


var animating = true; // Animates or not
var dt =0.03 ;         // Time step TODO scale with clock
var time =0 ;            // Time step TODO scale with clock
var amplitude = 1.0 ;  // Amplitude of modes

var balls = [];   // An array of objects, each object has data for one bouncing ball.

var BALL_COUNT = 0;  // Number of balls to be created.

var input_file ;
var file_content;
var AJ ;

var nElem,  Elems, Props ;  // Elements and ElementProperties
var nNodes, Nodes ;  // Nodes
var Connectivity  ;  // Connectivity mapping
var iMode, Modes, omega, Displ;  // Modes data
var groundLevel;
omega =1
var extent

var swl, grd ; // Main WT elements
var axes     ; // Axes


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


/* returns orientation and position of a segment, assumed to be along y*/
function segmentOrient(P1, P2){
    var direction = new THREE.Vector3().subVectors( P2, P1 );
    var middle   =  new THREE.Vector3().addVectors( P1, direction.multiplyScalar(0.5) );
    var orientation = new THREE.Matrix4();
    /* THREE.Object3D().up (=Y) default orientation for all objects */
    orientation.lookAt(P1, P2, new THREE.Object3D().up);
    /* rotation around axis X by -90 degrees 
     * matches the default orientation Y 
     * with the orientation of looking Z */
    var M1=new THREE.Matrix4();
    M1.set(1,0,0,0,
           0,0,1,0, 
           0,-1,0,0,
           0,0,0,1);
    orientation.multiply(M1);
    return [orientation, middle, direction.length()];
}

function cylinderBetweenPoints(P1, P2, R1, R2, color){

    var s1_geo = new THREE.SphereGeometry(R1, 16, 16, 0, 2*Math.PI);
    var s2_geo = new THREE.SphereGeometry(R2, 16, 16, 0, 2*Math.PI);
    var s1_mat = new THREE.MeshBasicMaterial({color:'white'})
    var s2_mat = new THREE.MeshBasicMaterial({color:'red'  })
    var s1     = new THREE.Mesh( s1_geo, s1_mat );
    var s2     = new THREE.Mesh( s2_geo, s2_mat );
    s1.position.set(P1.x,P1.y,P1.z);
    s2.position.set(P2.x,P2.y,P2.z);
    
    var arr = segmentOrient(P1, P2);

    var cyl_geo = new THREE.CylinderGeometry(R2, R1, 2*arr[2], 20, 2, false)
    var cyl_mat = new THREE.MeshBasicMaterial( {color: color} );
    var cyl     = new THREE.Mesh( cyl_geo, cyl_mat );
    cyl.applyMatrix(arr[0])
    cyl.position.set(arr[1].x, arr[1].y, arr[1].z);
    cyl.updateMatrixWorld();
    return [cyl, s1, s2];
}


/**
Usage
Example URL:
http://www.example.com/index.php?id=1&image=awesome.jpg
Calling getQueryVariable("id") - would return "1".
Calling getQueryVariable("image") - would return "awesome.jpg".
 */
function getQueryVariable(variable)
{
       var query = window.location.search.substring(1);
       var vars = query.split("&");
       for (var i=0;i<vars.length;i++) {
               var pair = vars[i].split("=");
               if(pair[0] == variable){return pair[1].trim();}
       }
       return(false);
}

function loadJSONcallback(AJ, filename, callback) {   
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    xobj.open('GET', filename, true); // Replace 'my_data' with the path to your file
    xobj.onreadystatechange = function () {
          if (xobj.readyState == 4 && xobj.status == "200") {
            return callback(xobj.responseText, AJ);
          }
    };
    xobj.send(null);  
 }

/* Load object from json file to scene
 * NOTE: this is an async method, and thus there is no way to return something
 * */
function jsonToObjects(filename){
    //filename+='?t='+Date.now();
    filename+='?t='+Date.now();
    console.log(filename);

    loadJSONcallback(AJ, filename, function(response, AJ) {
       // Parse JSON string into object
       AJ = JSON.parse(response);
       //console.log('AJ',AJ)
       /* Elements */
//        NOTE Keep Me
//        nElem=1;
//        nNodes=2;
//        Nodes = new Array(nNodes); 
//        Displ = new Array(nNodes); 
//        Nodes[0] =  new THREE.Vector3(-30,0,20);
//        Nodes[1] =  new THREE.Vector3( 20,5,20);
//        Displ[0] =  new THREE.Vector3(10,0,0.0);
//        Displ[1] =  new THREE.Vector3(50,0,0.0);
//        Connectivity= Array2D(nElem,2);
//        Connectivity[0] = [0,1]

        iMode =0 // TODO
        Nodes        = AJ.Nodes       ;
        Modes        = AJ.Modes       ;
        Props        = AJ.ElemProps   ;
        Connectivity = AJ.Connectivity;
        groundLevel  = AJ.groundLevel;
        nNodes = Nodes.length;
        nElem  = Props.length;
        Elems = new Array(nElem); 

       for (var iElem = 0; iElem < nElem; iElem++) {
          var i1 = Connectivity[iElem][0]
          var i2 = Connectivity[iElem][1]
          // NOTE: Coord conversion OpenFAST to Three:  x=-yOF, y=zOF, z=-xOF
          var P1 = new THREE.Vector3(-Nodes[i1][1], Nodes[i1][2], -Nodes[i1][0])
          var P2 = new THREE.Vector3(-Nodes[i2][1], Nodes[i2][2], -Nodes[i2][0])
          console.log('Adding cylinder:',P1, P2, Props[iElem].Diam)
          var R =  Props[iElem].Diam/2;
          if (Props[iElem].type==1){
              var color=0xc08f0e;
          } else if (Props[iElem].type==2) {
              var color=0x8ac00e; // cable
              R=R/2;
          } else if (Props[iElem].type==3) {
              var color=0xc00e34; //rigid
          } else {
              var color=0xeab320; //misc
          }
          var arr = cylinderBetweenPoints(P1, P2, R, R, color);
          scene.add(arr[0]);
          //scene.add(arr[1]);
          //scene.add(arr[2]);
          Elems[iElem]= arr[0]; // Store cylinder
       }


       var pp= document.getElementById('mode-selection');
       var labels='';
       for (var i = 0; i < Modes.length; i++) {
           labels+='<label style="margin-left: 5px"><input type="radio" name="mode" id="'+i+'"'
           if (i==0){
               labels+=' checked="checked"';
           }
           labels+='>'+Modes[i].name+'</label>';
       }
       pp.innerHTML=labels
       pp.children;
       for (var i = 0; i < pp.children.length; i++) {
           pp.children[i].onclick = modeSelect;
       }
       modelLoaded();

     });
}
function modeSelect(){
    iMode = parseInt(document.querySelector('input[name="mode"]:checked').id);
    console.log('>>> Mode select',iMode)
    time = 0;
    
}



/**
 *  Creates the bouncing balls and the translucent cube in which the balls bounce,
 *  and adds them to the scene.  A light that shines from the direction of the
 *  camera's view is also bundled with the camera and added to the scene.
 */
function createBasicWorld() {

    renderer.setClearColor( 0 );  // black background
    scene   = new THREE.Scene();
}


function modelLoaded() {
    
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

    // --- Estimate scene extent
    extent = getExtent();


    /* Add planes*/
    swl = createSeaLevelObject(extent.maxDim);
    scene.add(swl)
    grd = createSeaBedObject(extent.maxDim, groundLevel);
    scene.add(grd)

    // --- Defining light and camera position
    var w = canvas.width;
    var h = canvas.height;
    var viewSize = h;
    var aspectRatio = w / h;

    var _viewport = {
        viewSize: viewSize,
        aspectRatio: aspectRatio,
        left: (-aspectRatio * viewSize) / 2,
        right: (aspectRatio * viewSize) / 2,
        top: viewSize / 2,
        bottom: -viewSize / 2,
        near: -50,
        far: 50
    }


    //camera = new THREE.OrthographicCamera( canvas.width/-2, canvas.width/2, canvas.height/2, canvas.height/-2, extent.maxDim*0.005, extent.maxDim*50);
//     camera = new THREE.OrthographicCamera(
//      _viewport.left, 
//     _viewport.right, 
//     _viewport.top, 
//     _viewport.bottom, 
//     _viewport.near, 
//     _viewport.far )
        
    light   = new THREE.DirectionalLight();
    //camera  = new THREE.PerspectiveCamera(extent.maxDim*4.2, canvas.width/canvas.height, extent.maxDim*0.005, extent.maxDim*50);
    camera  = new THREE.PerspectiveCamera(extent.maxDim, canvas.width/canvas.height, extent.maxDim*0.005, extent.maxDim*50);
    //camera.position.set(extent.centerX, extent.centerY*0 + extent.maxDim*2, extent.centerZ + extent.maxDim*5);
    camera.position.set(0, extent.centerY*0 + extent.maxDim*2, extent.centerZ*0 - extent.maxDim*5);
    camera.lookAt(scene.position);
    //camera.lookAt(extent.centerX, extent.centerY, extent.centerZ);
    //camera.up = new THREE.Vector3(0,1,0);
    camera.lookAt(new THREE.Vector3(0,0,0));
    console.log('scene position',scene.position)
    console.log('camera position',camera.position)
    console.log('canvas size',canvas.width,canvas.height)



    light.position.set(0,extent.maxDim*4,extent.maxDim*4);
	camera.add(light);
    scene.add(camera);

    // --- Axis helper
    axes = new THREE.AxesHelper( extent.maxDim/2 );
    axes.rotation.set(-Math.PI/2,0,Math.PI/2);
    scene.add( axes );

    // --- Controls depend on camera
    installTrackballControls();
    enableGUI() ;


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
// OpenFAST "-x" view is three z view
function xView() {
    controls.reset();
    camera.position.set(extent.centerX,extent.centerY*0,extent.maxDim*3);
    if (!animating) {
      render();
    }
}

// OpenFAST "y" view is three -x view
function yView() {
    controls.reset();
    camera.position.set(-extent.maxDim*3,extent.centerY*0,extent.centerZ);
    if (!animating) {
      render();
    }
}

// OpenFAST "z" view is three y view
function zView() {
    controls.reset();
    camera.position.set(extent.centerX, extent.maxDim*3,extent.centerZ);
    if (!animating) {
      render();
    }
}





function Array2D(n,m){
    var x = new Array(n);
    for (var i = 0; i < n; i++) {
      x[i] = new Array(m);
    }
    return x
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
        maxDim: 0,
        scale: 0
    };
    scene.traverse( function( node ) {
        if ( (node instanceof THREE.Mesh)  || (node instanceof THREE.LineLoop)  ) {
           //node.material = new THREE.MeshNormalMaterial()
           var geom =  node.geometry;
           for (var i = 0; i < geom.vertices.length; i++) {
                var v = geom.vertices[i].clone();
                v.applyMatrix4(node.matrixWorld );
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
    e.centerY = (e.ymin+e.ymax)/2;
    e.centerZ = (e.zmin+e.zmax)/2;
    e.maxDim = Math.max(e.xmax-e.xmin, e.maxDim);
    e.maxDim = Math.max(e.ymax-e.ymin, e.maxDim);
    e.maxDim = Math.max(e.zmax-e.zmin, e.maxDim);
    e.max = Math.max(e.centerX - e.xmin, e.xmax - e.centerX);
    e.max = Math.max(e.max, Math.max(e.centerY - e.ymin, e.ymax - e.centerY) );
    e.max = Math.max(e.max, Math.max(e.centerZ - e.zmin, e.zmax - e.centerZ) );
    e.scale = 10/e.max;

    if (window.console) {
           console.log("Get Extent, scale: " + e.scale, 'Max dim:', e.maxDim, 'Max rad',e.max);
           console.log("Extent at ( ("+e.xmin+","+e.xmax+"), ("+e.ymin+","+e.ymax+"), ("+e.zmin+","+e.zmax+") )");
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

function enableGUI() {
    /**/
    console.log('>>>>>>>> ENABLING GUI')
    doResize();
    setDt();
    setAmplitude();
    showSeaLevel();
    showSeaBed();
    showAxes();
    requestAnimationFrame(doFrame);  // Start the animation.
    //render();
}

function disableGUI() {
    /**/

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
 *  When an animation is in progress, this function is called just before rendering each
 *  frame of the animation.  In this case, the bouncing balls are moved by an amount
 *  
 */
function updateForFrame() { 
   //var dt = clock.getDelta();  // time since last update
   //dt = 0.03;
   time=time+dt;
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

   for (var iElem = 0; iElem < nElem; iElem++) {
      var i1 = Connectivity[iElem][0]
      var i2 = Connectivity[iElem][1]
      var fact = amplitude * Math.sin(Modes[iMode].omega * time)
      // NOTE: Coord conversion OpenFAST to Three:  x=-yOF, y=zOF, z=-xOF
      var P1 = new THREE.Vector3(-Nodes[i1][1] - Modes[iMode].Displ[i1][1]*fact, Nodes[i1][2] + Modes[iMode].Displ[i1][2]*fact, -Nodes[i1][0] - Modes[iMode].Displ[i1][0]*fact)
      var P2 = new THREE.Vector3(-Nodes[i2][1] - Modes[iMode].Displ[i2][1]*fact, Nodes[i2][2] + Modes[iMode].Displ[i2][2]*fact, -Nodes[i2][0] - Modes[iMode].Displ[i2][0]*fact)
      var arr = segmentOrient(P1,P2);
      Elems[iElem].setRotationFromMatrix(arr[0])
      Elems[iElem].position.set(arr[1].x, arr[1].y, arr[1].z);
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
    var anim = document.getElementById("animate").checked
    if ( anim == animating ) { // should not happen
      return;
    }
    if ( anim ) {
    	startAnimation();
        console.log('Start animation');
    }
    else {
    	pauseAnimation();
        console.log('puase Animation');
    }
}
function setDt() { 
    //console.log('dt '+document.getElementById('set-dt').value)
    dt = parseFloat(document.getElementById('set-dt').value);
    dt /= 2;
}
function setAmplitude() { 
    //console.log('amplitude '+document.getElementById('set-ampl').value)
    amplitude = parseFloat(document.getElementById('set-ampl').value);
}


//----------------------- show/hide elements -------------------------------
function showHide(elem, elem_name) {
    if (document.getElementById(elem_name).checked) {
    	elem.visible=true;
        //console.log('Show '+elem_name);
    }
    else {
    	elem.visible=false;
        //console.log('Hide '+elem_name);
    }
    render();
}
function showSeaLevel() { 
    showHide(swl,'show-sealevel');
}
function showSeaBed()   { 
    showHide(grd,'show-seabed'); 
}
function showAxes()   { 
    showHide(axes,'show-axes'); 
}
//----------------------- respond to window resizing -------------------------------

/* When the window is resized, we need to adjust the aspect ratio of the camera.
 * We also need to reset the size of the canvas that used by the renderer to
 * match the new size of the window.
 */
 function doResize() {
     var width  = window.innerWidth*1.0;
     var height = window.innerHeight*0.7;
     if (camera) {
         camera.aspect = width/ height;
         camera.updateProjectionMatrix(); // Need to call this for the change in aspect to take effect.
     }
     renderer.setSize(width, height);
     console.log('canvas size',canvas.width,canvas.height)
     console.log('window size',width,height)
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

        // Create scene, camera, light
        createBasicWorld();
        doResize()

        // --- GUI and Callbacks
        //document.getElementById("DEBUG").innerHTML = 'Hello' ;
        document.getElementById("animate").checked = true;
        document.getElementById("animate").onchange = doAnimationCheckbox;
        document.getElementById("show-sealevel").checked = false;
        document.getElementById("show-sealevel").onchange = showSeaLevel;
        document.getElementById("show-seabed").checked = false;
        document.getElementById("show-seabed").onchange = showSeaBed;
        document.getElementById("show-axes").checked = true;
        document.getElementById("show-axes").onchange = showAxes;
        document.getElementById("set-dt").onchange = setDt;
        document.getElementById("set-ampl").onchange = setAmplitude;

        // --- Install model
        var input_file = getQueryVariable("load");
        if (input_file){
            console.log('input_file:',input_file);
            jsonToObjects(input_file);
        } else {
            input_file ='my_data.json';
            jsonToObjects(input_file);
        };

    }
    catch (e) {
        document.body.innerHTML = "<h3><b>Sorry, an error occurred:<br>" + e + "</b></h3>";
	}



}

