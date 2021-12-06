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
        self._Elem=[]

        self.ELabels=[]
        self.NLabels=[]

        self.t=0 # TODO use a time manager
        self.tMax=100 # TODO use a time manager
        self.dt=0.05 # TODO use a time manager
        self.dt0=0.05 # TODO use a time manager
        self._animate=False
        self._loop=True
        self._freq=0.4
        self._A=1
        self._B=0
        # ---
        self.animType='None'
        self.iMode   = -1
        self.iMotion = -1
        self.modeType='None'
    #folder.add(params, 'animID', [ 'Loop', 'Jumps', 'Max', 'None' ] ).name('Displ. ').onChange(animationSwitch);

        # --- Modes

    def clearObjects(self):
        for n in self.getObjNames():
            self.objs.pop(n, None)
        self.Objects=[]
        self.iMode   = -1
        self.iMotion = -1
        self._animate=False
        if self.canvas:
            self.canvas.Refresh(False)

    def getObject(self,i):
        return self.Objects[i]

    def addGraph(self, Graph):
        # Storing connectivity map and nodes position
        Graph.Connectivity = Graph.connectivity
        Graph.NodesP       = Graph.points
        self.Objects.append(Graph)

    def loadObjects(self, labels=True):
        self.objectsToScene(labels=labels)

    def objectsToScene(self, labels=True):
        for o in self.Objects:
            if hasattr(o, 'Elements'):
                self.graphToScene(o, labels=labels)
            else:
                raise Exception('Unknown object type')

    def graphToScene(self,Graph, labels=True):

        _DEFAULT={'object':'cylinder','D':1,'color':(0.5,0.3,0.3)}


        # --- Nodes
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
        #    vts, fs, ns, cs = SphereGeometry((origin), NodeRad, color=(1,1,0))
        #    self.add_surf('Node'+str(n.ID), vts, fs, ns, cs)

        # --- Elements
        EOrigins = []
        ELabels  = []
        ERadii   = []
        Graph.Obj3d=[]
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
                surf=self.add_surf('Elem'+str(e.ID), vts, fs, ns, cs, tmat=tmat)
                Graph.Obj3d.append(surf)
            else:
                raise Exception('Object type not implemented')
        # --- Labels
        NodeRad=np.mean(NRadii)
        ElemRad=np.mean(ERadii)
        NRadii=np.asarray(NRadii)*1.2
        ERadii=np.asarray(ERadii)*1.2
        #print('ERadii',ERadii)
        #print('NRadii',NRadii)
        #print('NodeRad',NodeRad)
        #print('ElemRad',ElemRad)
        vtss, fss, pps, h, color = TextGeometry(NLabels, NOrigins, NRadii, NodeRad*3.0, (0,0,1))
        self.NLabels=[vtss, fss, pps, h, color]
        vtss, fss, pps, h, color = TextGeometry(ELabels, EOrigins, ERadii, ElemRad*3.0, (1,0,0))
        self.ELabels=[vtss, fss, pps, h, color]

        #self.add_mark('LabNodes', self.NLabels[0], self.NLabels[1], self.NLabels[2], self.NLabels[3], self.NLabels[4])
        #self.add_mark('LabElems', self.ELabels[0], self.ELabels[1], self.ELabels[2], self.ELabels[3], self.ELabels[4])

#         vts, fs, ns, cs, tmat = CylinderGeometryTwoPoints(P1, P2, R1=3, R2=3, color=(1,0,0))
#         self.manager.add_surf('cyl2', vts, fs, ns, cs, tmat=tmat)


    def showMode(self, i):
        """ """
        self.iMode=i
        self.animType='Mode'
        self.time=0
        if not self._animate:
            try:
                self.setObjectsAtTime()
                self.redraw()
            except:
                print('draw failed')
                pass


    def setModeType(self, ModeType):
        self.modeType=ModeType

        if self.modeType=='Max':
            self._animate=False # NOTE: that doesn't change the canvas..
            try:
                self.setObjectsAtTime()
                self.redraw()
            except:
                print('draw failed')
                pass
#         if self.modeType in['Jump','Loop']:
#             self._animate=True


    def incrAmplitude(self):
        self.setAmplitude( self._A + 0.1*self._A);
    def decrAmplitude(self):
        self.setAmplitude( self._A - 0.1*self._A);
    def incrDT(self):
        self.setDt(self.dt + 0.1*self.dt);
    def decrDT(self):
        self.setDt(self.dt - 0.1*self.dt);

    def setAmplitude(self, ampl_in) :
        self._A = max(min(ampl_in, 10),0.001) 
        if not self._animate:
            self.setObjectsAtTime()
            self.redraw()

    def setDt(self, dt_in):
        self.dt = max(min(dt_in, 10),0.0001) 

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

        #print('setObjectsAtTime')

        if self.animType=='Mode':
            if self.modeType=='Jump':
                #fact=(np.round(self.t/3./self.dt*(np.mod(self.dt/self.dt0, 1) ))*2 -1)
                fact=(np.round(np.mod(self.t/(2),1))*2 -1)
            elif self.modeType=='Loop':
                fact =np.sin(2*np.pi*self._freq * self.t)
            elif self.modeType=='Max':
                fact=1
            else:
                raise Exception('Unknown mode type ',self.modeType)

            fact*=self._A

            for graph in self.Objects:
                Displ= graph.Modes[self.iMode]['data']
                # Compute tmat for each element
                for ie, (e,o,c) in enumerate(zip(graph.Elements, graph.Obj3d, graph.Connectivity)):
                    i1=c[0]
                    i2=c[1]
                    P10=graph.NodesP[i1,:]
                    P20=graph.NodesP[i2,:]

                    midP0= (P10+P20)/2
                    DP1=-fact*Displ[i1,:]
                    DP2=-fact*Displ[i2,:]

                    midDisp= (DP1+DP2)/2

                    P1 = P10+DP1
                    P2 = P20+DP2
                    #L_old = np.linalg.norm(P20-P10)
                    #L_new = np.linalg.norm(P2-P1)
                    #scale= L_new/L_old # NOTE we should scale cylinders along their length only..
                    #scale=1.0

                    t_rot= matrix44_map_vec_to_2points(P1, P2, P20-P10)
                    theta=np.pi/10
                    t_M2O = Matrix44.from_translation(-midP0).T  # Translation Mid to Origin 
                    t_O2M = Matrix44.from_translation(midP0).T  # Translation Origin2Mid
                    t_M2D = Matrix44.from_translation(midDisp).T  # Translation Due to displacements
                    #t_scl = Matrix44.from_scale([scale]*3).T
                    #o.tmat=t_M2D.dot(t_O2M.dot(t_scl.dot(t_rot.dot(t_M2O))))
                    o.tmat=t_M2D.dot(t_O2M.dot(t_rot.dot(t_M2O)))
        else:
            raise Exception('Unknown anim type',self.animType)
#         else:
#             for obj in self.getObjs():
#                 obj.tmat[0,2]=self._B*np.sin(self._freq*self.t)
#                 obj.tmat[0,3]=self._A*np.sin(self._freq*self.t)

    def animate(self):
        """ 
        Perform updates necessary for animation
        NOTE: do not call directly.
        This function will be called by draw which is called by the refresh of the canvas
        """
        if self._animate:
            self.t+=self.dt
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
        else:
            pass




