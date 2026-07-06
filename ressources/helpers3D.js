import * as THREE from            './three.module.js';

/* returns orientation and position of a segment, assumed to be along y*/
function segmentOrient(P1, P2, ref_dir, twistAngle){
    /* Optional ref_dir argument: cross-section reference direction (SideA_dir for
     * rectangles, x_e for cylinders) */
    /* Optional twistAngle (radians): rotation of the cross-section about the element's
     * longitudinal axis (torsion). Defaults to 0 (no twist), so existing callers
     * (initial mesh creation in cylinderBetweenPoints()/rectangleBetweenPoints(), which
     * don't have information about torsion) are unaffected. */
    twistAngle = twistAngle || 0;

    var direction = new THREE.Vector3().subVectors( P2, P1 );
    var middle   =  new THREE.Vector3().addVectors( P1, direction.multiplyScalar(0.5) );
    var length = direction.length(); // half-length. Callers use 2*arr[2] for full beam length

    var orientation = new THREE.Matrix4()

    /* THREE.Object3D().up (=Y) default orientation for all objects */
    if (ref_dir) {
        // Build basis from beam longitudinal axis + known cross-section reference direction
        // (rectanges: refDir = SideA_dir and cylinders: refDir = x_e).

        // Beam longitudinal axis
        var yAxis = direction.clone().normalize();
        /* Coord conversion OpenFAST->Three.js */
        var xAxis = new THREE.Vector3(
            -ref_dir[1],  // x = -y OpenFAST
             ref_dir[2],  // y = z OpenFAST
            -ref_dir[0]   // z = -x OpenFAST
        ).normalize();
        var zAxis = new THREE.Vector3().crossVectors(xAxis, yAxis).normalize();

        xAxis.crossVectors(yAxis, zAxis).normalize(); // Re-orthogonalize xAxis: ensures SideA or x_e is perpendicular to the deformed beam axis
        orientation.makeBasis(xAxis, yAxis, zAxis);

    } else {
        // Fallback only when no physical reference direction is available (old JSON files)
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
    }

    // Apply torsion: rotate the cross-section by twistAngle about the element's own
    // longitudinal (local Y) axis.
    if (twistAngle !== 0) {
        var twistMatrix = new THREE.Matrix4().makeRotationY(twistAngle);
        orientation.multiply(twistMatrix);
    }

    return [orientation, middle, length];
}

function cylinderBetweenPoints(P1, P2, R1, R2, color){

    // --- Create sphere end points for debug
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
    var length = 2*arr[2]; // full beam length

    var cyl_geo = new THREE.CylinderGeometry(R2, R1, length, 20, 2, false)
    //var cyl_mat = new THREE.MeshBasicMaterial( {color: color} );
    var cyl_mat = new THREE.MeshPhongMaterial(
        {color: color,
        shininess: 60
        }
    );
    var cyl     = new THREE.Mesh( cyl_geo, cyl_mat );

    // Add edges
    var cyl_edges = new THREE.LineSegments(
        //Only keep edges where the angle between face normals is higher than 89 deg
        new THREE.EdgesGeometry(cyl_geo, 89), // threshold angle = 89 deg, to filter out the longitudinal edges along the cylinders.
        new THREE.LineBasicMaterial({ color: 0x000000 })
    );
    cyl.add(cyl_edges);

    // Add a single longitudinal edge on the surface, at local +X (azimuth 0).
    // This allows to observe torsion in a cylinder.
    // Added as a child of "cyl_edges", so it automatically follows the same
    // rotation/twist as the cylinder itself; no extra update needed.
    var cyl_longitudinal_edge = new THREE.BufferGeometry().setFromPoints([
        new THREE.Vector3(R1, -length/2, 0), // bottom, at radius R1
        new THREE.Vector3(R2,  length/2, 0)  // top, at radius R2
    ]);
    var edge = new THREE.Line(cyl_longitudinal_edge, new THREE.LineBasicMaterial({ color: 0x000000 }));
    cyl_edges.add(edge);

    cyl.applyMatrix4(arr[0])
    cyl.position.set(arr[1].x, arr[1].y, arr[1].z);
    cyl.updateMatrixWorld();
    return [cyl, s1, s2];
}

function rectangleBetweenPoints(P1, P2, SideA, SideB, color, SideA_dir){

    var arr = segmentOrient(P1, P2, SideA_dir);

    // arr[2] = half length. Full length = 2*arr[2]
    var length = 2*arr[2];

    // BoxGeometry: (X = SideA, Y = beam longitudinal axis, Z = SideB)
    var box_geo = new THREE.BoxGeometry(SideA, length, SideB);

    var box_mat = new THREE.MeshPhongMaterial({
        color: color,
        shininess: 60
    });

    var box = new THREE.Mesh(box_geo, box_mat);

    // Add edges
    box.add(new THREE.LineSegments(
        new THREE.EdgesGeometry(box_geo),
        new THREE.LineBasicMaterial({ color: 0x000000 })
    ));

    box.setRotationFromMatrix(arr[0]);
    box.position.copy(arr[1]);
    box.updateMatrixWorld();

    return box;
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

export {segmentOrient, cylinderBetweenPoints, rectangleBetweenPoints, createSeaLevelObject, createSeaBedObject, getExtent};
