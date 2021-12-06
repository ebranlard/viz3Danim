import numpy as np
from math import sin, cos, tan, pi
import moderngl

from pyrr import Matrix44, matrix44, Vector3
try:
    from welib.tools.clean_exceptions import *
except:
    pass

try:
    from .geometry import *
except ImportError:
    from geometry import *

"""
vao: vortex array
vbo: vortex buffer object
ibo: index buffer object
"""

class GLObject(object):
    def __init__(self, vertices, color=(0,0,1), tmat=None):
        # Vertices have a scale of 1
        if vertices.shape[1]==3:
            vertices=np.column_stack((vertices,np.ones((vertices.shape[0],1),dtype=np.float32)))

        self.vertices0 = vertices # vertices, at t = 0
        self.color     = color
        self.visible   = True

        # Transformation matrix
        if tmat is None:
            self.tmat=Matrix44.identity()
            self.vertices=self.vertices0
        else:
            self.tmat=tmat
            self.vertices=self.tmat.dot(self.vertices0.T).T

        self.set_box()

    def set_box(self):
        """ compute box extent from vertices location """
        self.box  = np.vstack((self.vertices[:,:3].min(axis=0), self.vertices[:,:3].max(axis=0)))

    def __repr__(self):
        s ='<{} object>:\n'.format(type(self).__name__)
        s+=' - box : {}\n'.format(self.box)
        return s



# --------------------------------------------------------------------------------}
# --- Mesh/Surface 
# --------------------------------------------------------------------------------{
class Surface(GLObject):
    def __init__(self, vertices, ids, normals, colors=(0,0,1), tmat=None, width=1, mode='surface'):

        colors = np.asarray(colors).reshape((-1,3))
        GLObject.__init__(self, vertices=vertices, color=colors[0,:], tmat=tmat)

        if normals.shape[1]==3:
            normals=np.column_stack((normals,np.zeros((normals.shape[0],1),dtype=np.float32)))

        self.normals0 = normals # normals, at t = 0
        self.ids      = ids     # faces
        self.mode     = mode
        self.colors   = colors
        self.blend    = 1.0
        self.width    = width
        self.normals  = self.tmat.dot(self.normals0.T).T

    def _updateVertices(self):
        # --- Perform coordinate transformation (TODO, do this on GPU)
        self.vertices=self.tmat.dot(self.vertices0.T).T
        self.normals =self.tmat.dot(self.normals0.T).T
        # trigger
        self.set_box()
        self.buf[:,0:4] = self.vertices
        self.buf[:,4:7] = self.normals[:,:3]
        self.buf[:,7:10] = self.colors 

    def Update(self):
        # Compute new vertices position and normals in python
        self._updateVertices()
        # Then write the data into the buffer
        self.vbo.write(self.buf.tobytes())

    def on_ctx(self, ctx, prog):
        self.ctx  = ctx
        self.prog = prog
        self.ibo = ctx.buffer(self.ids.tobytes())
        buf = self.buf = np.zeros((len(self.vertices0), 10), dtype=np.float32)

        self._updateVertices()

        self.vbo = self.ctx.buffer(self.buf.tobytes())
        content = [(self.vbo, '4f 3f 3f', 'v_vert', 'v_norm', 'v_color')]
        self.vao = self.ctx.vertex_array(self.prog, content, self.ibo)

    def set_style(self, mode=None, blend=None, color=None, visible=None):
        if mode is not None:    self.mode    = mode
        if blend is not None:   self.blend   = blend
        if visible is not None: self.visible = visible
        if color is not None:
            self.colors[:,:3] = color 
            self.buf[:,7:10] = color
            self.vbo.write(self.buf.tobytes())

    def draw(self, mvp, light, bright, scatter):

        if not self.visible: return
        self.ctx.line_width = self.width
        mvp = np.dot(*mvp)
        self.prog['Mvp'].write(mvp.astype(np.float32).tobytes())
        self.prog['blend'].value   = self.blend
        self.prog['scatter'].value = scatter
        self.prog['light'].value   = tuple(light)
        self.prog['bright'].value  = bright
        if self.mode=='surface':
            self.vao.render(moderngl.TRIANGLES)
        elif self.mode=='wireframe':
            self.vao.render(moderngl.LINES)
        else:
            print(self.mode)
            raise Exception('TODO')

# --------------------------------------------------------------------------------}
# --- Labels 
# --------------------------------------------------------------------------------{
class MarkText(GLObject):
    def __init__(self, vertices, ids, os, h, color):
        GLObject.__init__(self, vertices=vertices, color=color, tmat=None)

        self.ids     = ids
        self.os      = os
        self.h       = h
        self.blend   = 1
        self.box     = None
        self.mode='wireframe'

    def on_ctx(self, ctx, prog):
        self.ctx = ctx
        vertices, ids, os = self.vertices, self.ids, self.os
        buf = self.buf = np.zeros((len(vertices), 6), dtype=np.float32)
        buf[:,0:3], buf[:,3:6] = vertices[:,:3], os
        self.vbo = ctx.buffer(buf.tobytes())
        ibo = ctx.buffer(ids.tobytes())
        content = [(self.vbo, '3f 3f', 'v_vert', 'v_pos')]
        self.vao = ctx.vertex_array(prog, content, ibo)
        self.prog = prog

    def set_style(self, mode=None, blend=None, color=None, visible=None):
        if not visible is None: self.visible = visible
        if not color is None: self.color = color

    def draw(self, mvp, light, bright, scatter):
        if not self.visible: return
        self.ctx.line_width = 2
        self.prog['mv'].write(mvp[0].astype(np.float32).tobytes())
        self.prog['proj'].write(mvp[1].astype(np.float32).tobytes())
        self.prog['f_color'].write(np.array(self.color).astype(np.float32).tobytes())
        self.prog['h'].value = self.h
        self.vao.render(moderngl.LINES)

class Manager(object):
    def __init__(self,canvas=None):
        self.ratio    = 1.0
        self.background = 0.0, 0.0, 0.0  # default background color
        self.objs = {}
        self.ctx = None
        self.canvas = canvas 
        self.mvp=None
        # --- Light
        self.light = (1,1,1)
        self.bright = 0.66
        self.scatter = 0.96
        self.bright = 0.56
        self.scatter = 0.899
        # --- Geometry
        self.diagonal = 1.0
        self.maxDim = 1.0
        self.center    = (0,0,0)
        # --- Camera
        self.pers      = True
        self.camCenter = (0,0,0)
        self.delta_eye = (0,0,0)
        self.camDist = 2.0 # in "diagonal"
        self.callback=None

        self._OBJS = ['BBox','axes']

    def InitGL(self):
        self.on_ctx()
        self.reset()
        self.showBox()
        self.showAxes()
        #self.showLbl()

    def onDraw(self, width, height):
        self.set_viewport(0, 0, width, height)
        self.draw()

    def on_ctx(self):
        self.ctx = moderngl.create_context()
        self.prog_suf = self.ctx.program(
            vertex_shader='''
                #version 330
                uniform mat4 Mvp;
                in vec4 v_vert;
                in vec3 v_norm;
                in vec3 v_color;
                out vec3 f_norm;
                out vec3 f_color;
                void main() {
                    gl_Position = Mvp * v_vert;
                    f_norm = v_norm;
                    f_color = v_color;
                }
            ''',
            fragment_shader='''
                #version 330
                uniform vec3 light;
                uniform float blend;
                uniform float scatter;
                uniform float bright;
                in vec3 f_norm;
                in vec3 f_color;
                out vec4 color;
                void main() {
                    float d = clamp(dot(light, f_norm)*bright+scatter, 0, 1);
                       color = vec4(f_color*d, blend);
                }
            '''
        )

        self.prog_txt = self.ctx.program(
            vertex_shader='''
                #version 330
                uniform mat4 mv;
                uniform mat4 proj;
                uniform float h;
                in vec3 v_vert;
                in vec3 v_pos;
                void main() {
                    vec4 o = mv * vec4(v_pos, 1);
                    gl_Position = proj *(o + vec4(v_vert.x*h, v_vert.y*h, v_vert.z, 0));
                }
            ''',
            fragment_shader='''
                #version 330
                uniform vec3 f_color;
                out vec4 color;
                void main() {
                       color = vec4(f_color, 1);
                }
            ''')

        for obj in self.objs.values():
            if isinstance(obj, Surface):  obj.on_ctx(self.ctx, self.prog_suf)
            if isinstance(obj, MarkText): obj.on_ctx(self.ctx, self.prog_txt)


    def setAnimationCallBack(self, callback, args):
        self.callback=callback
        self.callbackArg=args

    def Update(self,time=0):
        #print('Update')
        for obj in self.objs.values():
            if isinstance(obj, Surface):  obj.Update()
        self.redraw()

    def add_surf(self, name, vertices, ids, normals=None, colors=(0,0,1), **kwargs):
        surf = Surface(vertices, ids, normals, colors, **kwargs)
        if self.ctx is not None:
            surf.on_ctx(self.ctx, self.prog_suf)
        self.objs[name] = surf
        self.computeBoundingBox()
        return surf

    def add_mark(self, name, vertices, ids, o, h, color=(0,0,1)):
        mark = MarkText(vertices, ids, o, h, color)
        if not self.ctx is None:
            mark.on_ctx(self.ctx, self.prog_txt)
        self.objs[name] = mark
        return mark

    def getObj(self, key):
        if key not in self.objs.keys(): 
            raise KeyError('Object not found:', key)
        return self.objs[key]

    def getObjNames(self):
        """ Return "user" object names """
        return [n for n,obj in self.objs.items() if (n not in self._OBJS)]
    
    def getObjs(self):
        """ Return "user" objects, not including internal objects such as axes or bounding box """
        return [obj for n,obj in self.objs.items() if (n not in self._OBJS)]

    def animate(self):
        pass

    def onPlay(self):
        pass

    def onPause(self):
        pass

    def onStop(self):
        pass

    def draw(self):
        self.animate()
        #if self.callback is not None:
        #    self.callback(self.getObjs())
        for obj in self.objs.values():
            if isinstance(obj, Surface):  obj.Update()

        #print('>>> draw')
        self.ctx.clear(*self.background)
        self.ctx.enable(moderngl.DEPTH_TEST)
        #self.ctx.enable(ModernGL.CULL_FACE)
        self.ctx.enable(moderngl.BLEND)
        for obj in self.objs.values(): 
            obj.draw(self.mvp, self.light, self.bright, self.scatter)

    def redraw(self):
        self.draw()
        self.canvas.SwapBuffers()


    def computeBoundingBox(self):
        objs=self.getObjs()
        if len(objs)>0:
            minb = np.array([obj.box[0] for obj in objs if (obj.box is not None)]).min(axis=0)
            maxb = np.array([obj.box[1] for obj in objs if (obj.box is not None)]).max(axis=0)
            self.box = np.vstack((minb, maxb))
        else:
            self.box = np.vstack(([-1,-1,-1],[1,1,1]))
        self.center = self.box.mean(axis=0)
        self.diagonal = np.linalg.norm(self.box[1]-self.box[0])
        self.maxDim = np.max(self.box[1]-self.box[0])
        if self.diagonal==0:
            self.diagonal = 1.0
        #print('Diagonal',self.diagonal, 'Center',self.center)


    def setBackground(self, rgb): 
        self.background = rgb
        self.Refresh()

    def setLight(self, lightPos=None, bright=None, scatter=None):
        """ 
        """
        if lightPos is not None:
            self.light = lightPos
        if bright is not None: 
            self.bright = bright
        if scatter is not None:
            self.scatter = scatter


    # --------------------------------------------------------------------------------}
    # ---  
    # --------------------------------------------------------------------------------{
    def Refresh(self):
        if self.canvas is not None:
            self.canvas.Refresh(False)

    # --------------------------------------------------------------------------------}
    # --- Camera handling 
    # --------------------------------------------------------------------------------{
    def setCamera(self, moveEye=None):
        #print('mvp')
        ymax = (1.0 if self.pers else self.camDist*self.l) * np.tan(self.fovy * np.pi / 360.0)
        xmax = ymax * self.ratio
        proj = (perspective if self.pers else orthogonal)(xmax, ymax, 1.0, 100000)
        lookat = lookAt(self.eye, self.camCenter, (0.0,0.0,1.0))
        self.mvp = (lookat, proj)
        
    def set_viewport(self, x, y, width, height):
        if self.ctx is not None:
            self.ctx.viewport = (x, y, width, height)
            self.ratio = width*1.0/height

    def reset(self, fovy=45, angx=0.50, angy=0.20):
        """ 
         - Recenter the camera into the scene center
         - Set he view as "3D" (see default augx and angy)
        """
        self.computeBoundingBox()
        self.camCenter=self.center
        self.fovy, self.angx, self.angy = fovy, angx, angy
        self.l = self.diagonal/2/(tan(fovy*pi/360))
        v = np.array([cos(angy)*cos(angx), cos(angy)*sin(angx), sin(angy)])
#         if self.pers:
        self.eye = self.center + v*self.l*self.camDist
#         else:
#             self.eye = self.center + v*self.l*5
        self.delta_eye = (0,0,0)
        self.setCamera()
        #print('reset', self.eye, self.center)

    def set_pers(self, fovy=None, angx=None, angy=None, l=None, pers=None, pan_xy=None):
        if not pers is None: self.pers = pers
        if not fovy is None: self.fovy = fovy
        if not angx is None: self.angx = angx
        if not angy is None: self.angy = angy
        self.angx %= 2*pi
        self.angy = max(min(pi/2-1e-4, self.angy), -pi/2+1e-4)
        if not l is None: self.l = l
        v = np.array([cos(self.angy)*cos(self.angx), 
            cos(self.angy)*sin(self.angx), sin(self.angy)])

        if self.mvp is not None and pan_xy is not None:
            # Panning, pan_xy represent the mouse deltas
            pan_xy = (pan_xy[0]*self.l, pan_xy[1]*self.l)
            xx=self.mvp[0].dot((-1.0,0.0,0.0,0))[:3]
            yy=self.mvp[0].dot((0.0 ,1.0,0.0,0))[:3]
            self.camCenter[:3]+=xx*pan_xy[0]+yy*pan_xy[1]
            self.eye[:3]   +=xx*pan_xy[0]+yy*pan_xy[1]
            self.delta_eye +=xx*pan_xy[0]+yy*pan_xy[1]
        else:
            self.eye = self.camCenter +  v*self.l*self.camDist
        self.setCamera()

    def camReset(self):
        """ Reset the camera to its default view """
        self.pers=True  # TODO a choice..
        self.reset()
        self.set_pers()
        self.Refresh()

    def camView(self,axis='x'):
        self.camCenter=self.center
        if axis=='x':
            self.reset(angx=0, angy=0)
        elif axis=='y':
            self.reset(angx=pi/2, angy=0)
        elif axis=='z':
            self.reset(angy=pi/2-1e-4, angx=0)
        self.Refresh()

    def parallelView(self, parallel=False):
        self.set_pers(pers=not parallel)
        self.Refresh()

    # --------------------------------------------------------------------------------}
    # --- Basic Elements handling
    # --------------------------------------------------------------------------------{
    def showBox(self, show=True):
        """ show a bounding box around the objects of the scene"""
        if show:
            self.computeBoundingBox()
            #P1= self.box[0]
            #P2= self.box[1]
            #DP=P2-P1 
            #P1-=DP/2  # adding a margin, bigger than bounding box
            #P2+=DP/2
            #print(P1,P2)
            P1=np.array(self.center)-self.maxDim/2*1.5
            P2=np.array(self.center)+self.maxDim/2*1.5
            vts, fs, ns, cs = CubeGeometry(P1, P2, color=(1,1,1))
            self.add_surf('BBox', vts, fs, ns, cs, width=1, mode='wireframe')
        else:
            self.objs.pop('BBox', None)
        self.Refresh()

    def showAxes(self, show=True):
        """ Show axes centered on origin, not on mean box... """
        if show:
            L  = max(self.diagonal/4,1.0)
            m=np.eye(4)
            m[3,3]=L
            vts, fs, ns, cs = AxesGeometry(m, cs=np.eye(3))
            self.add_surf('axes', vts, fs, ns, cs, mode='wireframe',width=1.5)
            #self.reset()
        else:
            self.objs.pop('axes', None)

        self.Refresh()

    def showLbl(self, show=True):
        """ Show Labels """
        if show:
            self.add_mark('LabNodes', self.NLabels[0], self.NLabels[1], self.NLabels[2], self.NLabels[3], self.NLabels[4])
            self.add_mark('LabElems', self.ELabels[0], self.ELabels[1], self.ELabels[2], self.ELabels[3], self.ELabels[4])
        else:
            self.objs.pop('LabNodes', None)
            self.objs.pop('LabElems', None)

        self.Refresh()


    def addMiscObjects(self):
        vts, fs, ns, cs = SphereGeometry((0,10,0), 5.1, color=(1,0,0))
        self.add_surf('ball', vts, fs, ns, cs)
        vts, fs, ns, cs = CylinderGeometry(R1=5.1, height=20, color=(1,1,0), origin=(0,8,0))
        self.add_surf('cyl1', vts, fs, ns, cs)

        Origins=np.array([[0,0,0]])
        Radii   =np.array([0])
        Labels  = ['30']
        vtss, fss, pps, h, color = TextGeometry(Labels, Origins, Radii, 1.15, (0,1,1))
        self.add_mark('lab1', vtss, fss, pps, h, color)



#         # --- Add one ball
#         P1=(0,0,0)
#         P2=(0,15,30)
#         vts, fs, ns, cs, tmat = CylinderGeometryTwoPoints(P1, P2, R1=3, R2=3, color=(1,0,0))
#         self.manager.add_surf('cyl2', vts, fs, ns, cs, tmat=tmat)
#         vts, fs, ns, cs = SphereGeometry(P1, 1, color=(0,0,0))
#         self.manager.add_surf('P1', vts, fs, ns, cs)
#         vts, fs, ns, cs = SphereGeometry(P2, 1, color=(0,0,0))
#         self.manager.add_surf('P2', vts, fs, ns, cs)


if __name__ == '__main__':

    pass
