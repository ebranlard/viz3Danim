import * as THREE from            './three.module.js';
import { TrackballControls } from './TrackballControlsModule.js';
import { GUI }               from './dat.gui.module.js';
import * as PLT              from './helpers3D.js';
import * as WEB              from './helpersWEB.js';

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

// --- FEM / JSON data for mode shapes
var nElem,  Elems, Props ;  // Elements and ElementProperties
var nNodes, Nodes ;  // Nodes
var Connectivity  ;  // Connectivity mapping
var iMode, Modes, Displ;  // Modes data
var groundLevel;






/** */
function createBasicWorld() {
    renderer.setClearColor( 0 );  // black background
    scene   = new THREE.Scene();
}

/** Create main World objects from a parsed Jason input **/
function createWorldFromJSONStream(Jstream) {
       //console.log('AJ',AJ)
    try{
        var AJ = JSON.parse(Jstream);
        console.log(AJ);
    } catch (e) {
        console.log(e);
        documentAlert('Error parsing JSON stream: ' + e );
        return;
    }
    try{
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
           var arr = PLT.cylinderBetweenPoints(P1, P2, R, R, color);
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
        // --- Estimate scene extent
        extent = PLT.getExtent(scene);
        /* */
        var box_geo = new THREE.BoxGeometry(extent.maxDim*1.5,extent.maxDim*1.5,extent.maxDim*1.5);
        /* Create and add a wireframe cube to the scene, to show the edges of the cube. */
        var edgeGeometry = new THREE.EdgesGeometry(box_geo);  // contains edges of cube without diagonal edges
        box = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({color:0xffffff}));
        box.position.set(extent.centerX,extent.centerY, extent.centerZ)
        scene.add(box);
 
        /* Add planes*/
        swl = PLT.createSeaLevelObject(extent.maxDim);
        scene.add(swl)
        grd = PLT.createSeaBedObject(extent.maxDim, groundLevel);
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

    } catch (e) {
        console.log(e);
        documentAlert('Error parsing JSON stream: ' + e );
        return;
    }
}

function changeCamera(){
    params.orthographicCamera = document.getElementById('parallel-proj').checked;
    createControls( params.orthographicCamera ? orthographicCamera : perspectiveCamera );
}
/* Crete camera, light and view controls */
function createCamera(){
    params.orthographicCamera = document.getElementById('parallel-proj').checked;

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
    frustumSize = extent.maxDim*2.0
    orthographicCamera = new THREE.OrthographicCamera(
         -w/2+extent.centerX, w/2+extent.centerX,
        h/2+extent.centerY, -h/2+extent.centerY, 
        -extent.maxDim*50, 
        extent.maxDim*50);
     orthographicCamera.position.set(extent.centerX, extent.centerY + extent.maxDim*0.1, extent.centerZ + extent.maxDim*5);

     perspectiveCamera  = new THREE.PerspectiveCamera(40, canvas.width/canvas.height, extent.maxDim*0.005, extent.maxDim*50);
     perspectiveCamera.position.set(extent.centerX, extent.centerY + extent.maxDim*0.1, extent.centerZ + extent.maxDim*5);
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    //camera.lookAt(scene.position); //camera.lookAt(new THREE.Vector3(0,0,0));
    camera.lookAt(new THREE.Vector3(extent.centerX,extent.centerY,extent.centerZ));
    scene.add(camera);

    // light
    light   = new THREE.DirectionalLight();
    light.position.set(0,extent.maxDim*1.5,extent.maxDim*1.5);
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
/* Adjust camera and canva size after resize */
 function onWindowResize() {
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


/** Render the scene adter object update  */
function render() {
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    renderer.render(scene, camera);
}

/**/
function enableGUI() {
    onWindowResize();

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
   //dt = 0.03;
   //console.log('>>> Plotting scene for time',time, 'amplitude',amplitude,'dt',dt)
   for (var iElem = 0; iElem < nElem; iElem++) {
      var i1 = Connectivity[iElem][0]
      var i2 = Connectivity[iElem][1]
      var fact = amplitude * Math.sin(Modes[iMode].omega * time)
      // NOTE: Coord conversion OpenFAST to Three:  x=-yOF, y=zOF, z=-xOF
      var P1 = new THREE.Vector3(-Nodes[i1][1] - Modes[iMode].Displ[i1][1]*fact, Nodes[i1][2] + Modes[iMode].Displ[i1][2]*fact, -Nodes[i1][0] - Modes[iMode].Displ[i1][0]*fact)
      var P2 = new THREE.Vector3(-Nodes[i2][1] - Modes[iMode].Displ[i2][1]*fact, Nodes[i2][2] + Modes[iMode].Displ[i2][2]*fact, -Nodes[i2][0] - Modes[iMode].Displ[i2][0]*fact)
      var arr = PLT.segmentOrient(P1,P2);
      Elems[iElem].setRotationFromMatrix(arr[0])
      Elems[iElem].position.set(arr[1].x, arr[1].y, arr[1].z);
   }
   controls.update();
   render();

}

//--------------------------- animation support -----------------------------------
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
/* Load button action*/
function onLoad(){
    WEB.loadFileWithCallBack('.json', createWorldFromJSONStream)
}

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

function documentAlert(message){
    document.getElementById('info-holder').innerHTML += '<h3 style="color:#f00000;"> '+message+'</h3>'
}

/** Main initialization */
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
    // Setup the drag and drop listeners.
    var dropZone = document.getElementsByTagName('body')[0];
    dropZone.addEventListener('dragover', WEB.handleDragOver, false);
    dropZone.addEventListener('drop'    , function(e){WEB.handleDropReader(e,createWorldFromJSONStream)}, false);

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

        window.addEventListener("resize", onWindowResize, false);  // Set up handler for resize event
        onWindowResize()

        // Create scene
        createBasicWorld();

        // --- If local file is provided, load and install model 
        var local_file = WEB.getQueryVariable("load");
        if (local_file){
            console.log('Loading local file: ',local_file);
            WEB.loadJSONcallback(local_file, function(s) {createWorldFromJSONStream(s)})
        } else {
            if (window.File && window.FileReader && window.FileList && window.Blob) {
                document.getElementById("mode-selection").innerHTML = "<h3 style='color: #ff0000;'><b>Load a json file: drag and drop it anywhere, or use the load button. </b></h3>";
            }else{
                document.getElementById("mode-selection").innerHTML = "<h3 style='color: #ff0000;'><b>Load a json file using the load button. </b></h3>";
            }
        };
    }
    catch (e) {
        console.log(e);
        documentAlert(' A javascript error occured: ' + e );
    }
}

export { init };
