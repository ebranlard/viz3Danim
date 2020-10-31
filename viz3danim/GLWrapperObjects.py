import numpy as np
# from math import sin, cos, tan, pi
# import moderngl
# 

try:
    from .GLWrapper import Manager
    from .geometry import *
except ImportError:
    from GLWrapper import Manager
    from geometry import *


class ObjectsManager(Manager):
    def __init__(self,canvas=None):
        Manager.__init__(self, canvas=canvas)

        self.Objects=[]

        self.t=0 # TODO use a time manager
        self.tMax=100 # TODO use a time manager
        self._animate=False
        self._loop=True
        self._freq=10
        self._A=5
        self._B=0

    def clearObjects(self):
        for n in self.getObjNames():
            self.objs.pop(n, None)
        self.Objects=[]
        if self.canvas:
            self.canvas.Refresh(False)



    def addGraph(self, Graph):
        self.Objects.append(Graph)

    def loadObjects(self):
        self.objectsToScene()

    def objectsToScene(self):
        for o in self.Objects:
            if hasattr(o, 'Elements'):
                self.graphToScene(o)
            else:
                raise Exception('Unknown object type')

    def graphToScene(self,Graph):

        _DEFAULT={'object':'cylinder','D':1,'color':(0.5,0.3,0.3)}

        print('Graph', Graph)

        NOrigins = []
        NLabels  = []
        NRadii   = []
        for n in Graph.Nodes:
            try:
                NodeRad=e.data['D']/2*1.1
            except:
                NodeRad=_DEFAULT['D']/2*1.1

            origin=[n.x,n.y,n.z]
            NOrigins.append(origin)
            NLabels.append(str(n.ID))
            NRadii.append(NodeRad)
            vts, fs, ns, cs = SphereGeometry((origin), NodeRad, color=(1,1,0))
            self.add_surf('Node'+str(n.ID), vts, fs, ns, cs)

        EOrigins = []
        ELabels  = []
        ERadii   = []
        for e in Graph.Elements:
            n1=e.nodes[0]
            n2=e.nodes[1]
            P1=np.array([n1.x,n1.y,n1.z])
            P2=np.array([n2.x,n2.y,n2.z])
            origin=(P1+P2)/2
            EOrigins.append(origin)
            ELabels.append(str(e.ID))

            try: 
                objCol=e.data['color']
            except:
                objCol=_DEFAULT['color']

            try: 
                objType=e.data['object']
            except:
                objType=_DEFAULT['object']

            if objType=='cylinder':
                try:
                    Diam=e.data['D']
                except:
                    Diam=_DEFAULT['D']
                R1=Diam/2
                ERadii.append(R1*1.1)
                vts, fs, ns, cs, tmat = CylinderGeometryTwoPoints(P1, P2, R1=R1, R2=3, color=objCol)
                self.add_surf('Elem'+str(e.ID), vts, fs, ns, cs, tmat=tmat)
            else:
                raise Exception('Object type not implemented')

        # --- Labels
#         vtss, fss, pps, h, color = TextGeometry(NLabels, NOrigins, NRadii, NodeRad*1.5, (0,1,1))
#         self.add_mark('LabNodes', vtss, fss, pps, h, color)
#         vtss, fss, pps, h, color = TextGeometry(ELabels, EOrigins, ERadii, ElemRad*1.5, (0,1,1))
#         self.add_mark('LabElems', vtss, fss, pps, h, color)


#         vts, fs, ns, cs, tmat = CylinderGeometryTwoPoints(P1, P2, R1=3, R2=3, color=(1,0,0))
#         self.manager.add_surf('cyl2', vts, fs, ns, cs, tmat=tmat)
#         print(NLabels)
#         print(Graph)
#         print(ELabels)


    def loop(self,bLoop):
        self._loop=bLoop

    def onPlay(self):
        self._animate=True

    def onPause(self):
        self._animate=False

    def onStop(self):
        self._animate=False
        self.t=0.00
        self.setObjectsAtTime()

    def setObjectsAtTime(self):
        """ set the objects at their position at the time self.t """
        for obj in self.getObjs():
            obj.tmat[0,2]=self._B*np.sin(self._freq*self.t)
            obj.tmat[0,3]=self._A*np.sin(self._freq*self.t)

    def animate(self):
        """ 
        Perform updates necessary for animation
        NOTE: do not call directly.
        This function will be called by draw which is called by the refresh of the canvas
        """
        if self._animate:
            self.t+=0.01
            if self.t>self.tMax:
                if self._loop:
                    self._animate=True
                else:
                    self._animate=False
                    self.canvas.animate=False
                self.setObjectsAtTime()
                self.t=0
            else:
                self.setObjectsAtTime()




