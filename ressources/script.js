import * as THREE from            './three.module.js';
import { TrackballControls } from './TrackballControlsModule.js';
import { GUI }               from './dat.gui.module.js';
import * as TOOLS            from './helpersJS.js';
import * as PLT              from './helpers3D.js';
import * as WEB              from './helpersWEB.js';

// --- GUI data
var renderer, scene;   // Three.js rendering basics.
var perspectiveCamera, orthographicCamera;
var defaultTarget;   // The target for the scene (where camera look at), typically center of scene
var canvas;   // The canvas on which the renderer will draw.
var controls; // an object of type TrackballControls, the handles rotation using the mouse.
var gui, guiTop, MainMenu; // Menu
var menuAnim; // Menu
var frustumSize
var windowWidth, windowHeight;
var slider;

// --- Script data
var params = {
    orthographicCamera: false, // Use parallel projection
    animating: false, // animating
    dt:  0.2, // dimensionless time step NOTE: init value set in enableGUI using _default value
    t_bar: 0, // dimensionless time (between 0 and 1, based on tMin and tMax)
    tMin: 0, //  min time
    tMax: 1, //  max time
    amplitude: 1.0, // amplitude NOTE: init value set in enableGUI using _default value
    animID: "None",
    showBox: true, 
    showAxes: true, 
    showSeaBed: false, 
    showSeaLevel: false, 
    showThreeViews: false, 
};
var dt_min     = 0.0001;
var dt_max     = 0.5   ;
var dt_default = 0.2   ;
var A_min      = 0.0001;
var A_max      = 10    ;
var A_default  = 1     ;


// --- 3D objects
var swl, grd ; // Main WT elements
var axes     ; // Axes
var box     ; // Surrounding box
var extent

// --- FEM / JSON data
var timeArray;
var nElem,  Elems, Props ;  // Elements and ElementProperties
var nNodes, Nodes ;  // Nodes
var Connectivity  ;  // Connectivity mapping
var keyMode, iMode, Modes;  // Modes data
var keyTS, iTS, TimeSeries;      // Time series data
var iPlot=0;      // Switch between kind of plots iPlot=0: None, iPlot=1: Modes, iPlot=2: TimeSeries
var groundLevel;

var vsplit=0.3
var hsplit=0.333333


var defaultView =  {
        left: 0,
        bottom: 0, 
        width: 1.0,
        height: 1.0,
        background: new THREE.Color( 0.0, 0.0, 0.0 ),
    };

var views = [
    {
        left: 0,
        bottom: vsplit, 
        width: 1.0,
        height: 1.0-vsplit,
        //background: new THREE.Color( 0.5, 0.5, 0.7 ),
        background: new THREE.Color( 0.0, 0.0, 0.0 ),
    },
    {
        left: 0.0,
        bottom: 0,
        width: hsplit,
        height: vsplit,
        //background: new THREE.Color( 0.7, 0.5, 0.5 ),
        background: new THREE.Color( 0.0, 0.0, 0.0 ),
    },
    {
        left: hsplit,
        bottom: 0,
        width:  hsplit,
        height: vsplit,
        //background: new THREE.Color( 0.5, 0.7, 0.7 ),
        background: new THREE.Color( 0.0, 0.0, 0.0 ),
    },
    {
        left: 2*hsplit,
        bottom: 0,
        width: hsplit,
        height: vsplit,
        background: new THREE.Color( 0.0, 0.0, 0.0 ),
    }
];

/** */
function createBasicWorld() {
    renderer.setClearColor( 0 );  // black background
    scene   = new THREE.Scene();
}

/** Create main World objects from a parsed Jason input **/
function createWorldFromJSONStream(Jstream) {
    console.log('Creating World From JSON');
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
        TimeSeries   = AJ.TimeSeries  ;
        if (TimeSeries == null) { TimeSeries = {} };
        if (Modes == null) { Modes = {} };
        if (typeof Modes.length === 'number') {
            console.log('>>> Legacy format for Modes detected')
            if (Modes.length>0){
                Modes = { default: Modes } 
            }
        }
        console.log('Mode keys: '      , Object.keys(Modes).length)
        console.log('TimeSeries keys: ', Object.keys(TimeSeries).length)



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
 

        // --- Creating HTML to select modes
        var pp= document.getElementById('mode-selection');
        var labels='';
        if (Object.keys(Modes).length==0) {
            labels='&nbsp;&nbsp;&nbsp;&nbsp;No modes in file.'
        } else {
            var j;
            j=0;
            for (var key in Modes){
                for (var i = 0; i < Modes[key].length; i++) {
                    labels+='<label class="radio"><input type="radio" name="mode" id="'+key+'_'+i+'"'
                    if (i==0 && j==0){ // We selct the first mode
                        labels+=' checked="checked"';
                    }
                    labels+='/>'+Modes[key][i].name+'</label>';
                }
                j+=1;
                if (j< Object.keys(Modes).length) {
                   labels+='<br>';
                }
            }
        }
        pp.innerHTML=labels
        pp.children;
        for (var i = 0; i < pp.children.length; i++) {
            pp.children[i].onclick = modeSelect;
        }

        // --- Creating HTML to select time series
        var pp= document.getElementById('time-series-selection');
        var labels='';
        if (Object.keys(TimeSeries).length==0) {
            labels='&nbsp;&nbsp;&nbsp;&nbsp;No time series in file.'
        } else {
            var j;
            j=0;
            for (var key in TimeSeries){
                for (var i = 0; i < TimeSeries[key].length; i++) {
                    labels+='<label class="radio"><input type="radio" name="timeSeries" id="'+key+'_'+i+'"'
                    if (i==0 && j==0){
                        labels+=' checked="checked"';
                    }
                    labels+='/>'+TimeSeries[key][i].name+'</label>';
                }
                j+=1;
            }
        }
        pp.innerHTML=labels
        pp.children;
        for (var i = 0; i < pp.children.length; i++) {
            pp.children[i].onclick = timeSeriesSelect;
        }


        // --- Estimate scene extent
        extent = PLT.getExtent(scene);
        /* */
        var box_geo = new THREE.BoxGeometry(extent.maxDim*1.5,extent.maxDim*1.5,extent.maxDim*1.5);
        /* Create and add a wireframe cube to the scene, to show the edges of the cube. */
        var edgeGeometry = new THREE.EdgesGeometry(box_geo);  // contains edges of cube without diagonal edges
        box = new THREE.LineSegments(edgeGeometry, new THREE.LineBasicMaterial({color:0xffffff}));
        box.position.set(extent.centerX, extent.centerY, extent.centerZ)
        //box.position.set(0,0,0);
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
 

        // --- Possibly start animating
        if (Object.keys(Modes).length > 0) {
            iPlot=1;
            params.animating=true;
            params.animID="Loop";
            !jQuery( "#playLooped" ).prop( "checked", true);
            modeSelect();
            //menuAnim.show();
        } else if (Object.keys(TimeSeries).length >0 ) {
            iPlot=2;
            params.animID="Loop";
            !jQuery( "#playLooped" ).prop( "checked", true);
            timeSeriesSelect();
        } else {
            iPlot=0;
            params.animID="None";
            !jQuery( "#playLooped" ).prop( "checked", false);
            stopAnimation();
        }

        // --- Controls depend on camera
        enableGUI() ; // Will start animation if animating
        setupKeyboardControls();


    } catch (e) {
        console.log(e);
        documentAlert('Error parsing JSON stream: ' + e );
        return;
    }
}

function togglePerspective(){
    views[0].camera = params.orthographicCamera ? orthographicCamera : perspectiveCamera;
    createControls( views[0].camera )
    if (!params.animating) {
        plotSceneAtTime();
    }
}
/* Crete camera, light and view controls */
function createCamera(){
    var width  = windowWidth
    var height = windowHeight
    var AR = width/height;
    var h = height;
    var w = width;
    // Default target
    defaultTarget = new THREE.Vector3(extent.centerX, extent.centerY, extent.centerZ); 
//     if (AR >1 ) {
//         var h = extent.maxDim*2.0;
//         var w = h*AR;
//     }else{
//         var w = extent.maxDim*2.0;
//         var h = w/AR;
//     }
    frustumSize = extent.maxDim*2.0
    orthographicCamera = new THREE.OrthographicCamera(
         -w/2+extent.centerX,  w/2+extent.centerX,
          h/2+extent.centerY, -h/2+extent.centerY, 
        -extent.maxDim*50, 
        extent.maxDim*50);
    perspectiveCamera  = new THREE.PerspectiveCamera(40, windowWidth/windowHeight, extent.maxDim*0.005, extent.maxDim*50);


    // Default view
    perspectiveCamera  = camDefView(perspectiveCamera);
    orthographicCamera = camDefView(orthographicCamera);

    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    //scene.add(camera);
    views[0].camera = camera; 

    // Ambient light
    scene.add(new THREE.AmbientLight(0xFFFFFF, 0.5));
    // Main light
    const lightTop   = new THREE.DirectionalLight(0xffffff, 2.0);
    lightTop.position.set(0,extent.centerY + extent.maxDim*3,extent.maxDim);
	scene.add(lightTop);
    //     const helperTop = new THREE.DirectionalLightHelper(lightTop);
    //     scene.add(helperTop);
    //     const lightSea   = new THREE.DirectionalLight(0x3267ca, 2.8);
    //     const skyColor = 0xB1E1FF;  // light blue
    //     const groundColor = 0xB97A20;  // brownish orange
    //     var lightHemi = new THREE.HemisphereLight(skyColor, groundColor, 1);
    //     scene.add(lightHemi);

    // Trackball controls
    createControls(camera);
    // --- Create the 3 orthographic cameras
    // -x
    views[1].camera = orthographicCamera.clone();
    views[1].camera = camXView(views[1].camera);
    // y
    views[2].camera = orthographicCamera.clone();
    views[2].camera = camYView(views[2].camera);
    // z
    views[3].camera = orthographicCamera.clone();
    views[3].camera = camZView(views[3].camera);
}
function toggleThreeViews(v){
    if (params.showThreeViews) {
        // pass
    } else {
        // Using default views
        //updateSize(); 
        var left   = Math.floor( windowWidth  * defaultView.left );
        var bottom = Math.floor( windowHeight * defaultView.bottom );
        var width  = Math.floor( windowWidth  * defaultView.width );
        var height = Math.floor( windowHeight * defaultView.height );
        renderer.setViewport( left, bottom, width, height );
        renderer.setScissor ( left, bottom, width, height );
        renderer.setScissorTest( true );
        renderer.setClearColor( defaultView.background );
        perspectiveCamera  = updatePerspCam(perspectiveCamera,  width, height);
        orthographicCamera = updateOrthoCam(orthographicCamera, width, height);
        controls.handleResize();
    }
    if (!params.animating) {
        plotSceneAtTime();
    }
}

function camDefView(camera){
    camera.position.set( extent.centerX, extent.centerY + extent.maxDim*0.1, extent.centerZ + extent.maxDim*5);
    camera.lookAt      (defaultTarget);
    camera.updateProjectionMatrix();
    return camera;
}
function camXView(camera){// OpenFAST "-x" view is three z view
    camera.position.set( extent.centerX, extent.centerY ,extent.centerZ + extent.maxDim*3);
    camera.lookAt      (defaultTarget);
    return camera;
}
function camYView(camera){// OpenFAST "y" view is three -x view
    camera.position.set( extent.centerX-extent.maxDim*3, extent.centerY, extent.centerZ);
    camera.lookAt      (defaultTarget);
    return camera;
}
function camZView(camera){ // OpenFAST "z" view is three y view // NOTE: rotation matrix sensitive
    camera.position.set( extent.centerX, extent.centerY+extent.maxDim*3, extent.centerZ+0.0001); 
    camera.lookAt      (defaultTarget);
    return camera;
}

function resetControls() {
    controls.reset();
    if (!params.animating) {
      plotSceneAtTime();
    }
}
// Setting Main camera to X,Y,or Z view
function xView() {
    controls.reset();
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    camera = camXView(camera);
    camera.updateProjectionMatrix();
    if (!params.animating) {
      plotSceneAtTime();
    }
}
function yView() {
    controls.reset();
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    camera = camYView(camera);
    camera.updateProjectionMatrix();
    if (!params.animating) {
      plotSceneAtTime();
    }
}
function zView() {
    controls.reset();
    var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
    camera = camZView(camera);
    camera.updateProjectionMatrix();
    if (!params.animating) {
      plotSceneAtTime();
    }
}

function getAvailableSpace(){
    //console.log('Window : ',window.innerWidth,window.innerHeight )
    //console.log('Canvas : ',canvas.width,canvas.height )
    //console.log('topRow : ', document.getElementById('topRow').offsetWidth, document.getElementById('topRow').offsetHeight)
    var width  = window.innerWidth ;
    var height = window.innerHeight- document.getElementById('topRow').offsetHeight;
    return [width,height]
}

function updateOrthoCam(camera, w, h){
    var aspect = w/h;
    camera.left   = - frustumSize * aspect / 2;
    camera.right  =   frustumSize * aspect / 2;
    camera.top    =   frustumSize / 2;
    camera.bottom = - frustumSize / 2;
    camera.updateProjectionMatrix();
    return camera;
}
function updatePerspCam(camera, w, h){
    var aspect = w/h;
    camera.aspect = aspect;
    camera.updateProjectionMatrix(); // Need to call this for the change in aspect to take effect.
    return camera
}

//----------------------- respond to window resizing -------------------------------
/* Adjust camera and canva size after resize */
 function onWindowResize() {
     var WH = getAvailableSpace();
     // Storing space size
     windowWidth  = WH[0];
     windowHeight = WH[1];
     // Update renderer
     renderer.setSize(WH[0], WH[1]);
     if (perspectiveCamera) {
         // Update camera aspect ratios
        perspectiveCamera  = updatePerspCam(perspectiveCamera,  WH[0], WH[1]);
        orthographicCamera = updateOrthoCam(orthographicCamera, WH[0], WH[1]);
        for ( var ii = 1; ii < views.length; ++ ii ) {             
            views[ii].camera = updateOrthoCam(views[ii].camera, WH[0], WH[1]);
        }
        controls.handleResize();
     }
 }

/* Create mouse camera controller */
function createControls(camera) {
    if (controls) {
        controls.dispose();
    }
    controls = new TrackballControls(camera, canvas, defaultTarget);  // note: TrackballControls require animation.
    controls.noPan = false;   // Don't do panning with the right mosue button.
    controls.noZoom = false;  // Don't do zooming with middle mouse button.
    //controls.staticMoving = true;
    controls.panSpeed = 0.3; // default 0.3
    controls.zoomSpeed = 1.8; //default  1.2
    controls.rotateSpeed = 1.3; //default  1.0

    // --- Listeners when animation is disabled
    function move() {
        controls.update();
		if (!params.animating) {
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
          setAmplitudeFromJS( params.amplitude + 0.1*params.amplitude);
          break;
      case 68: // 'd' decrease amplidue
          setAmplitudeFromJS( params.amplitude - 0.1*params.amplitude);
          break;
      case 83: // 's' slow down
          setDtFromJS(params.dt - 0.1*params.dt);
          break;
      case 87: // 'w' incease speed
          setDtFromJS(params.dt + 0.1*params.dt);
          break;
    }
  };
}

/** Render the scene adter object update  */
function render() {
    if (params.showThreeViews) {
        for ( var ii = 0; ii < views.length; ++ ii ) {
            var view = views[ ii ];
            var camera = view.camera;
            var left   = Math.floor( windowWidth  * view.left );
            var bottom = Math.floor( windowHeight * view.bottom );
            var width  = Math.floor( windowWidth  * view.width );
            var height = Math.floor( windowHeight * view.height );
            renderer.setViewport( left, bottom, width, height );
            renderer.setScissor( left, bottom, width, height );
            renderer.setScissorTest( true );
            renderer.setClearColor( view.background );
            if (ii==0) {
                if (params.orthographicCamera){
                    camera  = updateOrthoCam(camera, width, height);
                }else{
                    camera  = updatePerspCam(camera, width, height);
                }
                controls.handleResize();
            } else {
            }
            renderer.render( scene, camera );
        }
    } else {
        var camera = ( params.orthographicCamera ) ? orthographicCamera : perspectiveCamera;
        renderer.render(scene, camera);
    }
}

/**/
function enableGUI() {
    onWindowResize();

    // Default options
    //params.animating = true; // Animates or not
    params.t_bar =0 ;         
    setDtFromJS(dt_default) ;        // Time step
    setAmplitudeFromJS(A_default) ;  // Amplitude of modes
    showHide(params.showBox   ,   box);
    showHide(params.showAxes ,    axes);
    showHide(params.showSeaBed,   grd);
    showHide(params.showSeaLevel, swl);
    togglePerspective();

    // Show options, hide main menu
    gui.closed = false;
    MainMenu.close();

    // --- Animate
    startAnimation();
}

/**/
function disableGUI() {

}


function setupGUI(){

    GUI.DEFAULT_WIDTH = 165;
    GUI.TEXT_CLOSED = 'Close options';
    GUI.TEXT_OPEN   = 'Show options';

    // --- Top Menu
    guiTop = new GUI({autoPlace: false, width:90});
    MainMenu = guiTop.addFolder('Menu.', "a");
    MainMenu.add({ Load:onLoad}, 'Load').name('Load json');
    MainMenu.add({ Help:showHelp}, 'Help');
    document.getElementById('guiTopRow').appendChild(guiTop.domElement);

    // --- Option Menu (Top right)
    gui = new GUI({autoPlace: false, width: 165});
    var folder = gui.addFolder('Elements');
    folder.add(params, 'showBox'     ).name('Box'      ).onChange(function(v) {showHide(v,box)} ).listen();
    folder.add(params, 'showAxes'    ).name('Axes'     ).onChange(function(v) {showHide(v,axes)}).listen();
    folder.add(params, 'showSeaBed'  ).name('Sea bed  ').onChange(function(v) {showHide(v,grd)} ).listen();
    folder.add(params, 'showSeaLevel').name('Sea level').onChange(function(v) {showHide(v,swl)} ).listen();
    folder.open();

    var folder = gui.addFolder('View');
    //folder.add(params, 'showBox'     ).name('Box'      ).onChange(function(v) {showHide(v,box)} ).listen();
    folder.add({xView:xView}, 'xView').name('Front (-x)');
    folder.add({yView:yView}, 'yView').name('Side (y)');
    folder.add({zView:zView}, 'zView').name('Top (z)');
    folder.add({reset:resetControls}, 'reset').name('Reset');
    folder.add(params, 'orthographicCamera' ).name('Parallel projection').onChange(togglePerspective);
    folder.add(params, 'showThreeViews').name('2D views').onChange(toggleThreeViews).listen();
    folder.open();

    menuAnim = gui.addFolder('Mode shape animation');
    menuAnim.add(params,  'dt'       , dt_min, dt_max).name( 'Freq. (w/s)').listen()
    menuAnim.add(params,  'amplitude', A_min,  A_max).name( 'Ampl. (a/d)').listen().onChange(
        function(v){if(!params.animating){plotSceneAtTime();}}
    );
    menuAnim.add(params, 'animID', [ 'Loop', 'Jumps', 'Max', 'None' ] ).name('Displ. ').onChange(animationSwitch).listen();
    //     folder.add(settings, 'speed', { Low: 0, Med: 0.5, High: 1 } );
    menuAnim.open( );

    document.getElementById('guiTopRight').appendChild(gui.domElement);

    gui.closed = true;
    MainMenu.close();
}


/** */
function plotSceneAtTime() { 
    if ( params.animID=='Jumps' ) {
       var fact = Math.round((params.t_bar % 1))*2 -1
       fact = params.amplitude * fact;
    } else{
       var fact = params.amplitude * Math.sin(1.0 * params.t_bar * (2*Math.PI));
    }
    //console.log('Modes: '     , Modes);
    //console.log('TimeSeries: ', TimeSeries);
    //if(hasOwnProperty('field'))
    //{
    //    // Do something
    //}

    if (iPlot==0) {
        // --- Do nothing, plot fixed scene only
        console.log('iPlot: ', iPlot);

    } else if (iPlot==1) {
        //--- Plotting Modes based on Displacement field
        //console.log('>>> Plotting scene for time',time, 'amplitude',amplitude,'dt',dt)
        var Displ=Modes[keyMode][iMode].Displ;

        for (var iElem = 0; iElem < nElem; iElem++) {
           var i1 = Connectivity[iElem][0]
           var i2 = Connectivity[iElem][1]
           // NOTE: Coord conversion OpenFAST to Three:  x=-yOF, y=zOF, z=-xOF
           // TODO TODO TODO RIGID LINKS!!!
           if ((i1<Displ.length) && (i2<Displ.length)) {
               var P1 = new THREE.Vector3(-Nodes[i1][1] - Displ[i1][1]*fact, Nodes[i1][2] + Displ[i1][2]*fact, -Nodes[i1][0] - Displ[i1][0]*fact)
               var P2 = new THREE.Vector3(-Nodes[i2][1] - Displ[i2][1]*fact, Nodes[i2][2] + Displ[i2][2]*fact, -Nodes[i2][0] - Displ[i2][0]*fact)
               var arr = PLT.segmentOrient(P1,P2);
               Elems[iElem].setRotationFromMatrix(arr[0])
               Elems[iElem].position.set(arr[1].x, arr[1].y, arr[1].z);
           } else {
               console.log('PROBLEM, LIKELY RIGID LINK, TODO!', iElem, i1, i2, Displ.length);
           }
        }
    } else if (iPlot==2) {
        // ---- Plot time series
        function logMatrix(svar, matrix) {
            var e = matrix.elements;
            console.log(svar+'=');
            console.log(' ' + e[0] + ' ' + e[4] + ' ' + e[8]  + ' ' + e[12]);
            console.log(' ' + e[1] + ' ' + e[5] + ' ' + e[9]  + ' ' + e[13]);
            console.log(' ' + e[2] + ' ' + e[6] + ' ' + e[10] + ' ' + e[14]);
            console.log(' ' + e[3] + ' ' + e[7] + ' ' + e[11] + ' ' + e[15]);
        }
// 
        var time = params.tMin + params.t_bar * (params.tMax-params.tMin)
        var time_index = TOOLS.closestIndex(timeArray, time);
        /* THREE.Object3D().up (=Y) default orientation for all objects */
        /* rotation around axis X by -90 degrees 
         * matches the default orientation Y 
         * with the orientation of looking Z */
        var M1=new THREE.Matrix4();
        M1.set(0 ,-1  , 0 , 0 , 
               0 , 0  , 1 , 0 , 
               -1, 0 , 0 , 0  , 
               0 , 0  , 0 , 1);
        var Mat4  = TimeSeries[keyTS][iTS].mat4
        var Displ = TimeSeries[keyTS][iTS].Displ
        var TSHasmat4 =  Mat4!=null
//         console.log('time',time);
//         console.log('time_index',time_index);
        if (TimeSeries[keyTS][iTS].absolute) {
            // --- TimeSeries data is absolute motion
            if (TimeSeries[keyTS][iTS].element) {
               alert('NotImplementedError Time series per element');
                for (var iElem = 0; iElem < nElem; iElem++) {
                   var elements= new Float32Array(Mat4[time_index][iElem]);
                   var m1 = new THREE.Matrix4();
                   m1.elements = elements1;
                   m1=m1.multiply(M1); // go from global system to THREE system
                   Elems[iElem].matrix.identity()
                   Elems[iElem].applyMatrix(m1);
                }
            } else {
               alert('NotImplementedError');
            }

        } else { 
            // --- TimeSeries data is relative motion
            if (TimeSeries[keyTS][iTS].element) {
               alert('NotImplementedError Time series per element');
            } else { 
                if (TSHasmat4) {
                    for (var iElem = 0; iElem < nElem; iElem++) {
                       var i1 = Connectivity[iElem][0]
                       var i2 = Connectivity[iElem][1]
                       var elements1= new Float32Array(Mat4[time_index][i1]);
                       var elements2= new Float32Array(Mat4[time_index][i2]);
                       var m1 = new THREE.Matrix4();
                       var m2 = new THREE.Matrix4();
                       m1.elements = elements1;
                       m2.elements = elements2;
            //            logMatrix('m1', m1);
            //            var mm1 =m1.multiply(M1); // go from global system to THREE system
            //            var mm2 =m2.multiply(M1); // go from global system to THREE system
            //            logMatrix('m1', mm1);
            //            console.log('m1',mm1);
            //            console.log('m2',mm2);
                       var DP1 = new THREE.Vector3().setFromMatrixPosition(m1); // In "global" coordinates not THREE
                       var DP2 = new THREE.Vector3().setFromMatrixPosition(m2);
        //                console.log('DP1',DP1)
        //                console.log('DP2',DP2)
                       //var P1 = new THREE.Vector3(-Nodes[i1][1], Nodes[i1][2], -Nodes[i1][0])
                       //var P2 = new THREE.Vector3(-Nodes[i2][1], Nodes[i2][2], -Nodes[i2][0])
            //            var P1 = new THREE.Vector3(-Nodes[i1][1]-DP1[1], Nodes[i1][2]+ DP1[2],-Nodes[i1][0] -DP1[0]);
            //            var P2 = new THREE.Vector3(-Nodes[i2][1]-DP2[1], Nodes[i2][2]+ DP2[2],-Nodes[i2][0] -DP2[0]);
                       // NOTE: Coord conversion OpenFAST to Three:  x=-yOF, y=zOF, z=-xOF
                       var P1 = new THREE.Vector3(-Nodes[i1][1]-DP1.y, Nodes[i1][2]+ DP1.z,-Nodes[i1][0] -DP1.x);
                       var P2 = new THREE.Vector3(-Nodes[i2][1]-DP2.y, Nodes[i2][2]+ DP2.z,-Nodes[i2][0] -DP2.x);
                       var arr = PLT.segmentOrient(P1,P2);
                       Elems[iElem].setRotationFromMatrix(arr[0])
                       Elems[iElem].position.set(arr[1].x, arr[1].y, arr[1].z);
        //                console.log('P1',P1);
        //                console.log('P2',P2);
                    }
                } else {
                    // --- Using displacement
                    for (var iElem = 0; iElem < nElem; iElem++) {
                       var i1 = Connectivity[iElem][0]
                       var i2 = Connectivity[iElem][1]
                       var P1 = new THREE.Vector3(-Nodes[i1][1] - Displ[time_index][i1][1], Nodes[i1][2] + Displ[time_index][i1][2], -Nodes[i1][0] - Displ[time_index][i1][0])
                       var P2 = new THREE.Vector3(-Nodes[i2][1] - Displ[time_index][i2][1], Nodes[i2][2] + Displ[time_index][i2][2], -Nodes[i2][0] - Displ[time_index][i2][0])
                       var arr = PLT.segmentOrient(P1,P2);
                       Elems[iElem].setRotationFromMatrix(arr[0])
                       Elems[iElem].position.set(arr[1].x, arr[1].y, arr[1].z);
                    }
                } // 
            }
        } // Plotting Relative Motion Time Series
    } // --- Switch on iPlot, Mode/TimeSeries
    controls.update();
    render();

}

//--------------------------- animation support -----------------------------------
function doFrame() {
    if (params.animating) {
        params.t_bar=params.t_bar+params.dt/10;
        if (params.t_bar>1 && !jQuery("#playLooped").is(":checked")){
                params.t_bar=1;
                updateTime();
                plotSceneAtTime();
                pauseAnimation();
        } else {
            params.t_bar = params.t_bar % 1.0 // Ensuring that t_bar stays between 0 and 1
            updateTime();
            plotSceneAtTime();
            requestAnimationFrame(doFrame); 
        }
    }
}
function updateTime(){
    // Trigger when t_bar is set
    if (iPlot==2) {
        var time  = params.tMin + params.t_bar * (params.tMax-params.tMin)
        jQuery("#time").html(" " + time.toFixed(3) + " s");
        jQuery("#time-slider").slider("setValue", parseInt(params.t_bar*100));
   }
}

function startAnimation() {
    //console.log('Start animation', params.animID);
    //console.log('  t_bar is  : ',params.t_bar);
    //console.log('  timeArray: ',timeArray);
    if (params.t_bar>=1) {
        params.t_bar=0;
    }
    if (iPlot==0) {
        jQuery("#playAnimation").prop('disabled', true);
        //plotSceneAtTime();
    } else {
       jQuery("#playAnimation").prop('disabled', true);
       jQuery("#pauseAnimation").prop('disabled', false);
       jQuery("#stopAnimation").prop('disabled', false);
       params.animating = true;
       requestAnimationFrame(doFrame);
    }
}
function pauseAnimation() {
    //console.log('Pause animation')
	if (params.animating) {
	    params.animating = false;
	}
    if (iPlot==0) {
       jQuery("#playAnimation").prop('disabled', true);
       jQuery("#stopAnimation").prop('disabled', true);
    } else{
       jQuery("#playAnimation").prop('disabled', false);
       jQuery("#stopAnimation").prop('disabled', false);
    }
    jQuery("#pauseAnimation").prop('disabled', true);
}
function stopAnimation() {
    //console.log('Stop Animation', iPlot, params.t_bar);
    if (iPlot==0) {
        jQuery("#playAnimation").prop('disabled', true);
    }else{
        jQuery("#playAnimation").prop('disabled', false);
    }
    jQuery("#pauseAnimation").prop('disabled', true);
    jQuery("#stopAnimation").prop('disabled', true);
    params.animating= false;
    params.t_bar= 0; 
    updateTime();
    plotSceneAtTime();
}
function animationSwitch() {
    if ( params.animID=='Loop' ) {
    	startAnimation();
    } else if ( params.animID=='Jumps' ) {
        params.t_bar=0;
        params.dt=0.2
    	startAnimation();
    } else {
    	pauseAnimation();
        if ( params.animID=='Max' ) {
           params.t_bar = 0.75;
           updateTime();
        }else{ // None
           params.t_bar=0;
           updateTime();
        }
        plotSceneAtTime();
    }
}
function setAmplitudeFromSlider() { 
    if (!params.animating) {
      plotSceneAtTime();
    }
}
function setAmplitudeFromJS(ampl_in) { 
    // Set global variable
    params.amplitude = Math.max(Math.min(ampl_in, 2*A_max), A_min) ;
    // replot scene
    if (!params.animating) {
      plotSceneAtTime();
    }
}
function setDtFromJS(dt_in) { 
    // Set global variable
    params.dt = Math.max(Math.min(dt_in, 2*dt_max),dt_min) ;
}


//----------------------- show/hide elements -------------------------------
function showHide(v, elem) {
    elem.visible=v;
    render();
}
function modeSelect(){
    iPlot = 1; // Plotting Modes
    const key_id = document.querySelector('input[name="mode"]:checked').id.split('_')
    keyMode = key_id[0];
    iMode   = parseInt(key_id[1]);
    params.tMin = 0;
    params.tMax = 1;
    timeArray = TOOLS.linspace(params.tMin, params.tMax, 100);
    timeArray[100] = 0.999999;
    if (!params.animating) {
        if ( params.animID=='Max' ) {
            params.t_bar = 0.75; 
        }else{
            params.t_bar=0;
        }
        plotSceneAtTime();
    }
    else{
        params.t_bar = 0;
    }
}

function timeSeriesSelect(){
    iPlot = 2; // Plotting Modes
    const key_id = document.querySelector('input[name="timeSeries"]:checked').id.split('_')
    keyTS = key_id[0];
    iTS   = parseInt(key_id[1]);
    //console.log('>>> timeSeriesSelect ID:',keyTS, iTS)
    //console.log(TimeSeries[keyTS][iTS].timeInfo)
    var nt =  TimeSeries[keyTS][iTS].timeInfo.nt;
    var dt =  TimeSeries[keyTS][iTS].timeInfo.dt;
    params.tMin = TimeSeries[keyTS][iTS].timeInfo.tMin;
    params.tMax = params.tMin + nt*dt;
    timeArray = TOOLS.linspace(params.tMin, params.tMax, nt);
    params.t_bar=0;
    if (!params.animating) {
        plotSceneAtTime();
    }
    else{
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
    //document.getElementById("xView").onclick = xView;
    // Setup the drag and drop listeners.
    var dropZone = document.getElementsByTagName('body')[0];
    dropZone.addEventListener('dragover', WEB.handleDragOver, false);
    dropZone.addEventListener('drop'    , function(e){WEB.handleDropReader(e,createWorldFromJSONStream)}, false);
    setupGUI();

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
        renderer.setPixelRatio( window.devicePixelRatio );
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
            // Show main menu, hide options
            gui.closed = true;
            MainMenu.open();
        };
    }
    catch (e) {
        console.log(e);
        documentAlert(' A javascript error occured: ' + e );
    }
}


function initAnimControl (){
    // --- Slider TODO TODO
    slider = jQuery("#time-slider").slider({min:0, max:100, step:1, handle:"triangle", value:0});
    slider.on('slide',function(ev) {
        params.t_bar = ev.value/100;
        updateTime();
        plotSceneAtTime();
    });
    jQuery("#playAnimation").click(function(){
        //console.log('Play');
        if (params.animID=='Max' || params.animID=='None') {
            params.animID='Loop';  // Go back to loop if user press play
        }
        startAnimation();
    });
    jQuery("#pauseAnimation").click(function(){
        //console.log('Pause');
        pauseAnimation();
    });
    jQuery("#stopAnimation").click(function(){
        //console.log('Stop');
        stopAnimation();
    });
}


export { init, setupGUI, initAnimControl };
