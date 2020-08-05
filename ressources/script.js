import * as THREE from            './three.module.js';
import { TrackballControls } from './TrackballControlsModule.js';
import { GUI }               from './dat.gui.module.js';

// --- GUI data
var renderer, scene, light;   // Three.js rendering basics.
var perspectiveCamera, orthographicCamera;
var params = {
    orthographicCamera: false
};
var canvas;   // The canvas on which the renderer will draw.
var controls; // an object of type TrackballControls, the handles rotation using the mouse.
var frustumSize

// --- GUI objects
var swl, grd ; // Main WT elements
var axes     ; // Axes
var box     ; // Surrounding box
var extent

// --- Misc data
var animating = true; // Animates or not
var dt =0.03 ;        // Time step
var time =0 ;         
var amplitude = 1.0 ;  // Amplitude of modes
var input_file ;

// --- FEM / JSON data for mode shapes
var nElem,  Elems, Props ;  // Elements and ElementProperties
var nNodes, Nodes ;  // Nodes
var Connectivity  ;  // Connectivity mapping
var iMode, Modes, Displ;  // Modes data
var groundLevel;


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

    // --- Create sphre end points for debug
    //var s1_geo = new THREE.SphereGeometry(R1, 16, 16, 0, 2*Math.PI);
    //var s2_geo = new THREE.SphereGeometry(R2, 16, 16, 0, 2*Math.PI);
    //var s1_mat = new THREE.MeshBasicMaterial({color:'white'})
    //var s2_mat = new THREE.MeshBasicMaterial({color:'red'  })
    //var s1     = new THREE.Mesh( s1_geo, s1_mat );
    //var s2     = new THREE.Mesh( s2_geo, s2_mat );
    //s1.position.set(P1.x,P1.y,P1.z);
    //s2.position.set(P2.x,P2.y,P2.z);
    var s1, s2
    
    var arr = segmentOrient(P1, P2);

    var cyl_geo = new THREE.CylinderGeometry(R2, R1, 2*arr[2], 20, 2, false)
    //var cyl_mat = new THREE.MeshBasicMaterial( {color: color} );
    var cyl_mat = new THREE.MeshPhongMaterial(
        {color: color,
        shininess: 60
        } 
    );
    var cyl     = new THREE.Mesh( cyl_geo, cyl_mat );
    cyl.applyMatrix4(arr[0])
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

// --------------------------------------------------------------------------------}
// --- JSON/FILE DROP 
// --------------------------------------------------------------------------------{
if (window.File && window.FileReader && window.FileList && window.Blob) {
  // Great success!
  function handleJSONDrop(evt) {
      console.log('>>>>>>>>>>>>> DROP')
    evt.stopPropagation();
    evt.preventDefault();
    var files = evt.dataTransfer.files;
      // Loop through the FileList and read
      for (var i = 0, f; f = files[i]; i++) {
  
        // Only process json files.
          if (!f.type.match('application/json')) {
          continue;
        }
  
        var reader = new FileReader();
        // Closure to capture the file information.
        reader.onload = (function(theFile) {
          return function(e) {
            var AJ = JSON.parse(e.target.result);
            console.log(AJ);
            createWorldFromJSON(AJ);
          };
        })(f);
  
        reader.readAsText(f);
      }
  }

  function handleDragOver(evt) {
      console.log('>>>>>>>>>>>>> DRAG OVER')
    evt.stopPropagation();
    evt.preventDefault();
    evt.dataTransfer.dropEffect = 'copy'; // Explicitly show this is a copy.
  }

  // Setup the dnd listeners.
  var dropZone = document.getElementsByTagName('body')[0];
  dropZone.addEventListener('dragover', handleDragOver, false);
  dropZone.addEventListener('drop', handleJSONDrop, false);
  

} else {
  alert('The File APIs are not fully supported in this browser.');
}

function loadJSONcallback(AJ, filename, callback) {   
    var xobj = new XMLHttpRequest();
        xobj.overrideMimeType("application/json");
    //var filename_new=filename+'?t='+Date.now();
    var filename_new=filename;
    xobj.open('GET', filename_new, true); // Replace 'my_data' with the path to your file

    xobj.onreadystatechange = function () {
        if (xobj.readyState == 4) {
            if (xobj.status === 404) {
                // do something
                alert('The json file was not found: '+filename);
            }
            if (xobj.status == "200") {
                return callback(xobj.responseText, AJ);
            }
        }
    };
    xobj.send(null);  
}
/* Load object from json file to scene
 * NOTE: this is an async method, and thus there is no way to return something
 * */
function jsonToObjects(filename){
    var AJ ;
    loadJSONcallback(AJ, filename, function(response, AJ) {
       // Parse JSON string into object
       try {
           AJ = JSON.parse(response);
           createWorldFromJSON(AJ);
        }
        catch (e) { 
            alert('Error parsing JSON file: '+e)
            return;
        }
     });
}

function readSingleFile(e) {
  var f = e.target.files[0];
  if (!f) {
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    var AJ = JSON.parse(e.target.result);
    console.log(AJ);
    createWorldFromJSON(AJ);
  };
//     reader.onload = (function(theFile) {
//       return function(e) {
//         var AJ = JSON.parse(e.target.result);
//         console.log(AJ);
//         createWorldFromJSON(AJ);
//       };
//     })(f);

  reader.readAsText(f);
}

function onLoad(){
    var input = document.createElement('input');
    input.type = 'file';
    input.accept='.json';
    input.addEventListener('change', readSingleFile, false);
//     input.onchange = e => { 
//         debugger;
//        input_file = e.target.files[0].name; 
//        console.log(e)
//        console.log('input_file:',input_file);
//        //jsonToObjects(input_file);
//     }
    input.click();
}




/** */
function createBasicWorld() {

    renderer.setClearColor( 0 );  // black background
    scene   = new THREE.Scene();
}

/** Create main World objects from a parsed Jason input **/
function createWorldFromJSON(AJ) {
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
        Nodes        = AJ.Nodes       ;
        Modes        = AJ.Modes       ;
        Props        = AJ.ElemProps   ;
        Connectivity = AJ.Connectivity;
        groundLevel  = AJ.groundLevel;
        nNodes = Nodes.length;
        nElem  = Props.length;
        Elems = new Array(nElem); 

       // Clean scene
       while(scene.children.length > 0){ 
            scene.remove(scene.children[0]); 
       }
       // Add FEM Nodes/Elements
       for (var iElem = 0; iElem < nElem; iElem++) {
          var i1 = Connectivity[iElem][0]
          var i2 = Connectivity[iElem][1]
          // NOTE: Coord conversion OpenFAST to Three:  x=-yOF, y=zOF, z=-xOF
          var P1 = new THREE.Vector3(-Nodes[i1][1], Nodes[i1][2], -Nodes[i1][0])
          var P2 = new THREE.Vector3(-Nodes[i2][1], Nodes[i2][2], -Nodes[i2][0])
          //console.log('Adding cylinder:',P1, P2, Props[iElem].Diam)
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
           labels+='<label style="margin-left: 2px"><input type="radio" name="mode" id="'+i+'"'
           if (i==0){
               iMode =i // We select the first mode
               labels+=' checked="checked"';
           }
           labels+='/>'+Modes[i].name+'</label>';
       }
       pp.innerHTML=labels
       pp.children;
       for (var i = 0; i < pp.children.length; i++) {
           pp.children[i].onclick = modeSelect;
       }
       modelLoaded();
}


/** **/
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
            color: 0x95550f,
            transparent: true,
            opacity: 0.8,
            side: THREE.DoubleSide
    });

    var grd= new THREE.Mesh( grd_geo, grd_mat );
    grd.rotation.set(Math.PI/2,0,0);
    grd.geometry.translate(0,0,-depth);
    return grd;
}


function modelLoaded() {
    // --- Estimate scene extent
    extent = getExtent();

    /* */
    var box_geo = new THREE.BoxGeometry(extent.maxDim*1.5,extent.maxDim*1.5,extent.maxDim*1.5);
    /* Create and add a wireframe cube to the scene, to show the edges of the cube. */
    var edgeGeometry = new THREE.EdgesGeometry(box_geo);  // contains edges of cube without diagonal edges
    box = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({color:0xffffff}));
    box.position.set(extent.centerX,extent.centerY, extent.centerZ)
    scene.add(box);

    /* Add planes*/
    swl = createSeaLevelObject(extent.maxDim);
    scene.add(swl)
    grd = createSeaBedObject(extent.maxDim, groundLevel);
    scene.add(grd)

    // --- Defining light and camera position
    createCamera();

    // --- Axis helper
    axes = new THREE.AxesHelper( extent.maxDim/2 );
    axes.rotation.set(-Math.PI/2,0,Math.PI/2);
    scene.add( axes );

    // --- Controls depend on camera
    enableGUI() ;
    setupKeyboardControls();
}

/** 
    Reset controls view
*/

function getOrthoViewport(viewangle){
    // Canva info, we need to respect the AR
    var width = canvas.width;
    var height = canvas.height;
    var AR = width/height;
    if (viewangle=="x"){
    }
}

function changeCamera(){
    params.orthographicCamera = document.getElementById('parallel-proj').checked;
    createControls( params.orthographicCamera ? orthographicCamera : perspectiveCamera );
}


/* Crete camera, light and view controls */
function createCamera(){
    params.orthographicCamera = document.getElementById('parallel-proj').checked;
    //params.orthographicCamera = false;

    var width = canvas.width;
    var height = canvas.height;
    var AR = width/height;
    if (AR >1 ) {
        var h = extent.maxDim*2.0;
        var w = h*AR;
    }else{
        var w = extent.maxDim*2.0;
        var h = w/AR;
    }

    //orthographicCamera = new THREE.OrthographicCamera( frustumSize * aspect / - 2, frustumSize * aspect / 2, frustumSize / 2, frustumSize / - 2, 1, 1000 );
    frustumSize = extent.maxDim*2.0
    orthographicCamera = new THREE.OrthographicCamera(
         -w/2+extent.centerX, w/2+extent.centerX,
        h/2+extent.centerY, -h/2+extent.centerY, 
        -extent.maxDim*50, 
        extent.maxDim*50);
        //_viewport.left, _viewport.right, _viewport.top, _viewport.bottom, _viewport.near, _viewport.far )
     orthographicCamera.position.set(extent.centerX, extent.centerY + extent.maxDim*0.1, extent.centerZ + extent.maxDim*5);

     perspectiveCamera  = new THREE.PerspectiveCamera(40, canvas.width/canvas.height, extent.maxDim*0.005, extent.maxDim*50);
     perspectiveCamera.position.set(extent.centerX, extent.centerY + extent.maxDim*0.1, extent.centerZ + extent.maxDim*5);
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    //camera.lookAt(scene.position); //camera.lookAt(new THREE.Vector3(0,0,0));
    camera.lookAt(new THREE.Vector3(extent.centerX,extent.centerY,extent.centerZ));
    scene.add(camera);

    // light
    light   = new THREE.DirectionalLight();
    light.position.set(0,extent.maxDim*4,extent.maxDim*4);
	camera.add(light);

    // Trackball controls
    createControls(camera);
}


function resetControls() {
    controls.reset();
    if (!animating) {
      plotSceneAtTime();
    }
}
// OpenFAST "-x" view is three z view
function xView() {
    controls.reset();
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    camera.position.set(extent.centerX,extent.centerY*0,extent.maxDim*3);
    camera.updateProjectionMatrix();
    if (!animating) {
      plotSceneAtTime();
    }
}

// OpenFAST "y" view is three -x view
function yView() {
    controls.reset();
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    camera.position.set(-extent.maxDim*3,extent.centerY*0,extent.centerZ);
    camera.updateProjectionMatrix();
    if (!animating) {
      plotSceneAtTime();
    }
}

// OpenFAST "z" view is three y view
function zView() {
    controls.reset();
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    camera.position.set(0.0000, extent.maxDim*3,extent.centerZ+0.0001); // NOTE: rotation matrix sensitive
    camera.updateProjectionMatrix();
    if (!animating) {
      plotSceneAtTime();
    }
}

//----------------------- respond to window resizing -------------------------------
/* When the window is resized, we need to adjust the aspect ratio of the camera.
 * We also need to reset the size of the canvas that used by the renderer to
 * match the new size of the window.
 */
 function doResize() {
     var width  = window.innerWidth*1.0;
     var height = window.innerHeight*0.8;
     renderer.setSize(width, height);
     if (perspectiveCamera) {
        var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
        var aspect = width/ height;

        perspectiveCamera.aspect = width/ height;
        perspectiveCamera.updateProjectionMatrix(); // Need to call this for the change in aspect to take effect.

        orthographicCamera.left   = - frustumSize * aspect / 2;
        orthographicCamera.right  =   frustumSize * aspect / 2;
        orthographicCamera.top    =   frustumSize / 2;
        orthographicCamera.bottom = - frustumSize / 2;
        orthographicCamera.updateProjectionMatrix();

        controls.handleResize();
     }
 }

/* Create mouse camera controller */
function createControls(camera) {
    if (controls) {
        controls.dispose();
    }
    controls = new TrackballControls(camera, canvas);  // note: TrackballControls require animation.
    controls.noPan = false;   // Don't do panning with the right mosue button.
    controls.noZoom = false;  // Don't do zooming with middle mouse button.
    //controls.staticMoving = true;
    controls.panSpeed = 0.3; // default 0.3
    controls.zoomSpeed = 1.8; //default  1.2
    controls.rotateSpeed = 1.3; //default  1.0

    // --- Listeners when animation is disabled
    function move() {
        controls.update();
		if (!animating) {
			render();
		}
    }
    function zoom() {
        move();
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
    canvas.addEventListener("wheel", zoom, false);
}

/* Key bindings/shortcuts */
function setupKeyboardControls() {
  document.onkeydown = function(e) {
    switch (e.keyCode) {
      case 65: // 'a' increae amplitude
          setAmplitudeFromJS( amplitude + 0.1*amplitude);
          break;
      case 68: // 'd' decrease amplidue
          setAmplitudeFromJS( amplitude - 0.1*amplitude);
          break;
      case 83: // 's' slow down
          setDtFromJS(dt - 0.1*dt);
          break;
      case 87: // 'w' incease speed
          setDtFromJS(dt + 0.1*dt);
          break;
    }
  };
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
        extentX:0,
        extentY:0,
        extentZ:0,
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
    e.extentX =  e.xmax-e.xmin;
    e.extentY =  e.ymax-e.ymin;
    e.extentZ =  e.zmax-e.zmin;
    e.maxDim = Math.max( e.extentX, e.maxDim);
    e.maxDim = Math.max( e.extentY, e.maxDim);
    e.maxDim = Math.max( e.extentZ, e.maxDim);
    e.max = Math.max(e.centerX - e.xmin, e.xmax - e.centerX);
    e.max = Math.max(e.max, Math.max(e.centerY - e.ymin, e.ymax - e.centerY) );
    e.max = Math.max(e.max, Math.max(e.centerZ - e.zmin, e.zmax - e.centerZ) );
    e.scale = 10/e.max;

    //if (window.console) {
    //       console.log("Get Extent, scale: " + e.scale, 'Max dim:', e.maxDim, 'Max rad',e.max);
    //       console.log("Extent at ( ("+e.xmin+","+e.xmax+"), ("+e.ymin+","+e.ymax+"), ("+e.zmin+","+e.zmax+") )");
    //       console.log("Center at ( " + e.centerX + ", " + e.centerY + ", " + e.centerZ + " )");
    //       console.log(e);
    //}
    return e;
}


/**
 *  Render the scene.  This is called for each frame of the animation, after updating
 *  the position and velocity data of the balls.
 */
function render() {
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    renderer.render(scene, camera);
}

/**/
function enableGUI() {
    doResize();

    // Default options
    //animating = true; // Animates or not
    time =0 ;         
    setDtFromJS(0.03) ;        // Time step
    setAmplitudeFromJS(1.0) ;  // Amplitude of modes
    setDt();
    setAmplitudeFromSlider();
    showSeaLevel();
    showSeaBed();
    showAxes();
    showBox();

    //var gui = new GUI();
    //gui.add( params, 'orthographicCamera' ).name('Parrallel projection').onChange( function ( value ) {
    //    createControls( value ? orthographicCamera : perspectiveCamera );
    //} );

    // --- Animate
    requestAnimationFrame(doFrame);  // Start the animation.
    //render();
}

/**/
function disableGUI() {

}

/** */
function plotSceneAtTime() { 
   //var dt = clock.getDelta();  // time since last update
   //dt = 0.03;
   //console.log('>>> Plotting scene for time',time, 'amplitude',amplitude,'dt',dt)
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
   controls.update();
   render();

}


//--------------------------- animation support -----------------------------------

var clock;  // Keeps track of elapsed time of animation.

function doFrame() {
    if (animating) {
        time=time+dt;
        plotSceneAtTime();
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
    //var anim = document.getElementById("animate").checked
    var animID = document.querySelector('input[name="anim"]:checked').id;
    if ( animID=='animate' ) {
    	startAnimation();
    }
    else {
    	pauseAnimation();
        if ( animID=='disp' ) {
           time = Math.PI/(2*Modes[iMode].omega);
        }else{
           time=0;
        }
        plotSceneAtTime();
    }
}
function setDt() { 
    dt = parseFloat(document.getElementById('set-dt').value);
    dt /= 2;
}
function setAmplitudeFromSlider() { 
    amplitude = parseFloat(document.getElementById('set-ampl').value);
    if (!animating) {
      plotSceneAtTime();
    }
}
function setAmplitudeFromJS(ampl_in) { 
    // Set global variable
    amplitude = Math.max(Math.min(ampl_in, 10),0.001) ;
    // set HTML element
    document.getElementById('set-ampl').value=amplitude;
    // replot scene
    if (!animating) {
      plotSceneAtTime();
    }
}
function setDtFromJS(dt_in) { 
    // Set global variable
    dt = Math.max(Math.min(dt_in, 10),0.0001) ;
    // set HTML element
    document.getElementById('set-dt').value=dt;
}


//----------------------- show/hide elements -------------------------------
function showHide(elem, elem_name) {
    if (document.getElementById(elem_name).checked) {
    	elem.visible=true;
    }
    else {
    	elem.visible=false;
    }
    render();
}
function showSeaLevel(){ showHide(swl,'show-sealevel'); }
function showSeaBed()  { showHide(grd,'show-seabed'); }
function showAxes()    { showHide(axes,'show-axes'); }
function showBox()     { showHide(box,'show-box'); }

function modeSelect(){
    iMode = parseInt(document.querySelector('input[name="mode"]:checked').id);
    if (!animating) {
        var animID = document.querySelector('input[name="anim"]:checked').id;
        if ( animID=='disp' ) {
            time = Math.PI/(2*Modes[iMode].omega);
        }else{
            time=0;
        }
        plotSceneAtTime();
    }
    else{
        time = 0;
    }
}
//----------------------------------------------------------------------------------
function showHelp() {
    alert('General:\n \
 - Load an existing json file (load button or drag and drop)\n \
 - Chose Animation, View and Mode options \n \
 - The "z" axis is blue, the "x" axis is red \n\n \
Keyboard shortcuts:\n \
 - "a", "d" : increase/decrease amplitude\n \
 - "w", "s" : speedup/slowdown period\n \
 - "Mouse Wheel": zoom\n \
 - "Right Mouse": rotate - "Left Mouse": pan \n \
     ');
}



/**
 *  This init() function is called when by the onload event when the document has loaded.
 */
function init() {
    // --- GUI and Callbacks
    //document.getElementById("DEBUG").innerHTML = 'Hello' ;
    document.getElementById("animate").checked = animating;
    document.getElementById("animate").onchange = doAnimationCheckbox;
    document.getElementById("disp").checked = false;
    document.getElementById("disp").onchange = doAnimationCheckbox;
    document.getElementById("undisp").checked = false;
    document.getElementById("undisp").onchange = doAnimationCheckbox;

    document.getElementById("show-sealevel").checked = false;
    document.getElementById("show-sealevel").onchange = showSeaLevel;
    document.getElementById("show-seabed").checked = false;
    document.getElementById("show-seabed").onchange = showSeaBed;
    document.getElementById("show-axes").checked = true;
    document.getElementById("show-axes").onchange = showAxes;
    document.getElementById("show-box").checked = true;
    document.getElementById("show-box").onchange = showBox;
    document.getElementById("parallel-proj").checked = false;
    document.getElementById("parallel-proj").onchange = changeCamera;
    document.getElementById("set-dt").onchange = setDt;
    document.getElementById("set-ampl").onchange = setAmplitudeFromSlider;
    document.getElementById("xView").onclick = xView;
    document.getElementById("yView").onclick = yView;
    document.getElementById("zView").onclick = zView;
    document.getElementById("reset").onclick = resetControls;
    document.getElementById("bt-load").onclick = onLoad;
    document.getElementById("bt-help").onclick = showHelp;

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
        //renderer.setPixelRatio( window.devicePixelRatio );
        //document.body.appendChild(canvas);  // The canvas must be added to the body of the page.

        window.addEventListener("resize", doResize, false);  // Set up handler for resize event
        doResize()
        clock = new THREE.Clock(); // For keeping time during the animation.

        // Create scene, camera, light
        createBasicWorld();


        // --- Install model
        var input_file = getQueryVariable("load");
        if (input_file){
            console.log('input_file:',input_file);
            jsonToObjects(input_file);
        } else {
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                document.getElementById("mode-selection").innerHTML = "<h3 style='color: #ff0000;'><b>Load a json file: drag and drop it anywhere, or use the load button. </b></h3>";
            }else{
                document.getElementById("mode-selection").innerHTML = "<h3 style='color: #ff0000;'><b>Load a json file using the load button. </b></h3>";
            }
            //input_file ='my_data.json';
            //jsonToObjects(input_file);
        };
    }
    catch (e) {
        document.body.innerHTML = "<h3 style='color: #ff0000;><b>Sorry, an error occurred:<br>" + e + "</b></h3>";
	}



}

export { init };
