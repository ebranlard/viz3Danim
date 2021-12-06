""" 
A generic Panel to include basic controls on a Canvas3D
The panel uses a "Manager" to draw on the canvas.

"""
import numpy as np
import wx
try:
    from welib.tools.clean_exceptions import *
except:
    pass

try:
    from .GUICanvas import Canvas3D , RefreshThread
except ImportError:
    from GUICanvas import Canvas3D , RefreshThread


# --------------------------------------------------------------------------------}
# --- Toolbar utils for backwards compatibilty 
# --------------------------------------------------------------------------------{
def TBAddCheckTool(tb, label, bitmap, callback=None, bitmap2=None):
    try:
        tl = tb.AddCheckTool( -1, bitmap1=bitmap, label=label )
        if callback is not None:
            tb.Bind(wx.EVT_TOOL, callback, tl)
        return tl
    except:
        pass
    tl = tb.AddLabelTool( -1, bitmap=bitmap, label=label )
    if callback is not None:
        tb.Bind(wx.EVT_TOOL, callback, tl)
    return tl

def TBAddBt(tb,label,bitmap,callback=None,Type=None, ID=wx.ID_ANY):
    """ Adding a toolbar tool, safe depending on interface and compatibility
    see also wx_compat AddTool in wx backends 
    """
    if bitmap is None:
        bt=wx.Button(tb,wx.ID_ANY, label, style=wx.BU_EXACTFIT)
        tl=tb.AddControl(bt)
        if callback is not None:
            tb.Bind(wx.EVT_BUTTON, callback, bt)
        return tl

    # Modern API
    if Type is None or Type==0:
        try:
            tl = tb.AddTool(wx.ID_ANY, bitmap=bitmap, label=label )
            if callback is not None:
                tb.Bind(wx.EVT_TOOL, callback, tl)
            return tl
        except:
            Type=None
    # Old fashion API
    if Type is None or Type==1:
        try:
            tl = tb.AddLabelTool(wx.ID_ANY, bitmap=bitmap, label=label )
            if callback is not None:
                tb.Bind(wx.EVT_TOOL, callback, tl)
            return tl
        except:
            Type=None
    # Using a Bitmap 
    if Type is None or Type==2:
        try:
            bt=wx.Button(tb,wx.ID_ANY, " "+label+" ", style=wx.BU_EXACTFIT)
            bt.SetBitmapLabel(bitmap)
            #b.SetBitmapMargins((2,2)) # default is 4 but that seems too big to me.
            #b.SetInitialSize()
            tl=tb.AddControl(bt)
            if callback is not None:
                tb.Bind(wx.EVT_BUTTON, callback, bt)
            return tl
        except:
            Type=None
    # Last resort, we add a button only
    bt=wx.Button(tb,wx.ID_ANY, label)
    tl=tb.AddControl(bt)
    if callback is not None:
        tb.Bind(wx.EVT_BUTTON, callback, bt)
    return tl

class Panel3D(wx.Panel):
    def __init__(self, parent, manager=None, hasAnimation=False, **kwargs):
        wx.Panel.__init__(self, parent, **kwargs)

        # --- Data
        self.parent = parent
        self.createCanvas(manager)
        self.hasAnimation = hasAnimation
        self._curObj = None

        # GUI Objects
        import platform
        ColPickSize=[(33, 38), (-1, -1)][platform.system() in ['Windows', 'Linux']]

        # --- Top Menu toolbar
        self.tbTopMenu = tb = wx.ToolBar(self, style=wx.TB_HORIZONTAL|wx.TB_HORZ_LAYOUT|wx.TB_FLAT)
        #TBAddBt(tb,"Add", wx.ArtProvider.GetBitmap(wx.ART_PLUS)) #,self.onAdd)
        TBAddBt(tb,"Save", wx.ArtProvider.GetBitmap(wx.ART_FILE_SAVE),self.onSave)
        tb.AddSeparator()
        tb.Realize() 

        # --- Top Time toolbar
        self.tbTopTime = tb = wx.ToolBar(self, style=wx.TB_HORIZONTAL|wx.TB_HORZ_LAYOUT|wx.TB_FLAT)
        self.btPlay  = TBAddBt(tb,"Play" , None, callback = self.onPlay )
        self.btPause = TBAddBt(tb,"Pause", None, callback = self.onPause)
        self.btStop  = TBAddBt(tb,"Stop" , None, callback = self.onStop )
        self.btLoop  = TBAddBt(tb,"Loop" , None, callback = self.onLoop )
        self._loop=True
        #self.cbLoop  = wx.CheckBox(tb, -1, 'Loop',(10,10))
        self.lbTime  = wx.StaticText(tb, -1, '      ' )
        #self.cbLoop.SetValue(True)
        #tb.AddControl(self.cbLoop )
        tb.AddControl(self.lbTime )
        tb.AddSeparator()
        tb.Realize() 

        # --- Top View toolbar
        self.tbTopView = tb = wx.ToolBar(self, style=wx.TB_HORIZONTAL|wx.TB_HORZ_LAYOUT|wx.TB_FLAT)
        tb.AddControl( wx.StaticText(tb, -1, 'View: ' ) )
        TBAddBt(tb,"x" , None, callback = lambda e : self.mngr.camView('x'))
        TBAddBt(tb,"y" , None, callback = lambda e : self.mngr.camView('y'))
        TBAddBt(tb,"z" , None, callback = lambda e : self.mngr.camView('z'))
        TBAddBt(tb,"Reset", None, callback = self.onCamReset)
        tb.AddSeparator()
        self.cbParaView = wx.CheckBox(tb, -1, 'Parallel',(10,10))
        tb.AddControl(self.cbParaView)
        tb.AddSeparator()
        tb.AddControl( wx.StaticText(tb, -1, 'Elements: ' ) )
        self.cbShowBox  = wx.CheckBox(tb, -1, 'Box',(10,10))
        self.cbShowAxes = wx.CheckBox(tb, -1, 'Axes',(10,10))
        self.cbShowLbl  = wx.CheckBox(tb, -1, 'Lbl',(10,10))
        self.cbShowBox.SetValue(True)
        self.cbShowAxes.SetValue(True)
        tb.AddControl(self.cbShowBox)
        tb.AddControl(self.cbShowAxes)
        tb.AddControl(self.cbShowLbl)
        tb.AddSeparator()
        self.colPick = wx.ColourPickerCtrl(tb, -1, wx.Colour(0, 0, 0), size=ColPickSize)
        tb.AddControl(self.colPick)
        tb.AddSeparator()
        # tb.AddStretchableSpace()
        # #bmp = wx.Bitmap('help.png') #wx.Bitmap("NEW.BMP", wx.BITMAP_TYPE_BMP) 
        tb.Realize() 

        # --- Bottom toolbar
        self.tbBot = tb = wx.ToolBar(self, style=wx.TB_HORIZONTAL|wx.TB_HORZ_LAYOUT|wx.TB_FLAT)
        tb.AddControl( wx.StaticText(tb, -1, 'Objects: ' ) )
        self.cbObjs = wx.ComboBox(tb, -1, choices=['None      '], style=wx.CB_READONLY)
        tb.AddControl(self.cbObjs)
        self.cbVisible = wx.CheckBox(tb, -1, 'visible')
        self.cbVisible.SetValue(True)
        tb.AddControl(self.cbVisible)
        self.colPickObj = wx.ColourPickerCtrl(tb, -1, wx.Colour(0,0,0), size=ColPickSize)
        tb.AddControl(self.colPickObj)
        tb.AddControl(wx.StaticText(tb, -1, 'Opacity: ' ) )
        self.slBlend = wx.Slider(tb, -1, 20, 0, 20, style=wx.SL_HORIZONTAL )
        tb.AddControl(self.slBlend)
        tb.AddControl(wx.StaticText(tb, -1, 'Mode: ' ) )
        self.cbMode = wx.ComboBox(tb, -1, choices=['Surface','Wireframe'], style=wx.CB_READONLY)
        tb.AddControl(self.cbMode)
        tb.Realize()
        self._objControls=[self.cbVisible, self.colPickObj, self.slBlend, self.cbMode]
        self._objNotPlay=[self.colPick, self.colPickObj]

        # --- Callbacks
        # self.button1.Bind(wx.EVT_BUTTON, self.mainframe.createCanvas)
        self.cbParaView.Bind(wx.EVT_CHECKBOX, lambda e: self.mngr.parallelView(self.cbParaView.Value))
        self.cbShowBox .Bind(wx.EVT_CHECKBOX, lambda e: self.mngr.showBox(self.cbShowBox.Value))
        self.cbShowAxes.Bind(wx.EVT_CHECKBOX, lambda e: self.mngr.showAxes(self.cbShowAxes.Value))
        self.cbShowLbl.Bind(wx.EVT_CHECKBOX, lambda e: self.mngr.showLbl(self.cbShowLbl.Value))
        self.colPick   .Bind(wx.EVT_COLOURPICKER_CHANGED, self.onBgColor )
        self.cbVisible .Bind(wx.EVT_CHECKBOX, self.onVisible)
        self.cbObjs    .Bind(wx.EVT_COMBOBOX, self.onSelectObj)
        self.slBlend   .Bind(wx.EVT_SCROLL  , self.onBlend)
        self.cbMode    .Bind(wx.EVT_COMBOBOX, self.onMode)
        #self.cbLoop    .Bind(wx.EVT_COMBOBOX, lambda e: self.mngr.loop(self.cbLoop.Value))
        self.colPickObj.Bind(wx.EVT_COLOURPICKER_CHANGED, self.onColor)



        # --- Layout
        self.hsizer = wx.BoxSizer(wx.HORIZONTAL)
        self.hsizer.Add(self.tbTopMenu, 0, wx.EXPAND |wx.ALL, 0 )
        self.hsizer.Add(self.tbTopTime, 0, wx.EXPAND |wx.ALL, 0 )
        self.hsizer.Add(self.tbTopView, 1, wx.EXPAND |wx.ALL, 0 )
        self.vsizer = wx.BoxSizer(wx.VERTICAL)
        self.vsizer.Add(self.hsizer , 0, wx.EXPAND |wx.ALL, 0 )
        self.vsizer.Add(self.canvas , 1, wx.EXPAND |wx.ALL, 0)
        self.vsizer.Add(self.tbBot  , 0, wx.EXPAND |wx.ALL, 0)

        # --- Triggers to init GUI
        self.toggleAnimation(self.hasAnimation)
        self.updateObjList()

        # --- Layout
        self.hsizer.Layout()
        self.SetSizerAndFit(self.vsizer )
        #self.Layout()


    # --- Interface for parents
    def createCanvas(self, manager=None):
        self.canvas = Canvas3D(self, manager)
        self.mngr   = self.canvas.manager
        if hasattr(self,'vsizer'):
            self.vsizer.Insert(1,self.canvas, 1, wx.EXPAND|wx.ALL, 0)
            self.vsizer.Layout()
            self.updateObjList()

    def destroyCanvas(self):
        self.canvas.Destroy()

    def toggleAnimation(self, anim=False):
        self.hasAnimation=anim
        print('>>>>',anim)
        if anim:
            self.tbTopTime.Show()
        else:
            self.tbTopTime.Hide()
        self.hsizer.Layout()

    def togglePlayPause(self, playOn=False):
        for ctrl in self._objNotPlay:
            ctrl.Enable(not playOn)
        pass


    # --- Animation
    def onPlay(self, event=None):
        for ctrl in self._objNotPlay:
            ctrl.Enable(False)
        self.canvas.onPlay()

        # >>> NOTE: uncomment for thread
        #self.mngr._animate=True
        #RefreshThread(self, self.canvas)
        #if event is not None:
        #    event.Skip()

    def onPause(self, event=None):
        self.canvas.onPause()

        for ctrl in self._objNotPlay:
            ctrl.Enable(True)

        #event.Skip()

    def onStop(self, event=None):
        self.canvas.onStop()

        for ctrl in self._objNotPlay:
            ctrl.Enable(True)

        #event.Skip()

    def onLoop(self, event=None):
        self._loop=not self._loop
        self.mngr.loop(self._loop)
        #event.Skip()

    # --- Events
    def onSave(self, evt):
        filt = 'PNG files (*.png)|*.png'
        dialog = wx.FileDialog(self, 'Save Picture', '', '', filt, wx.FD_SAVE)
        if dialog.ShowModal() == wx.ID_OK:
            path = dialog.GetPath()
            self.canvas.save_bitmap(path)
        dialog.Destroy()

    def onCamReset(self, event):
        self.cbParaView.SetValue(False) # TODO
        self.mngr.camReset()
        event.Skip()

    def onBgColor(self, event):
        c = tuple(np.array(event.GetColour()[:3])/255)
        self.mngr.setBackground(c)
        event.Skip()

    # --- Object edit
    def updateObjList(self):
        self.cbObjs.Set(['None']+self.mngr.getObjNames())
        self.cbObjs.SetSelection(self.cbObjs.Count-1)
        self.onSelectObj()

    def onSelectObj(self, event=None):
        objName=self.cbObjs.Value
        if objName.strip() == 'None':
            print('Disabling')
            self._curObj = None
            for ctrl in self._objControls:
                ctrl.Enable(False)
        else:
            self._curObj = self.mngr.getObj(objName)
            for ctrl in self._objControls:
                ctrl.Enable(True)
            self.cbVisible.SetValue(self._curObj.visible)
            color=np.atleast_2d(self._curObj.color)[0,:]*255
            self.colPickObj.SetColour((tuple(color)))
            self.slBlend.SetValue(int(self._curObj.blend*20))
            self.cbMode.SetSelection(['surface', 'wireframe'].index(self._curObj.mode))

    def onVisible(self, event):
        #print(event.IsChecked())
        if self._curObj:
            self._curObj.set_style(visible=event.IsChecked())
            self.canvas.Refresh(False)
        #event.Skip()

    def onBlend(self, event):
        blend=event.GetInt()/20.0
        #print('Blend',blend)
        if self._curObj:
            self._curObj.set_style(blend=blend)
            self.canvas.Refresh(False)
        event.Skip()

    def onMode(self, event):
        mode = self.cbMode.Value.lower()
        #print('Mode',mode)
        if self._curObj:
            self._curObj.set_style(mode=mode)
            self.canvas.Refresh(False)
        event.Skip()

    def onColor(self, event):
        c = tuple(np.array(event.GetColour()[:3])/255)
        #print('Color',c)
        if self._curObj:
            self._curObj.set_style(color = c)
            self.canvas.Refresh(False)


if __name__ == '__main__':
    app = wx.App(False)
    frame = wx.Frame(None, title='Panel 3D')
    panel = Panel3D(frame)
    sizer = wx.BoxSizer()
    sizer.Add(panel, 1, wx.EXPAND)
    frame.SetSizerAndFit(sizer)
    frame.SetSize((600, 600))
    frame.Center()
    frame.Show()
    app.MainLoop()
