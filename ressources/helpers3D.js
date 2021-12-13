import * as THREE from            './three.module.js';

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


/** Create a Plane for Sea Level **/
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
/** Create a Plane for Sea Bed **/
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

/* Compute extent of a scene*/
function getExtent(scene){
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
    //  console.log("Get Extent, scale: " + e.scale, 'Max dim:', e.maxDim, 'Max rad',e.max);
    //  console.log("MinMax (("+e.xmin+","+e.xmax+"), ("+e.ymin+","+e.ymax+"), ("+e.zmin+","+e.zmax+") )");
    //  console.log("Extent: " + e.extentX, e.extentY, e.extentZ);
    //  console.log("Center at ( " + e.centerX + ", " + e.centerY + ", " + e.centerZ + " )");
    //  console.log(e);
    //}
    return e;
}

export {segmentOrient, cylinderBetweenPoints, createSeaLevelObject, createSeaBedObject, getExtent};
