import numpy as np
from pyrr import Matrix44, matrix44, Vector3

# --------------------------------------------------------------------------------}
# --- Simple vector geometry functions
# --------------------------------------------------------------------------------{
def rotation_matrix_from_vectors(vec1, vec2):
    """ Find the rotation matrix that alignormals vec1 to vec2
    :param vec1: A 3d "source" vector
    :param vec2: A 3d "destination" vector
    :return mat: A tranormalsform matrix (3x3) which when applied to vec1, alignormals it with vec2.
    """
    vec1 = vec1[:3]
    vec2 = vec2[:3]
    n1=np.linalg.norm(vec1)
    n2=np.linalg.norm(vec2)
    if n1<1e-8:
        return np.eye(3)
    if n2<1e-8:
        return np.eye(3)
    # Normalize vectors
    a, b = vec1/n1, vec2/n2
    v = np.cross(a, b)
    c = np.dot(a, b)
    s = np.linalg.norm(v)
    if s<1e-8:
        # the vectors are parallel
        return np.eye(3)
    kmat = np.array([[0, -v[2], v[1]], [v[2], 0, -v[0]], [-v[1], v[0], 0]])
    rotation_matrix = np.eye(3) + kmat + kmat.dot(kmat) * ((1 - c) / (s ** 2))
    return rotation_matrix

def matrix44_map_vec_to_2points(P1, P2, up):
    """ 
    Return matrix 44 (M) such that M.dot(up)=P2-P1
    """
    DP= np.asarray(P2)[:3]-np.asarray(P1)[:3]
    mat = rotation_matrix_from_vectors(up, DP)
    M=Matrix44()
    M[:3,:3]=mat
    M[3,3]=1
    return M

def matrix44_2points(P1, P2, up=(0,0,1), origin=(0,0,0)):
    """
    Return matrix 44 (M) such that :
      - a point located at origin is translated to (P1+P2)/2
      - a vector up, is oriented to P2-P1
    """
    M = matrix44_map_vec_to_2points(P1, P2, up)
    mid = (np.asarray(P1)+np.asarray(P2))/2
    M[0,3] = mid[0]-origin[0]
    M[1,3] = mid[1]-origin[1]
    M[2,3] = mid[2]-origin[2]
    return M

def lookAt(eye, target, up, dtype=None):
    """ 
    Return matrix 44 tranormalsforming the vector target-eye into up
    """
    eye    = eye[:3]
    target = target[:3]
    up     = up[:3]
    forward = (target - eye)/np.linalg.norm(target - eye)
    side = (np.cross(forward, up))/np.linalg.norm(np.cross(forward, up))
    up = (np.cross(side, forward)/np.linalg.norm(np.cross(side, forward)))

    return np.array((
            (side[0], up[0], -forward[0], 0.),
            (side[1], up[1], -forward[1], 0.),
            (side[2], up[2], -forward[2], 0.),
            (-np.dot(side, eye), -np.dot(up, eye), np.dot(forward, eye), 1.0)
        ), dtype=np.float32)

def perspective(xmax, ymax, near, far):
    left, right = -xmax, xmax
    bottom, top = -ymax, ymax

    A = (right + left) / (right - left)
    B = (top + bottom) / (top - bottom)
    C = -(far + near) / (far - near)
    D = -2. * far * near / (far - near)
    E = 2. * near / (right - left)
    F = 2. * near / (top - bottom)
    return np.array((
        (  E, 0., 0., 0.),
        ( 0.,  F, 0., 0.),
        (  A,  B,  C,-1.),
        ( 0., 0.,  D, 0.),
    ), dtype=np.float32)

def orthogonal(xmax, ymax, near, far):
    rml = xmax * 2
    tmb = ymax * 2
    fmn = far - near

    A = 2. / rml
    B = 2. / tmb
    C = -2. / fmn
    Tx = 0
    Ty = 0
    Tz = -(far + near) / fmn

    return np.array((
        ( A, 0., 0., 0.),
        (0.,  B, 0., 0.),
        (0., 0.,  C, 0.),
        (Tx, Ty, Tz, 1.),
    ), dtype=np.float32)


# --------------------------------------------------------------------------------}
# --- 3D Objects Geometries 
# --------------------------------------------------------------------------------{
def build_grididx(r, c):
    idx = np.arange(r*c, dtype=np.uint32)
    rs, colors = idx//c, idx%c
    idx1   = idx[(rs<r-1)*(colors<c-1)].reshape((-1,1))
    did    = np.array([[0, 1, 1+c, 0, 1+c, c]], dtype = np.uint32)
    return rs, colors, (idx1 + did).reshape((-1,3))

# 0 1 1  2 2 3  3 4 4  5 5 6
def build_line(xs, ys, zs, c):
    vts = np.array([xs, ys, zs], dtype=np.float32).T
    n = (len(xs)-1)*2
    rem = (6 - n % 6)%6
    fs = np.arange(0.1,(n+rem)//2,0.5).round().astype(np.uint32)
    if rem>0: fs[-rem:] = len(xs)-1 
    ns = np.ones((len(vts), 3), dtype=np.float32)
    cs = (np.ones((len(vts), 3))*c).astype(np.float32)
    return vts, fs.reshape((-1,3)), ns, cs

def build_lines(xs, ys, zs, cs):
    if not isinstance(cs, list):
        cs = [cs] * len(xs)
    vtss, fss, nss, css = [], [], [], []
    s = 0
    for x, y, z, c in zip(xs, ys, zs, cs):
        vv, ff, nn, cc = build_line(x, y, z, c)
        fss.append(ff+s)
        s += len(vv)
        vtss.append(vv)
        nss.append(nn)
        css.append(cc)
    return np.vstack(vtss), np.vstack(fss), np.vstack(nss), np.vstack(css)


def SphereGeometry(origin, radius=1, color=(1,0,0), nz=9, ntheta=17, theta_start=0, theta_end=2*np.pi):
    """ 
    Generate a sphere centered in the point `origin`

    ntheta: number of points along a circle (4: triangle (minimum), 5: square, 6: pentagones, etc)
    nz: number of points along the z direction (3: pyramid (minimum)

    return vertices, faces, normals and colors
    
    """
    ax, az = np.meshgrid(np.linspace(theta_start,theta_end,ntheta), np.linspace(-np.pi/2,np.pi/2,nz))
    zs = np.sin(az.ravel())
    xs = np.cos(ax.ravel()) * np.cos(az.ravel())
    ys = np.sin(ax.ravel()) * np.cos(az.ravel())
    normals = np.vstack((xs, ys, zs)).astype(np.float32).T
    vertices = (normals * radius + origin).astype(np.float32)
    faces = build_grididx(nz, ntheta)[2]
    colors = (np.ones((len(vertices), 3))*color).astype(np.float32)
    return vertices, faces, normals, colors


def CylinderGeometry(R1=1, R2=1, height=2, color=(1,0,0), origin=(0,0,0), nz=6, yRes=12, theta_start=0, theta_end=2*np.pi):
    """ 
    Generate a cylinder oriented along z

    yRes: number of points along a circle (4: triangle (minimum), 5: square, 6: pentagones, etc)
    nz: number of points along the z direction (3: pyramid (minimum)

    return vertices, faces, normals and colors
    
    """
    ax, az = np.meshgrid(np.linspace(theta_start,theta_end,yRes), np.linspace(-height/2,height/2,nz))
    zs = az.ravel()
    xs = np.cos(ax.ravel())
    ys = np.sin(ax.ravel())
    normals  = np.column_stack((xs, ys, 0*zs)).astype(np.float32)
    vertices = np.column_stack((xs+origin[0], ys+origin[1], zs+origin[2])).astype(np.float32)
    vertices[:,0] *= R1
    vertices[:,1] *= R1
    faces    = build_grididx(nz, yRes)[2]
    colors   = (np.ones((len(vertices), 3))*color).astype(np.float32)
    return vertices, faces, normals, colors

def CylinderGeometryTwoPoints(P1, P2, R1=1, R2=1, color=(1,0,0), nz=2, yRes=12, rotateOutput=True):
    """ 
    Generate a cylinder using two points P1, P2

    yRes: number of points along a circle (4: triangle (minimum), 5: square, 6: pentagones, etc)
    nz: number of points along the z direction (3: pyramid (minimum)

    return vertices, faces, normals and colors
    
    """
    DP= np.asarray(P2)[:3]-np.asarray(P1)[:3]
    L = np.linalg.norm(DP)
    #print('L',L)
    # Create a cylinder oriented around z and at origin 0,0,0
    vertices, faces, normals, colors = CylinderGeometry(R1=R1, R2=R2, height=L, color=color, nz=nz, yRes=yRes)
#     print(vertices)
    # Get the transformation matrix from thes vertices to the points
    tmat= matrix44_2points(P1, P2, up=(0,0,1), origin=(0,0,0))
    #print(tmat)
#     tmat=Matrix44.identity()
#     print(tmat)

    if rotateOutput:
        if vertices.shape[1]==3:
            vertices=np.column_stack((vertices,np.ones((vertices.shape[0],1),dtype=np.float32)))
        if normals.shape[1]==3:
            normals=np.column_stack((normals,np.zeros((normals.shape[0],1),dtype=np.float32)))
        vertices = tmat.dot(vertices.T).T
        normals  = tmat.dot(normals.T).T
        tmat=Matrix44.identity()

    return vertices, faces, normals, colors, tmat



def AxesGeometry(m, cs=np.eye(3)):
    """ 
    Generate the three axes of a coordinate system defined by a 44 matrix M
    The value M[3,3] is used for scaling the length of the axes
      x (red), y (green), z (blue)
    """
    w    = m[3,3]                            # scale for axes
    O    = m.dot((0,0,0,1))[:3].reshape(3,1) # Origin
    xnew = m.dot((w,0,0,1))[:3].reshape(3,1)
    ynew = m.dot((0,w,0,1))[:3].reshape(3,1)
    znew = m.dot((0,0,w,1))[:3].reshape(3,1)
    pts=np.column_stack((O,xnew,O,O,ynew,O,O,znew,O))
    #data = m.copy().T
    #data[:3,:3] += data[3,:3]
    #pts = data[:,:3][[3,0,3,3,1,3,3,2,3]].T
    cs = cs[[0,0,0,1,1,1,2,2,2]]
    return build_line(pts[0], pts[1], pts[2], cs)

def CubeGeometry(P1, P2, color=(1,1,1)):
    """ 
    Generate a Cube from a lower diagonal corner to a upper corner with the faces orthogonal to the main axes
    """
    (x1,y1,z1),(x2,y2,z2) = P1, P2
    xs = (x1,x2,x2,x1,x1,x1,x1,x1,x1,x2,x2,x1,x2,x2,x2,x2)
    ys = (y1,y1,y1,y1,y1,y2,y2,y1,y2,y2,y2,y2,y2,y1,y1,y2)
    zs = (z1,z1,z2,z2,z1,z1,z2,z2,z2,z2,z1,z1,z1,z1,z2,z2)
    return build_line(xs, ys, zs, color)


def TextGeometry(labels, origins, dz, h, color):
    lib = {'0':([(0,0.5,0.5,0,0)],[(1,1,0,0,1)],0.5),
            '1':([(0.25,0.25)], [(0,1)], 0.5),
            '2':([(0,0.5,0.5,0,0,0.5)], [(1,1,0.5,0.5,0,0)], 0.5),
            '3':([(0,0.5,0.5,0),(0,0.5)],[(1,1,0,0),(0.5,0.5)], 0.5),
            '4':([(0,0,0.5),(0.5,0.5)],[(1,0.5,0.5),(1,0)],0.5),
            '5':([(0.5,0,0,0.5,0.5,0)], [(1,1,0.5,0.5,0,0)], 0.5),
            '6':([(0.5,0,0,0.5,0.5,0,0)], [(1,1,0.5,0.5,0,0,0.5)], 0.5),
            '7':([(0,0.5,0.5)], [(1,1,0)], 0.5),
            '8':([(0.5,0.5,0,0,0.5,0.5,0,0)], [(0.5,1,1,0.5,0.5,0,0,0.5)], 0.5),
            '9':([(0.5,0.5,0,0,0.5,0.5,0)], [(0.5,1,1,0.5,0.5,0,0)], 0.5),
            'I':([(0,0.5),(0.25,0.25),(0,0.5)],[(1,1),(1,0),(0,0)],0.5),
            'D':([(0,0.25,0.4,0.5,0.5,0.4,0.25,0),(0.1,0.1)],[(1,1,0.9,0.75,0.25,0.1,0,0),(0,1)],0.5),
            ':':([(0.2,0.3),(0.2,0.3)],[(0.75,0.75),(0.25,0.25)],0.5)}
    def OneText(label, pos, dz, h, color):
        vts, fss = [], []
        s, sw = 0, 0
        for i in label:
            xs, ys, w = lib[i]
            vv, ff, nn, cc = build_lines(xs, ys, ys, (0,0,0))
            fss.append(ff+s)
            vts.append(vv+[sw,0,0])
            vts[-1][:,2] = dz
            s += len(vv)
            sw += w+0.3
        sw -= 0.3
        vts = (np.vstack(vts)-[sw/2.0, 0.5, 0])
        return vts, np.vstack(fss), pos, h, color

    if not hasattr(dz, '__len__'):
        dz = [dz] * len(labels)
    vtss, fss, pps = [], [], []
    s = 0
    for cont, pos, z in zip(labels, origins, dz):
        vv, ff, pp, hh, cc = OneText(cont, pos, z, h, color)
        fss.append(ff+s)
        s += len(vv)
        vtss.append(vv)
        pps.append((np.ones((len(vv),3))*pp).astype(np.float32))

    return np.vstack(vtss), np.vstack(fss), np.vstack(pps), h, color


# --------------------------------------------------------------------------------}
# ---  
# --------------------------------------------------------------------------------{
if __name__ == '__main__':
    P1=np.array([0,0,0,0])
    P2=np.array([1,0,0,0])
    up=np.array([0,1,0,0])
    eye    = P1
    target = P2
    vec1  = P2-P1
    vec2  = up

    rot_mat_tranormals = rotation_matrix_from_vectors(vec2, vec1)
    #print('vec1     ',vec1)
    vec1_new = rot_mat_tranormals.dot(vec2[:3])
    print('vec1_new ',vec1_new)
    print('rotmat_tranormals\n',rot_mat_tranormals)
# 
#     M44= matrix44_map_vec_to_2points(up, P1, P2)
#     vec1_newnew=M44.dot(up)
#     print('vec1_new2',vec1_newnew)
# 
#     rot_mat = rotation_matrix_from_vectors(vec1, vec2)
#     print('vec2     ',vec2)
#     vec2_new = rot_mat.dot(vec1[:3])
#     print('vec2_new ',vec2_new)
#     print('rotmat\n',rot_mat)
#     M = Matrix44.identity()
#     M[:3,:3]=rot_mat
#     print('rotmat 44\n',M)
#     
#     rot_mat2 = lookAt(eye, target, up)
# 
#     print('rotmat2\n',rot_mat2)
#     print(rot_mat2.dot(vec1))
#     print(rot_mat2.dot(vec2))
#     print(rot_mat2.dot(up))

#     P1=np.array([ 0,0,0,0])
#     P2=np.array([20,0,0,0])
#     up=np.array([0,0,1,0])
#     P1_body=np.array([0,0, 10,1])
#     P2_body=np.array([0,0,-10,1])
#     eye    = P1
#     target = P2
#     vec1   = P2-P1
#     vec2   = up
#     M = matrix44_2points(P1, P2, up=up)
#     print('M \n',M)
#     print('P1_body',P1_body)
#     print('P2_body',P2_body)
#     print('P1_glob',M.dot(P1_body))
#     print('P2_glob',M.dot(P2_body))



