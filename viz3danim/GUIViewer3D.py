import os
import wx
import numpy as np
from .GUIlib import Warn, Error, MyExceptionHook, MyWxApp

# Implement File Drop Target class
class FileDropTarget(wx.FileDropTarget):
   def __init__(self, parent):
      wx.FileDropTarget.__init__(self)
      self.parent = parent

   def OnDropFiles(self, x, y, filenames):
      filenames = [f for f in filenames if not os.path.isdir(f)]
      filenames.sort()
      print(filenames)
      if len(filenames)>0:
          # If Ctrl is pressed we add
          bAdd= wx.GetKeyState(wx.WXK_CONTROL);
          self.parent.load_files(filenames,fileformat=None, add=False)
#           iFormat=self.parent.comboFormats.GetSelection()
#           if iFormat==0: # auto-format
#               Format = None
#           else:
#               Format = FILE_FORMATS[iFormat-1]
#           self.parent.load_files(filenames,fileformat=Format,bAdd=bAdd)
      return True

class Viewer3DPanel(wx.Panel):
    def __init__(self, parent, filenames, *args, **kwargs):
        from .GLWrapperObjects import ObjectsManager 
        from .GUIPanel3D import Panel3D

        wx.Panel.__init__(self, parent, *args, **kwargs)

        # --- Data
        self.parent  = parent
        self.manager = ObjectsManager()
        #self.manager.addMiscObjects()
        #self.manager.setAnimationCallBack(self.animCallBack, self)

        # --- GUI
        self.panel3D  = Panel3D(self, self.manager, hasAnimation=False) 
        self.objPanel = ObjectPanel(self, self.manager)

        # --- Layout
        self.sizer = wx.BoxSizer()
        self.sizer.Add(self.objPanel , 0, wx.EXPAND)
        self.sizer.Add(self.panel3D  , 1, wx.EXPAND)
        self.SetSizerAndFit(self.sizer)

        # --- Drop
        self.SetDropTarget(FileDropTarget(self))

        # --- Events

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

        # Testing Hack
        if filenames is not None:
            if not type(filenames) is list:
                filenames=[filenames]
            #filenames=['examples/Monopile.SD.sum.yaml']
            self.load_files(filenames,add=False)
        #self.demo()

    def demo(self):
        #filename='examples/MT100_SD.dat'
        #filename='examples/TetraSpar_SubDyn_v3.dat'
        filename='examples/Monopile.SD.sum.yaml'
        #filename='examples/MT100_HD.dat'
        self.load_files([filename],add=False)

    def load_files(self, filenames, fileformat=None, add=False):
        print('>>> Load',add, filenames[0])
        if add is False:
            self.manager.clearObjects()
        import weio.weio as weio
        from weio import WrongFormatError, FormatNotDetectedError
        #Graph = weio.FASTInputFile(filename).toGraph()
        try:
            f = weio.read(filenames[0])
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
            #self.panel3D.onPlay()
        else:
            self.panel3D.toggleAnimation(False)
        self.objPanel.post_load()


    # --- Keyboard shortcuts for handling mode animation
    def onFreqIncr(self, event=None):
        print('fi')
        self.manager.incrDT()
        event.Skip()

    def onFreqDecr(self, event=None):
        print('fd')
        self.manager.decrDT()
        event.Skip()

    def onAmplIncr(self, event=None):
        print('ai')
        self.manager.incrAmplitude()
        event.Skip()

    def onAmplDecr(self, event=None):
        print('ad')
        self.manager.decrAmplitude()
        event.Skip()


    def Destroy(self,event=None):
        print('Destroy')
        try:
            self.panel3D.destroyCanvas()
        except:
            pass
        super(Viewer3DPanel).Destroy(self)
        print('Done')

    def restartCanvas(self, event=None):
        self.panel3D.destroyCanvas()
        self.panel3D.createCanvas(self.manager)
        self.manager._animate=False


#===================================================================================================
class ObjectPanel(wx.Panel):
    """ 
    Manages Objects/graphs
    """
    def __init__(self, parent, manager,  *args, **kwargs):
        wx.Panel.__init__(self, parent, *args, **kwargs)
        # DATA
        self.parent=parent
        self.manager=manager

        # GUI
        self.btOpen    = wx.Button(self, label = "Open")
        self.btRestart = wx.Button(self, label = "Restart engine")
        #self.btCanvas =wx.ToggleButton(self,wx.ID_ANY, '', style=wx.BU_EXACTFIT)
        #self.button3 = wx.Button(self, label="Update")


        self.btOpen.Bind(wx.EVT_BUTTON, self.onOpen)
        self.btRestart.Bind(wx.EVT_BUTTON, self.parent.restartCanvas)
        #self.button3.Bind(wx.EVT_BUTTON, self.parent.updateCanvas)


        # --- Mode panel
        self.modePanel=wx.Panel(self)
        self.cbModes = wx.ComboBox(self.modePanel, -1, choices=['Mode 1','Mode 2','Mode 3'], style=wx.CB_READONLY)
        self.cbModeView= wx.ComboBox(self.modePanel, -1, choices=['Loop','Jump','Max'], style=wx.CB_READONLY)
        #msizer = wx.BoxSizer(wx.VERTICAL)
        msizer  = wx.FlexGridSizer(rows=2, cols=2, hgap=2, vgap=0)
        msizer.Add( wx.StaticText(self.modePanel, -1, 'Mode:'),0,flag = wx.ALIGN_LEFT|wx.ALIGN_CENTER_VERTICAL|wx.TOP|wx.BOTTOM, border = 1)
        msizer.Add( self.cbModes                              ,0,flag = wx.ALIGN_LEFT|wx.ALIGN_CENTER_VERTICAL|wx.TOP|wx.BOTTOM, border = 1)
        msizer.Add( wx.StaticText(self.modePanel, -1, 'View:'),0,flag = wx.ALIGN_LEFT|wx.ALIGN_CENTER_VERTICAL|wx.TOP|wx.BOTTOM, border = 1)
        msizer.Add( self.cbModeView                           ,0,flag = wx.ALIGN_LEFT|wx.ALIGN_CENTER_VERTICAL|wx.TOP|wx.BOTTOM, border = 1)
        #btSizer.Add(btClose    ,0,flag = wx.ALL|wx.EXPAND, border = 1)
        #btSizer.Add(self.btClear    ,0,flag = wx.ALL|wx.EXPAND, border = 1)
        #btSizer.Add(self.btComp,0,flag = wx.ALL|wx.EXPAND, border = 1)
        #btSizer.Add(self.btPlot     ,0,flag = wx.ALL|wx.EXPAND, border = 1)
        self.modePanel.SetSizer(msizer)



        # --- Option panel
        self.optPanel=wx.Panel(self)



        # --- Layout
        self.sizer = wx.BoxSizer(wx.VERTICAL)
        self.sizer.Add(self.btOpen ,   flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.optPanel, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.modePanel, flag=wx.BOTTOM, border=5)
        self.sizer.Add(self.btRestart, flag=wx.BOTTOM, border=5)

        self.border = wx.BoxSizer()
        self.border.Add(self.sizer, flag=wx.ALL | wx.EXPAND, border=5)

        self.SetSizerAndFit(self.border)

        self.cbModes.Bind(wx.EVT_COMBOBOX, self.onModeChange)
        self.cbModeView.Bind(wx.EVT_COMBOBOX, self.onModeViewChange)

    #-----------------------------------------------------------------------------------------------
    def Check1(self, e):
        print('check')

    def onModeChange(self, event=None):
        i=self.cbModes.GetSelection()
        self.manager.showMode(i)
        # Forcing update of cb
        self.cbModes.SetSelection(i) # Force update
        self.cbModes.Update() # Force update
        #if event is not None:
        #    event.Skip()

    def onModeViewChange(self, event=None):
        i=self.cbModeView.GetSelection()
        self.manager.setModeType(self.cbModeView.Value)
        if event is not None:
            if i==2:
                self.parent.panel3D.togglePlayPause(playOn=False)
            else:
                self.parent.panel3D.togglePlayPause(playOn=True)

        # Forcing update of cb
        #self.cbModes.SetSelection(i) # Force update
        #self.cbModes.Update() # Force update
        #if event is not None:
        #    event.Skip()



    def onOpen(self, event=None):
        #if iFormat==0: # auto-format
        #    Format = None
        #    #wildcard = 'all (*.*)|*.*'
        #    wildcard='|'.join([n+'|*'+';*'.join(e) for n,e in zip(FILE_FORMATS_NAMEXT,FILE_FORMATS_EXTENSIONS)])
        #    #wildcard = sFormat + extensions+'|all (*.*)|*.*'
        #else:
        #    Format = FILE_FORMATS[iFormat-1]
        #    extensions = '|*'+';*'.join(FILE_FORMATS[iFormat-1].extensions)
        #    wildcard = sFormat + extensions+'|all (*.*)|*.*'
        wildcard='all (*,*)|*.*'
        bAdd=False
        Format=None

        with wx.FileDialog(self, "Open file", wildcard=wildcard,
                style=wx.FD_OPEN | wx.FD_FILE_MUST_EXIST | wx.FD_MULTIPLE) as dlg:
           if dlg.ShowModal() == wx.ID_CANCEL:
               return     # the user changed their mind
           self.parent.load_files(dlg.GetPaths(),fileformat=Format,add=bAdd)
        #if event is not None:
        #    event.Skip()

    def post_load(self):
        print('post_load')

        #self.Freeze()

        # --- Set Modes if any
        Graph=self.manager.getObject(0) # Just one object, and graph for now
        if len(Graph.Modes)>0:
            modeNames = [d['name'] for d in Graph.Modes]
            #    d['omega']
            self.cbModes.Set(modeNames)
            self.cbModes.SetSelection(0)
            self.onModeChange()
            self.cbModeView.SetSelection(0)
            self.onModeViewChange()
            self.modePanel.Enable(True)
        else:
            self.modePanel.Enable(False)
            self.cbModes.Set([])

        #self.Thaw()

    def setModes(self, modes):
        pass
