import os
import sys
from math import pi, sin, cos

import wx
from pyrr import Matrix44, matrix44, Vector3

import numpy as np

from .geometry import *
from .GUIlib import Warn, Error, MyExceptionHook, MyWxApp

PROG_NAME='viz3Danim'
PROG_VERSION='v0.01-local'


# Implement File Drop Target class
class FileDropTarget(wx.FileDropTarget):
   def __init__(self, parent):
      wx.FileDropTarget.__init__(self)
      self.parent = parent

   def OnDropFiles(self, x, y, filenames):
      print(filenames)
      self.parent.load(filenames[0],add=False)
#       filenames = [f for f in filenames if not os.path.isdir(f)]
#       filenames.sort()
#       if len(filenames)>0:
#           # If Ctrl is pressed we add
#           bAdd= wx.GetKeyState(wx.WXK_CONTROL);
#           iFormat=self.parent.comboFormats.GetSelection()
#           if iFormat==0: # auto-format
#               Format = None
#           else:
#               Format = FILE_FORMATS[iFormat-1]
#           self.parent.load_files(filenames,fileformat=Format,bAdd=bAdd)
      return True

# class View3DPanel(wx.Panel):
#     def __init__(self, parent, *args, **kwargs):
#         wx.Panel.__init__(self, parent, *args, **kwargs)
#         self.mainframe=parent
#         self.canvas = canvas
# 
#         self.btOpen  = wx.Button(self, label="Open")
#         self.button1 = wx.Button(self, label="Create")
#         self.button2 = wx.Button(self, label="Destroy")
#         self.button3 = wx.Button(self, label="Update")
#         self.cbLabel = wx.CheckBox(self, label="Show Labels")
#         self.cbModes = wx.ComboBox(self, -1, choices=['Mode 1','Mode 2','Mode 3'], style=wx.CB_READONLY)
# 
# 
#         self.btOpen.Bind(wx.EVT_BUTTON, self.onOpen)
#         self.button1.Bind(wx.EVT_BUTTON, self.mainframe.createCanvas)
#         self.button2.Bind(wx.EVT_BUTTON, self.mainframe.destroyCanvas)
#         self.button3.Bind(wx.EVT_BUTTON, self.mainframe.updateCanvas)
# 
#         # --- Layout
#         self.sizer = wx.BoxSizer(wx.VERTICAL)
#         self.sizer.Add(self.btOpen , flag=wx.BOTTOM, border=5)
#         self.sizer.Add(self.button1, flag=wx.BOTTOM, border=5)
#         self.sizer.Add(self.button3, flag=wx.BOTTOM, border=5)
#         self.sizer.Add(self.button2, flag=wx.BOTTOM, border=5)
#         self.sizer.Add(self.cbModes, flag=wx.BOTTOM, border=5)
#         self.sizer.Add(self.cbLabel)
# 
#         self.border = wx.BoxSizer()
#         self.border.Add(self.sizer, flag=wx.ALL | wx.EXPAND, border=5)
# 
#         self.SetSizerAndFit(self.border)
# 
#         self.Bind(wx.EVT_CHECKBOX, self.Check1)
#         self.cbModes.Bind(wx.EVT_COMBOBOX, self.onModeChange)
# 
#         self.onOpen()
# 
# 

#===================================================================================================
class ToolPanel(wx.Panel):
    def __init__(self, parent, canvas, *args, **kwargs):
        wx.Panel.__init__(self, parent, *args, **kwargs)
        self.mainframe=parent
        self.canvas = canvas

        self.btOpen  = wx.Button(self, label="Open")
        self.button1 = wx.Button(self, label="Create")
        self.button2 = wx.Button(self, label="Destroy")
        self.button3 = wx.Button(self, label="Update")
        self.cbLabel = wx.CheckBox(self, label="Show Labels")
        self.cbModes = wx.ComboBox(self, -1, choices=['Mode 1','Mode 2','Mode 3'], style=wx.CB_READONLY)


        self.btOpen.Bind(wx.EVT_BUTTON, self.onOpen)
        self.button1.Bind(wx.EVT_BUTTON, self.mainframe.createCanvas)
        self.button2.Bind(wx.EVT_BUTTON, self.mainframe.destroyCanvas)
        self.button3.Bind(wx.EVT_BUTTON, self.mainframe.updateCanvas)

        # --- Layout
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.sizer.Add(self.btOpen , flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.button1, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.button3, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.button2, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.cbModes, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.cbLabel)

        self.border = wx.BoxSizer()
        self.border.Add(self.sizer, flag=wx.ALL | wx.EXPAND, border=5)

        self.SetSizerAndFit(self.border)

        self.Bind(wx.EVT_CHECKBOX, self.Check1)
        self.cbModes.Bind(wx.EVT_COMBOBOX, self.onModeChange)

        self.onOpen()

    #-----------------------------------------------------------------------------------------------
    def Check1(self, e):
        print('check')

    def onModeChange(self, event=None):
        i=self.cbModes.GetSelection()
        self.mainframe.manager._freq = i*5
        self.mainframe.manager._B = i
        print(i)


    def onOpen(self, event=None):
        filename='examples/MT100_SD.dat'
        filename='examples/TetraSpar_SubDyn_v3.dat'
        #filename='examples/Monopile.SD.sum.yaml'
        #filename='examples/MT100_HD.dat'
        self.load(filename)

    def load(self, filename, add=False):
        self.mainframe.load(filename=filename,add=add)

    def setModes(self, modes):
        pass

#===================================================================================================
class MainFrame(wx.Frame):
    def __init__(self, *args, **kwargs):
        #wx.Frame.__init__(self, title='OpenGL', *args, **kwargs)
        from .GLWrapper import Manager 
        from .GLWrapperObjects import ObjectsManager 
        from .GUIPanel3D import Panel3D

        sys.excepthook = MyExceptionHook

        style = wx.DEFAULT_FRAME_STYLE | wx.NO_FULL_REPAINT_ON_RESIZE
        #super(GLFrame, self).__init__(parent, id, title, pos, size, style, name)
        wx.Frame.__init__(self, parent=None, id=-1, title=PROG_NAME+' '+PROG_VERSION, style=style)

        self.manager=ObjectsManager()
        self.manager.addMiscObjects()
        #self.manager.setAnimationCallBack(self.animCallBack, self)

        self.canvas=None
        self.panel3D = Panel3D(self, self.manager, hasAnimation=False) 
        self.panel = ToolPanel(self, canvas=self.canvas)


        # --- Layout
        self.sizer = wx.BoxSizer()
        self.sizer.Add(self.panel  , 0, wx.EXPAND)
        self.sizer.Add(self.panel3D, 1, wx.EXPAND)
        self.SetSizerAndFit(self.sizer)

        # --- Drop
        self.SetDropTarget(FileDropTarget(self))


        # --- Events
        #self.Bind(wx.EVT_SIZE, self.OnResizeWindow)
        self.Bind(wx.EVT_CLOSE, self.onClose)

        # --- Shortcuts
        idFreqIncr=wx.NewId()
        idFreqDecr=wx.NewId()
        idAmplIncr=wx.NewId()
        idAmplDecr=wx.NewId()
        self.Bind(wx.EVT_MENU, self.onFreqIncr, id=idFreqIncr)
        self.Bind(wx.EVT_MENU, self.onFreqDecr, id=idFreqDecr)
        self.Bind(wx.EVT_MENU, self.onAmplIncr, id=idAmplIncr)
        self.Bind(wx.EVT_MENU, self.onAmplDecr, id=idAmplDecr)
        accel_tbl = wx.AcceleratorTable([
            (wx.ACCEL_NORMAL,  ord('w'), idFreqIncr ),
            (wx.ACCEL_NORMAL,  ord('s'), idFreqDecr ),
            (wx.ACCEL_NORMAL,  ord('a'), idAmplIncr ),
            (wx.ACCEL_NORMAL,  ord('d'), idAmplDecr )
            ]
            )
        self.SetAcceleratorTable(accel_tbl)


        self.SetSize((500, 500))
        self.Center()
        self.Show()

    def load(self, filename, add=False):
        print('>>> Load',add)
        if add is False:
            self.manager.clearObjects()
        import weio.weio as weio
        from weio import WrongFormatError, FormatNotDetectedError
        #Graph = weio.FASTInputFile(filename).toGraph()
        try:
            f = weio.read(filename)
        except WrongFormatError as e:
            raise e 
        try:
            Graph=f.toGraph()
        except:
            raise  

        self.manager.addGraph(Graph)
        self.manager.loadObjects()
        self.panel3D.updateObjList()

        if len(Graph.Modes)>0 or len(Graph.Motions)>0:
            self.panel3D.toggleAnimation(True)
        else:
            self.panel3D.toggleAnimation(False)


    def onFreqIncr(self, event=None):
        print('fi')
        self.manager._freq=self.manager._freq+0.1

    def onFreqDecr(self, event=None):
        print('fd')
        self.manager._freq=abs(self.manager._freq-0.1)

    def onAmplIncr(self, event=None):
        print('ai')
        self.manager._A+=0.1

    def onAmplDecr(self, event=None):
        print('ad')
        self.manager._A-=0.1


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
def showApp():
    """
    The main function to start the data frame GUI.
    """
    app = MyWxApp(False)
    frame = MainFrame()
    app.MainLoop()



if __name__ == '__main__':
    pass

