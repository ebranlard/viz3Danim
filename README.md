# viz3Danim

Visualize 3D structures, mode shapes and animations.

Two different applications are provided:

  - a web browser app (.json files), see the active version [with an example](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket_All.sum.json) or  [without](https://ebranlard.github.io/viz3Danim/) 

  - a python app (.dat, .yaml), in beta


See documentation below for the Python app and Web App.





## Json file format
The input files are `.json` files.  The content of the file is faily simple: list of nodes, connectivity matrix defining elements, and nodal displacements for each modes/time series.
The format is undocumented for now, as it might evolve in the future. 
Example files are located in the `examples` folder of this repository. 


The `json` files can be generated using: 

 - SubDyn (part of [OpenFAST](https://github.com/openfast/openfast)). Setting the options `OutCBModes` and `OutFEMModes`, see [here](https://openfast.readthedocs.io/en/dev/source/user/subdyn/input_files.html#output-summary-and-outfile).

 - The python module `graph.py` and finite element (FEM) module of [welib](https://github.com/ebranlard/welib). See [examples](https://github.com/ebranlard/welib/tree/dev/welib/FEM/examples).



## Web App
A live and active version of the web GUI is available [here with an example](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket_All.sum.json) or [here without an example](https://ebranlard.github.io/viz3Danim/).

### Basic help

- To open a file in the Web App, simply dragging and drop a `json` file into your browser.

- For more help, look at "Menu -> Help", in particular for some keyboard shortcuts to scale the modes amplitudes and frequencies. 

### Keyboard shortcuts
a: increase amplitude
d: decrease amplitude
w: speed up 
s: slow down 



### Running the Web App locally.
You can run with Web App without internet. Simply clone this repository, install the dependencies (`python -m pip install -r requirements.txt`) and run `make server` from the root of the repository.
This should create a local web server and launch the local version of the web app into your browser.







## Python App (Beta)

The python app can open SubDyn and HydroDyn inputs files (.dat), and SubDyn yaml files (.yaml) to display the modes.

###Installation:
```bash
git clone --recurse-submodules http://github.com/ebranlard/viz3danim
cd viz3danim
python -m pip install -r requirements.txt
```

If you forgot the `recurse-submodules` flag, and you end up with errors that `weio` is missing, type the following:
```bash
git submodule update --init --recursive
```

###Running:
```bash
python viz3danim.py
```

Drag and drop files.







## SubDyn modes visualization (legacy)

The latest version of SubDyn can generate the '.json' file with Craig-Bampton, Guyan and FEM mode shapes.
Simply drag and drop the `.json` files into the browser.
There is no need to follow the step below.

### Generating a json file from a summary file:
There are two steps for now:
1.	Convert the yaml file to a "json" file, using a standalone python script called `subDynModeViz
2.	Load the json file into the web-gui, which requires a web-server (more on that later). 
We can make that 1 step in the future if needed.

For convenience the python script can launch step 2 automatically. 

The python script and web-app are located in this repository (i.e. [here](https://github.com/ebranlard/viz3Danim))


### Step 1 (and 2): 
-	To generate a json file:

      python subDynModeViz  File.sum.yaml  

-	To generate a json file, launch a web server and open the json file directly:

      python subDynModeViz  --open File.sum.yaml  

### Step 2 :
-	Option 1: use the [internet demo version](https://ebranlard.github.io/viz3Danim/) and open the json file there
-	Option 2: use the python script with `--open` flag to launch a local server 
-	Option 3: create your own local server and open the json file manually: 
```bash
      python -m http.server 8000   # launch a web server
      # then open a browser and navigate to https://localhost:8000/
```

### Current limitations:
- "json" format undocumented


