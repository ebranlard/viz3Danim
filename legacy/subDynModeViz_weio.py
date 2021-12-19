import sys
import os
import weio

# --------------------------------------------------------------------------------}
# ---  SubDyn to json
# --------------------------------------------------------------------------------{
def subDyn2Json(subDynSumFile):
    jsonFile=os.path.splitext(subDynSumFile)[0]+'.json'
    weio.FASTSummaryFile(subDynSumFile).toGraph().toJSON(jsonFile)

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

