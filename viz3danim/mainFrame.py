import os
import sys
from math import pi, sin, cos

import wx
from pyrr import Matrix44, matrix44, Vector3

import numpy as np

from .geometry import *

PROG_NAME='viz3Danim'
PROG_VERSION='v0.01-local'


#===================================================================================================
class ToolPanel(wx.Panel):
    def __init__(self, parent, canvas, *args, **kwargs):
        wx.Panel.__init__(self, parent, *args, **kwargs)
        self.mainframe=parent
        self.canvas = canvas

        self.btOpen  = wx.Button(self, label="Open")
        self.btAnim  = wx.Button(self, label="Animate")
        self.btStop  = wx.Button(self, label="Stop")
        self.button1 = wx.Button(self, label="Create")
        self.button2 = wx.Button(self, label="Destroy")
        self.button3 = wx.Button(self, label="Update")
        self.cbLabel = wx.CheckBox(self, label="Show Labels")
        self.Bind(wx.EVT_CHECKBOX, self.Check1)

        self.btOpen.Bind(wx.EVT_BUTTON, self.onOpen)
        self.button1.Bind(wx.EVT_BUTTON, self.mainframe.createCanvas)
        self.button2.Bind(wx.EVT_BUTTON, self.mainframe.destroyCanvas)
        self.button3.Bind(wx.EVT_BUTTON, self.mainframe.updateCanvas)
        self.btAnim.Bind(wx.EVT_BUTTON, self.onAnim)
        self.btStop.Bind(wx.EVT_BUTTON, self.onStop)

        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.sizer.Add(self.btOpen , flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.btAnim , flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.btStop , flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.button1, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.button3, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.button2, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.cbLabel)

        self.border = wx.BoxSizer()
        self.border.Add(self.sizer, flag=wx.ALL | wx.EXPAND, border=5)

        self.SetSizerAndFit(self.border)

        self.onOpen()

    #-----------------------------------------------------------------------------------------------
    def Check1(self, e):
        self.canvas.Axes(self.check1.Value)
        self.canvas.OnDraw()

    def onOpen(self, event=None):
        print('>>> Load')
        import weio
        from welib.fast.subdyn import subdyn_to_graph
        filename='MT100_SD.dat'
        filename='MT100_SD.dat'
        filename='TetraSpar_SubDyn_v3.dat'
        sd = weio.FASTInputFile(filename)
        Graph=subdyn_to_graph(sd)

        NodeRad=1.1
        NOrigins = []
        NLabels  = []
        NRadii   = []
        for n in Graph.Nodes:
            origin=[n.x,n.y,n.z]
            NOrigins.append(origin)
            NLabels.append(str(n.ID))
            NRadii.append(NodeRad)
            vts, fs, ns, cs = SphereGeometry((origin), NodeRad, color=(1,1,0))
            self.mainframe.manager.add_surf('Node'+str(n.ID), vts, fs, ns, cs)

        ElemRad=1
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
            ERadii.append(ElemRad*1.1)
            vts, fs, ns, cs, tmat = CylinderGeometryTwoPoints(P1, P2, R1=ElemRad, R2=3, color=(1,0,0))
            self.mainframe.manager.add_surf('Elem'+str(e.ID), vts, fs, ns, cs, tmat=tmat)

        # --- Labels
#         vtss, fss, pps, h, color = TextGeometry(NLabels, NOrigins, NRadii, NodeRad*1.5, (0,1,1))
#         self.mainframe.manager.add_mark('LabNodes', vtss, fss, pps, h, color)
#         vtss, fss, pps, h, color = TextGeometry(ELabels, EOrigins, ERadii, ElemRad*1.5, (0,1,1))
#         self.mainframe.manager.add_mark('LabElems', vtss, fss, pps, h, color)


#         vts, fs, ns, cs, tmat = CylinderGeometryTwoPoints(P1, P2, R1=3, R2=3, color=(1,0,0))
#         self.manager.add_surf('cyl2', vts, fs, ns, cs, tmat=tmat)
#         print(NLabels)
#         print(Graph)
#         print(ELabels)

    def onAnim(self, event):
        print('>>> anim')
        self.mainframe.manager.canvas.animate=True
        self.mainframe.manager.canvas.Refresh()

    def onStop(self, event):
        print('>>> stop')
        #self.mainframe.animate=False
        self.mainframe.manager.canvas.animate=False


#===================================================================================================
class MainFrame(wx.Frame):
    def __init__(self, *args, **kwargs):
        #wx.Frame.__init__(self, title='OpenGL', *args, **kwargs)
        from .GLWrapper import Manager 
        from .GUIPanel3D import Panel3D

        style = wx.DEFAULT_FRAME_STYLE | wx.NO_FULL_REPAINT_ON_RESIZE
        #super(GLFrame, self).__init__(parent, id, title, pos, size, style, name)
        wx.Frame.__init__(self, parent=None, id=-1, title=PROG_NAME+' '+PROG_VERSION, style=style)

        self.manager=Manager()
        self.manager.addMiscObjects()
        self.manager.setAnimationCallBack(self.animCallBack, self)

        self.t=0

        self.canvas=None
        self.panel = ToolPanel(self, canvas=self.canvas)
        self.panel3D = Panel3D(self, self.manager, hasAnimation=False) 

        self.sizer = wx.BoxSizer()
        #self.sizer.Add(self.canvas, 1, wx.EXPAND)

        self.sizer.Add(self.panel  , 0, wx.EXPAND)
        self.sizer.Add(self.panel3D, 1, wx.EXPAND)
        self.SetSizerAndFit(self.sizer)

        self.SetSize((500, 500))
        self.Center()
        self.Show()

        self.Bind(wx.EVT_CLOSE, self.onClose)

    def onClose(self,event=None):
        print('Destroy')
        try:
            self.panel3D.destroyCanvas()
        except:
            pass
        self.Destroy()
        print('Done')

    def createCanvas(self, event=None):
        self.panel3D.createCanvas(self.manager)

    def destroyCanvas(self, e):
        self.panel3D.destroyCanvas()
        self.sizer.Layout()

    def updateCanvas(self,event=None):
        pass
#         if self.manager is not None:
#             obj=self.manager.objs['ball']
#             #obj.tmat[0,3]+=0.1
#             rot_y = Matrix44.from_y_rotation(0.1)
#             obj.tmat= rot_y.dot(obj.tmat)
# 
#             obj=self.manager.objs['cyl1']
#             obj.tmat
#             rot_y = Matrix44.from_y_rotation(0.1)
#             obj.tmat= rot_y.dot(obj.tmat)
# 
# 
#             self.manager.Update()
# 
#             if self.animate:
#                 self.nextFrame()
#     def nextFrame(self):
#         self.updateCanvas()

    def animCallBack(self,objs):

        self.t+=0.001

        for obj in objs:
            obj.tmat[0,3]=10.0*np.sin(100*self.t)

# #         print('animCallBack', self.t)
# 
#         obj=self.manager.objs['ball']
#         obj.tmat[0,3]=10.0*np.sin(10*self.t)
# #         rot_y = Matrix44.from_y_rotation(0.0001)
# #         obj.tmat= rot_y.dot(obj.tmat)
# 
#         obj=self.manager.objs['cyl1']
#         obj.tmat
#         rot_y = Matrix44.from_y_rotation(0.01)
#         obj.tmat= rot_y.dot(obj.tmat)
# 



# --------------------------------------------------------------------------------}
# --- Wrapped WxApp
# --------------------------------------------------------------------------------{
class MyWxApp(wx.App):
    def __init__(self, redirect=False, filename=None):
        try:
            wx.App.__init__(self, redirect, filename)
        except:
            if wx.Platform == '__WXMAC__':
                #msg = """This program needs access to the screen.
                #          Please run with 'pythonw', not 'python', and only when you are logged
                #          in on the main display of your Mac."""
               msg= """
               MacOs Error
               """
            elif wx.Platform == '__WXGTK__':
                msg ="""
Error:
  Unable to access the X Display, is $DISPLAY set properly?
"""
            else:
                msg = 'Unable to create GUI' # TODO: more description is needed for wxMSW...
            raise SystemExit(msg)

def showApp():
    """
    The main function to start the data frame GUI.
    """
    app = MyWxApp(False)
    frame = MainFrame()
    app.MainLoop()



if __name__ == '__main__':
    pass

