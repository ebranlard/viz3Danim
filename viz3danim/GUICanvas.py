import wx
import wx.lib.delayedresult as delayedresult
import os
import moderngl
from threading import Thread
import time
try:
    from welib.tools.clean_exceptions import *
except:
    pass

haveOpenGL = False
haveManager = False
haveGLCanvas = False
try:
    from wx import glcanvas
    haveGLCanvas = True
except ImportError:
    pass
try:
    import moderngl
    haveModernGL = True
except ImportError:
    pass
try:
    # pip install PyOpenGL
    from OpenGL.GL import *
    from OpenGL.GLU import *
    haveOpenGL = True
except ImportError:
    pass

try:
    from .GLWrapper import Manager
    from .geometry import *
    haveManager = True
except ImportError:
    try:
        from GLWrapper import Manager
        from geometry import *
        haveManager = True
    except ImportError:
        pass
try:
    from .GLWrapper import Manager
except ImportError:
    from GLWrapper import Manager

print('haveOpenGL:   ',haveOpenGL)
print('haveModernGL: ',haveModernGL)
print('haveGLCanvas: ',haveGLCanvas)
print('haveManager:  ',haveManager)

class RefreshThread(Thread):
    def __init__(self, parent, canvas):
        Thread.__init__(self)
        self.parent=parent
        self.canvas=canvas
        self.start()    # start the thread
    def run(self):
        print('Thread running... ')
        while self.canvas.manager._animate:
            time.sleep(0.05) # <<<<<<<<<<<< This line needed
            self.canvas.Refresh()
        wx.CallAfter(self.done)
    def done(self):
        print('Tread done ')

#----------------------------------------------------------------------
class Canvas3D(glcanvas.GLCanvas):
    """ 
    Base class for 3D canvas
    """
    def __init__(self, parent, manager=None, **kwargs):
        # Create the canvas
        #glcanvas.GLCanvas.__init__(self, *args, **kwargs)
        #glcanvas.GLCanvas.__init__(self, parent, -1)
        attribList = (glcanvas.WX_GL_RGBA, glcanvas.WX_GL_DOUBLEBUFFER, glcanvas.WX_GL_DEPTH_SIZE, 24) # 24 bit
#         attribList = attribs = (glcanvas.WX_GL_CORE_PROFILE, glcanvas.WX_GL_RGBA, glcanvas.WX_GL_DOUBLEBUFFER, glcanvas.WX_GL_DEPTH_SIZE, 24)
        glcanvas.GLCanvas.__init__(self, parent, -1, attribList=attribList, **kwargs)

        if haveManager:
            if manager is not None:
                self.manager = manager
                manager.canvas=self
            else:
                print('Initializing manager')
                self.manager = Manager(self)
        else:
            self.manager = None

        # --- Data
        self.mainframe=parent
        self.init = False
        self.context = glcanvas.GLContext(self)
        self.animate=False
        # Initial mouse position.
        self.lastx = self.x = 30
        self.lasty = self.y = 30
        self.size = None
#         self.SetBackgroundStyle(wx.BG_STYLE_PAINT)

        # Set the event handlers.
        self.Bind(wx.EVT_ERASE_BACKGROUND,self.OnEraseBackground)
        self.Bind(wx.EVT_SIZE            ,self.OnSize           )
        self.Bind(wx.EVT_PAINT           ,self.OnPaint          )
        self.Bind(wx.EVT_LEFT_DOWN       ,self.OnMouseDown      )
        self.Bind(wx.EVT_LEFT_UP         ,self.OnMouseUp        )
        self.Bind(wx.EVT_RIGHT_DOWN      ,self.OnMouseDown      )
        self.Bind(wx.EVT_RIGHT_UP        ,self.OnMouseUp        )
        self.Bind(wx.EVT_MOUSEWHEEL      ,self.OnMouseWheel     )
        self.Bind(wx.EVT_MOTION          ,self.OnMouseMotion    )

    def OnEraseBackground(self, event):
        pass  # Do nothing, to avoid flashing on MSW.

    # ------------------------------------
    def InitGL(self):
        if haveManager:
            #print('InitGL')
            self.manager.InitGL()
            self.DoSetViewport()
            self.manager.set_pers()
        else:
            self._InitGL()

    def _InitGL(self):
        # To be implemented by subclass if no manager
        pass

    def OnPaint(self, event):
        dc = wx.PaintDC(self)
        self.SetCurrent(self.context)
        # This is a 'perfect' time to initialize OpenGL ... only if we need to
        if not self.init:
            self.InitGL()
            self.setBackgroundColor()
            self.init = True
        self.OnDraw()
        #event.Skip() # < Skipping is a bad idea

    def OnDraw(self):
        if haveManager:
            self.manager.onDraw(self.Size.width, self.Size.height)
            # >>> NOTE: comment for thread
            if self.manager._animate:
                self.Refresh()
        else:
            self._OnDraw()

        self.SwapBuffers()

    def _OnDraw(self):
        # To be implemented by subclass if no manager
        pass

    # ------------------------------------
    def onPlay(self):
        if haveManager:
            self.manager.onPlay()
        else:
            self.animate=True

        # >>> TODO Thread options
        # --- Option 1: thread
        #RefreshThread(self, self)
        # --- Option 2: delayed result
        #delayedresult.startWorker(self.canvas.onAnimDelayedEnd, self.canvas.onAnimDelayedStart, jobID=1)
        # --- Option 3: refreshloop
        #self.canvas.refreshAfter=True
        #self.canvas.Refresh() # set the canvas into an "infinite" refresh loop
        #delayedresult.startWorker(self.onAnimThreadEnd, self.onAnimStart, jobID=1)
        self.Refresh()

    def onPause(self):
        if haveManager:
            self.manager.onPause()
        else:
            self.animate=False

    def onStop(self):
        if haveManager:
            self.manager.onStop()
        else:
            self.animate=False

    def onAnimThreadEnd(self, thread):
        """ Consumer """
        jobID = thread.getJobID()

        result = thread.get()
        print('Result from jobID',jobID)

    def onAnimStart(self):
        print('Starting ')
        self.manager._animate=True
        while self.manager._animate:
            self.Refresh()

#    def onAnimAbort(self, thread):
#        jobID = thread.getJobID()
#        print('Aborting jobID',jobID)
#        self.animAbortEvent.set()
#
    #def onDoAnim(self, jobID, abort):



    # ------------------------------------
    def OnSize(self, event):
        #print('OnSize')
        if self.init:
            #    # Make sure the frame is shown before calling SetCurrent.
            #    self.mainframe.Show()
            #    self.SetCurrent(self.context)
            #    size = self.GetClientSize()
            #    self.DoSetViewportAlt(size.width, size.height)
            #    self.Refresh(False)
            wx.CallAfter(self.DoSetViewport)
            wx.CallAfter(lambda : self.Refresh(False))
            wx.CallAfter(lambda : self.SwapBuffers())
            if haveManager:
                wx.CallAfter(lambda : self.manager.set_pers())
        #self.Refresh(False)
        #self.OnDraw()
        event.Skip()

    def DoSetViewport(self):
        """Reshape the OpenGL viewport based on the dimensions of the window."""
        #print(self.GetContentScaleFactor())
        #print(self.GetClientSize())
        #print(self.mainframe.GetClientSize())
        #self.size = self.GetClientSize() 
        size = self.GetClientSize() * self.GetContentScaleFactor()
        self.SetCurrent(self.context)
        if haveManager:
            if self.manager is not None:
                #print('set View Port')
                #print(self.Size)
                self.manager.set_viewport(0, 0, self.Size.width, self.Size.height)
        else:
            glViewport(0, 0, self.Size.width, self.Size.height)

        #glMatrixMode(GL_PROJECTION)
        #glLoadIdentity()
        #glOrtho(-0.5, 0.5, -0.5, 0.5, -1, 1)
        #glMatrixMode(GL_MODELVIEW)
        #glLoadIdentity()

    def OnMouseDown(self, event):
        if self.HasCapture():
            self.ReleaseMouse()
        self.CaptureMouse()
        self.x, self.y = self.lastx, self.lasty = event.GetPosition()
#         self.CaptureMouse()
#         self.lastx, self.lasty = event.GetPosition()

    def OnMouseUp(self, event):
        if self.HasCapture():
            self.ReleaseMouse()

    def OnMouseMotion(self, event):
        #self.SetFocus()
        if event.Dragging() and event.LeftIsDown():
            if haveManager:
               x, y = event.GetPosition()
               dx, dy = x-self.lastx, y-self.lasty
               self.lastx, self.lasty = x, y
               angx = self.manager.angx - dx/200
               angy = self.manager.angy + dy/200
               #print('>>>Set Pers')
               self.manager.set_pers(angx=angx, angy=angy)
            else:
                self.lastx, self.lasty = self.x, self.y
                self.x, self.y = event.GetPosition()
            self.Refresh(False)
        if event.Dragging() and event.RightIsDown():
            if haveManager:
               x, y = event.GetPosition()
               dx, dy = np.float(x-self.lastx), np.float(y-self.lasty)
               self.lastx, self.lasty = x, y
               self.manager.set_pers(pan_xy=(dx/self.Size.width,dy/self.Size.height))
#         #    light = self.manager.light
        #    dx, dy = x-self.lastx, y-self.lasty
#         #    self.lastx, self.lasty = x, y
#         #    angx, angy = dx/200, dy/200
#         #    vx, vy, vz = self.manager.light
#         #    ay = math.asin(vz/math.sqrt(vx**2+vy**2+vz**2))-angy
#         #    xx = math.cos(angx)*vx - math.sin(angx)*vy
#         #    yy = math.sin(angx)*vx + math.cos(angx)*vy
#         #    ay = max(min(math.pi/2-1e-4, ay), -math.pi/2+1e-4)
#         #    zz, k = math.sin(ay), math.cos(ay)/math.sqrt(vx**2+vy**2)
#         #    self.manager.set_light((xx*k, yy*k, zz))
               self.Refresh(False)
# 


    def OnMouseWheel(self, event):
        if haveManager:
            k = 0.9 if event.GetWheelRotation()>0 else 1/0.9
            self.manager.set_pers(l=self.manager.l*k)
            self.Refresh(False)

    def setBackgroundColor(self,color=(0,0,0)):
        if not haveManager:
            glClearColor(color[0], color[1], color[2], 1)

    def save_bitmap(self, path):
        context = wx.ClientDC( self )
        memory  = wx.MemoryDC( )
        x, y    = self.ClientSize
        bitmap  = wx.Bitmap( x, y, -1 )
        memory.SelectObject( bitmap )
        memory.Blit( 0, 0, x, y, context, 0, 0)
        memory.SelectObject( wx.NullBitmap)
        bitmap.SaveFile( path, wx.BITMAP_TYPE_PNG )

    def save_stl(self, path):
        if haveManager:
            from stl import mesh
            objs = self.manager.objs.values()
            vers = [i.vts[i.ids] for i in objs if isinstance(i, Surface)]
            vers = np.vstack(vers)
            model = mesh.Mesh(np.zeros(vers.shape[0], dtype=mesh.Mesh.dtype))
            model.vectors = vers
            model.save(path)

if __name__ == '__main__':
    """ Load the Canvas 3D in a frame. The canvas is empty but ready to be "managed" 
    or inherited by a sub class that will actually "draw" using the _OnDraw method
    """
    app    = wx.App(False)
    frame  = wx.Frame(None, title = 'Test Canvas 3D')
    canvas = Canvas3D(frame)
    frame.Show()
    app.MainLoop()
