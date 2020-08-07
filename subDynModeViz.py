import sys
import numpy as np
import pandas as pd
import matplotlib.pyplot as plt
import json
import os
from io import open
# Local 
# import weio

# --------------------------------------------------------------------------------}
# ---  MiniYaml
# --------------------------------------------------------------------------------{
def yaml_read(filename):
    """
    read yaml files only supports:
       - Key value pairs: 
             key: value
       - Key with lists of lists:
             key:  
               - [0,1]
               - [0,1]
       - Comments are stripped based on first # found (in string or not)
       - Keys are found based on first : found (in string or not)
    """
    # Read all lines at once
    with open(filename, 'r', errors="surrogateescape") as f:
        lines=f.read().splitlines()

    d=dict()

    def cleanComment(l):
        """ remove comments from a line"""
        return l.split('#')[0].strip()

    def readDashList(iStart):
        """ """
        i=iStart
        while i<len(lines):
            l = lines[i].strip()
            if len(l)==0:
                iEnd=i-1
                break
            if l[0]=='-':
                iEnd=i
                i+=1
            else:
                iEnd=i-1
                break
        n=iEnd-iStart+1
        FirstElems = cleanComment(lines[iStart])[1:].replace(']','').replace('[','').split(',')
        FirstElems = np.array([v.strip() for v in FirstElems if len(v.strip())>0])
        try: 
            FirstElems=FirstElems.astype(int)
            mytype=int
        except:
            try: 
                FirstElems=FirstElems.astype(float)
                mytype=float
            except:
                raise Exception('Cannot convert line to float or int: {}'.format(lines[iStart]))
        M = np.zeros((n,len(FirstElems)), mytype)
        if len(FirstElems)>0:
            for i in np.arange(iStart,iEnd+1):
                elem = cleanComment(lines[i])[1:].replace(']','').replace('[','').split(',')
                M[i-iStart,:] = np.array([v.strip() for v in elem if len(v)>0]).astype(mytype)
        return M, iEnd+1

    i=0
    while i<len(lines):
        l=cleanComment(lines[i])
        i+=1;
        if len(l)==0:
            continue
        sp=l.split(':')
        if len(sp)==2 and len(sp[1].strip())==0:
            key=sp[0]
            array,i=readDashList(i)
            d[key]=array
        elif len(sp)==2:
            key=sp[0]
            val=sp[1]
            try:
                d[key]=int(val)
            except:
                try:
                    d[key]=float(val)
                except:
                    d[key]=val.strip()
        else:
            raise Exception('Line {:d} has colon, number of splits is {}, which is not supported: `{:s}`'.format(i,len(sp),l))
    return d




# --------------------------------------------------------------------------------}
# ---  SubDyn to json
# --------------------------------------------------------------------------------{
def subDyn2Json(subDynSumFile):

    def NodesDisp( IDOF, UDOF, maxDisp=None, sortDim=None):
        INodes = list(np.sort(np.unique(DOF2Nodes[IDOF,1]))) # NOTE: sorted
        nShapes = UDOF.shape[1]
        disp=np.empty((len(INodes),3,nShapes)); disp.fill(np.nan)
        pos=np.empty((len(INodes),3))         ; pos.fill(np.nan)
        for i,iDOF in enumerate(IDOF):
            iNode       = DOF2Nodes[iDOF,1]
            nDOFPerNode = DOF2Nodes[iDOF,2]
            nodeDOF     = DOF2Nodes[iDOF,3]
            iiNode      = INodes.index(iNode)
            if nodeDOF<=3:
                pos[iiNode, 0]=X[iNode-1]
                pos[iiNode, 1]=Y[iNode-1]
                pos[iiNode, 2]=Z[iNode-1]
                for iShape in np.arange(nShapes):
                    disp[iiNode, nodeDOF-1, iShape] = UDOF[i, iShape]
        # Scaling 
        if maxDisp is not None:
            for iShape in np.arange(nShapes):
                mD=np.nanmax(np.abs(disp[:, :, iShape]))
                if mD>1e-5:
                    disp[:, :, iShape] *= maxDisp/mD
        # Sorting according to a dimension
        if sortDim is not None: 
            I=np.argsort(pos[:,sortDim])
            INodes = np.array(INodes)[I]
            disp   = disp[I,:,:]
            pos    = pos[I,:]
        return disp, pos, INodes

    print('>>> Reading yaml file:',subDynSumFile)
    if os.path.splitext(subDynSumFile)[1].lower() != '.yaml':
        raise Exception('File etension should be .yaml, file:'+subDynSumFile)
    data =yaml_read(subDynSumFile)

    DOF2Nodes = data['DOF2Nodes']
    PhiM      = data['PhiM']
    PhiR      = data['PhiR']
    Nodes     = data['Nodes']
    Elements  = data['Elements']
    CB_freq   = data['CB_frequencies'].ravel()

    if DOF2Nodes.shape[1]==3:
        DOF2Nodes=np.column_stack((np.arange(DOF2Nodes.shape[0]),DOF2Nodes))
    else:
        DOF2Nodes[:,0]-=1
    Elements[:,0]-=1
    Elements[:,1]-=1
    Elements[:,2]-=1


    X,Y,Z=Nodes[:,1].astype(float),Nodes[:,2].astype(float),Nodes[:,3].astype(float)
    dx,dy,dz=np.max(X)-np.min(X), np.max(Y)-np.min(Y),np.max(Z)-np.min(Z)
    maxDisp = np.max([dx,dy,dz])*0.1

    DOF_B=data['DOF___B'].ravel()
    DOF_F=data['DOF___F'].ravel()
    DOF_K = (np.concatenate((DOF_B,data['DOF___L'].ravel(), DOF_F))-1).astype(int)

    # CB modes
    Phi_CB = np.vstack((np.zeros((len(DOF_B),PhiM.shape[1])),PhiM, np.zeros((len(DOF_F),PhiM.shape[1]))))
    dispCB, posCB, INodes = NodesDisp(DOF_K, Phi_CB, maxDisp=maxDisp)

    # Guyan modes
    Phi_Guyan = np.vstack((np.eye(len(DOF_B)),PhiR, np.zeros((len(DOF_F),PhiR.shape[1]))))
    dispGy, posGy, INodesGy = NodesDisp(DOF_K, Phi_Guyan, maxDisp=maxDisp)

    d=dict();
    d['Connectivity']=Elements[:,[1,2]].astype(int).tolist();
    d['Nodes']=Nodes[:,[1,2,3]].tolist()
    d['ElemProps']=[{'shape':'cylinder','type':int(Elements[iElem,5]),'Diam':np.sqrt(Elements[iElem,7]/np.pi)*4} for iElem in range(len(Elements))] # NOTE: diameter is cranked up
#  disp[iiNode, nodeDOF-1, iShape] = UDOF[i, iShape]

    d['Modes']=[
            {
                'name':'GY{:d}'.format(iMode+1),
                'omega':1,
                'Displ':dispGy[:,:,iMode].tolist()
            }  for iMode in range(dispGy.shape[2]) ]
    d['Modes']+=[
            {
                'name':'CB{:d}'.format(iMode+1),
                'omega':CB_freq[iMode]*2*np.pi, #in [rad/s]
                'Displ':dispCB[:,:,iMode].tolist()
            }  for iMode in range(dispCB.shape[2]) ]
# 
#   "Modes":[
#       {
#       "name":"Mode 1",
#       "omega":1,
#       "Displ":[
#           [10,0,0.0],
#           [50,0,0.0]
#       ]
#       },

    d['groundLevel']=np.min(Z) # TODO

    jsonFile=os.path.splitext(subDynSumFile)[0]+'.json'
    print('>>> Writing json file: ',jsonFile)
    with open(jsonFile, 'w', encoding='utf-8') as f:
        f.write(unicode(json.dumps(d, ensure_ascii=False))) #, indent=2)
        # json.dump(d, f, indent=2) 


# --------------------------------------------------------------------------------}
# --- Server 
# --------------------------------------------------------------------------------{
import signal
import socket
import threading
import webbrowser

if os.name == 'nt': # windows
    import win32api
    import win32con

# For python 2 and python 3 compatibility
if sys.version_info < (3, 0):
    from SimpleHTTPServer import SimpleHTTPRequestHandler
    from BaseHTTPServer import HTTPServer
else:
    from http.server import SimpleHTTPRequestHandler
    from http.server import HTTPServer
    raw_input = input


class StoppableHTTPServer(HTTPServer):
    """
    Overrides BaseHTTPServer.HTTPServer to include a stop
    function.
    """

    def __init__(self, server_address, RequestHandlerClass,
                 bind_and_activate=True):
        self._event = threading.Event()
        HTTPServer.__init__(self, server_address,
                            RequestHandlerClass, bind_and_activate)

    def server_bind(self):
        HTTPServer.server_bind(self)
        self.socket.settimeout(1)
        self._event.set()

    def get_request(self):
        while self._event.is_set():
            try:
                sock, addr = self.socket.accept()
                sock.settimeout(None)
                return (sock, addr)
            except socket.timeout:
                pass

    def stop(self):
        self._event.clear()

    def serve(self):
        while self._event.is_set():
            try:
                self.handle_request()
            except TypeError:
                # When server is being closed, while loop can run once
                # after setting self._event = False depending on how it
                # is scheduled.
                pass

    @property
    def running(self):
        return self._event.is_set()


class Server(object):
    """
    Parameters
    ----------
    port : integer
        Defines the port on which the server will run. If this port is
        already bind, then it increment 1 until it finds a free port.
    scene_file : name of the scene_file generated for visualization
        A Valid PyDy generated scene file in 'directory' parameter.
    directory : absolute path of a directory
        Absolute path to the directory which contains scene_file with
        all other static files.

    Example
    -------
    >>> server = Server(scene_file=_scene_json_file)
    >>> server.run_server()

    """
    def __init__(self, scene_file, directory="static/", port=8000):
        self.scene_file = scene_file
        self.port = port
        self.directory = directory
        self.httpd = None
        self._thread = None
        self._sigint_handler = None

    def run_server(self, headless=False):
        # Change dir to static first.
        os.chdir(self.directory)
        print(os.getcwd())

        # Get a free port
        while self._check_port(self.port):
            self.port += 1

        handler_class = SimpleHTTPRequestHandler
        server_class = StoppableHTTPServer

        protocol = "HTTP/1.0"
        server_address = ('127.0.0.1', self.port)
        handler_class.protocol_version = protocol
        self.httpd = server_class(server_address, handler_class)
        sa = self.httpd.socket.getsockname()
        print("Serving HTTP on", sa[0], "port", sa[1], "...")
        print("To view visualization, open:\n")
        url = ("http://localhost:" + str(sa[1]) + "/index.html?load=" +
               self.scene_file)
        print(url)
        if not headless:
            webbrowser.open(url)

        print("Press Ctrl+C to stop server...")
        self._register_sigint_handler()
        self._thread = threading.Thread(target=self.httpd.serve)
        self._thread.start()

    def _windows_ctrl_handle(self, event):
        if event == win32con.CTRL_C_EVENT:
            self._stop_server(signal.SIGINT, None)
            return 1 # don't call other handlers
        return 0

    def _register_sigint_handler(self):
        if os.name == 'nt': # windows
            def handle(event):
                if event == win32con.CTRL_C_EVENT:
                    self._stop_server(signal.CTRL_C_EVENT, None)
                    return 1 # don't call other handlers
                return 0
            self._handle = handle
            win32api.SetConsoleCtrlHandler(self._handle, 1)
        else:
            self._sigint_handler = signal.getsignal(signal.SIGINT)
            signal.signal(signal.SIGINT, self._stop_server)

    def _check_port(self, port):
        soc = socket.socket(socket.AF_INET, socket.SOCK_STREAM)
        result = soc.connect_ex(('127.0.0.1', port))
        return result == 0

    def _stop_server(self, signalnum, frame):
        """
        Confirms and stops the visualization server
        signalnum:
            signal number
        frame:
            None or a frame object

        """
        # restore previous SIGINT handler
        if os.name == 'nt': # windows
            win32api.SetConsoleCtrlHandler(self._handle, 0)
        else:
            if self._sigint_handler is not None:
                signal.signal(signal.SIGINT, self._sigint_handler)
                self._sigint_handler = None

        self.httpd.stop()
        self._thread.join()



# --------------------------------------------------------------------------------}
# ---Main  
# --------------------------------------------------------------------------------{

def abort_with_usage():
    print(""" 
usage: python subDynModeViz [--open] SUBDYN_sum.yaml

Create a json file with mode shapes from a Subdyn sum file. 
Potentially animate the modes in the browser.

where:
   SUBDYN_sum.yaml : summary file from subdyn 

options:
   --open : open in web browser, creates server.

    """)
    sys.exit(-1)

if __name__ == '__main__':
    if len(sys.argv) not in [2,3] :
        abort_with_usage()
    elif len(sys.argv) == 3 and sys.argv[1]!='--open' :
        abort_with_usage()
    elif len(sys.argv) == 3:
        subDyn2Json(sys.argv[2])
        # open server and launch it in browser
        filename = os.path.abspath(sys.argv[2])
        basedir=os.path.dirname(filename)
        scene_json_file = os.path.splitext(filename)[0]+'.json'
        scene_json_file = os.path.relpath(scene_json_file, basedir);
        server = Server(scene_file=scene_json_file, directory=basedir)
        server.run_server()

    elif len(sys.argv) == 2:
        subDyn2Json(sys.argv[1])

