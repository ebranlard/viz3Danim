import os
import sys
import wx
import numpy as np

from .GUIViewer3D import Viewer3DPanel
from .GUIlib import Warn, Error, MyExceptionHook, MyWxApp

PROG_NAME='viz3Danim'
PROG_VERSION='v0.01-local'

#===================================================================================================
class MainFrame(wx.Frame):
    def __init__(self, *args, **kwargs):
        sys.excepthook = MyExceptionHook

        style = wx.DEFAULT_FRAME_STYLE #| wx.NO_FULL_REPAINT_ON_RESIZE
        wx.Frame.__init__(self, parent=None, id=-1, title=PROG_NAME+' '+PROG_VERSION, style=style)

        self.Viewer3D = Viewer3DPanel(self)

        self.sizer = wx.BoxSizer()
        self.sizer.Add(self.Viewer3D , 1, wx.EXPAND)
        self.SetSizerAndFit(self.sizer)

        # --- Events
        self.Bind(wx.EVT_CLOSE, self.onClose)

        self.SetSize((500, 500))
        self.Center()
        self.Show()

    def onClose(self, event=None):
        try:
            self.Viewer3D.Destroy()
        except:
            pass
        event.Skip()
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

