[![Build status](https://github.com/ebranlard/viz3danim/workflows/Tests/badge.svg)](https://github.com/ebranlard/viz3danim/actions?query=workflow%3A%22Tests%22)
<a href="https://www.buymeacoffee.com/hTpOQGl" rel="nofollow"><img alt="Donate just a small amount, buy me a coffee!" src="https://warehouse-camo.cmh1.psfhosted.org/1c939ba1227996b87bb03cf029c14821eab9ad91/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f446f6e6174652d4275792532306d6525323061253230636f666665652d79656c6c6f77677265656e2e737667"></a>
# viz3Danim

Interactive visualization of 3D structures, mode shapes and animations, using a json file format (described [here](#json-file-format)).


[![Demo](/../main/ressources/figs/demo.gif)](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket_All.sum.json)


This program is a "web app", meaning that it can run in a web browser, with no installation needed.
The app can be run without internet on your local machine (provided you have python installed).

For convenience, we provide a live and active version hosted on github.io, [with an example](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket_All.sum.json) or  [without example](https://ebranlard.github.io/viz3Danim/).

NOTE: no files are stored on the server, no cookies are used, everything is run on the client side. It should be safe to use confidential files on this live version. For increased privacy, see [how to run the Web App locally](#running-the-web-app-locally).

A python app is in development [here](https://github.com/ebranlard/pyviz3danim) but is still in "beta".


## Json file format
The input files are `.json` files. You can see [a simple example](#a-simple-example-of-json-file) below, and more advanced examples in the [examples](/examples/) directory of this repository.

The content of the file is as follows: 

  - `Nodes`: a list of nodal coordinates (x,y,z) for each node
  - `Connectivity`: a connectivity matrix providing the node indices defining each element (for now elements consists of two nodes)
  - `ElemeProps`: properties for each element
  - `Modes`: optional field providing the modes of the structure. 
  - `TimeSeries`: optional field providing the time series of displacements of the structure.
The format is mostly undocumented for now, it might evolve in the future. 
Example files are located in the `examples` folder of this repository. 

The `.json` files can be generated using: 

 - SubDyn (part of [OpenFAST](https://github.com/openfast/openfast)). Setting the options `OutCBModes` and `OutFEMModes`, see [here](https://openfast.readthedocs.io/en/dev/source/user/subdyn/input_files.html#output-summary-and-outfile).

 - The python module `graph.py` and finite element (FEM) module of [welib](https://github.com/ebranlard/welib). See the [welib FEM examples](https://github.com/ebranlard/welib/tree/dev/welib/FEM/examples).


### A simple example of Json file:

Below is an example of json file where a triangle, made of three nodes and three elements.
Two "modes" are included, where the base of the triangle moves rigidly along the x or y direction.
```json
{"Connectivity":[
      [0, 1],
      [1, 2],
      [2, 0]
  ],
 "Nodes": [
      [ 0.0, 0.0, 1.0],
      [ 0.0,-0.25, 0.0], 
      [ 0.0, 0.25, 0.0]
 ],
 "ElemProps": [
      {"shape": "cylinder", "Diam": 0.1},
      {"shape": "cylinder", "Diam": 0.2},
      {"shape": "cylinder", "Diam": 0.1}
  ],
  "Modes": {
      "defaultSet": [
          {"name": "Mode1", "Displ": [[0.0, 0.0, 0.0], [0.3, 0.0, 0.0], [0.3, 0.0, 0.0]]},
          {"name": "Mode2", "Displ": [[0.0, 0.0, 0.0], [0.0, 0.3, 0.0], [0.0, 0.3, 0.0]]}
      ]
  }
}
```
Loading this `json` file results in the following 3d visualization (click on the image to visualize the mode in the live version of the web app):


[<img alt="alt_text" width="300px" src="/../main/ressources/figs/triangle.png" />](https://ebranlard.github.io/viz3Danim/index.html?load=examples/triangle.json)



## Using the Web App
A live and active version of the web GUI is available [here with an example](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket_All.sum.json) or [here without an example](https://ebranlard.github.io/viz3Danim/).

You can also launch a local version of the Web App on your machine, without the need for an internet connection. See [how to run the Web App locally](#running-the-web-app-locally).


### Basic help

- To open a file in the Web App, simply drag and drop a `json` file into your browser. You can alternatively use the the dropdown menu "Menu > Load"

- For more help, look at "Menu -> Help", in particular for some keyboard shortcuts to scale the modes amplitudes and frequencies. 

### Keyboard shortcuts
a: increase amplitude of modes
d: decrease amplitude of modes
w: speed up modes or animation
s: slow down modes or animation



### Running the Web App locally.
You can run with Web App locally and without internet for convenience and confidentiality is of concern.
Simply clone this repository and from the root of this repository run:
```bash
python webapp.py
```
This should create a local web server and launch the local version of the web app into your browser.
If your browswer does not open automatically, open it, and navigate to `https://localhost:1337/`.






## SubDyn modes visualization (legacy)

The latest version of SubDyn (part of [OpenFAST](https://github.com/openfast/openfast)) can generate the '.json' file with Craig-Bampton, Guyan and FEM mode shapes by setting the options `OutCBModes` and `OutFEMModes`, in the SubDyn input file (see [here](https://openfast.readthedocs.io/en/dev/source/user/subdyn/input_files.html#output-summary-and-outfile)). After running SubDyn, simply drag and drop the generated `.json` files into the browser. There is no need to follow the step below which are for older version of SubDyn.

### Generating a json file from a SubDyn summary file:
There are two steps for now:
1.	Convert the yaml file to a "json" file, using a standalone python script called `subDynModeViz` located in the `legacy` folder`
2.	Load the json file into the web-gui, which requires a web-server (more on that later). 
We can make that 1 step in the future if needed.

For convenience the python script can launch step 2 automatically. 

The python script and web-app are located in this repository (i.e. [here](https://github.com/ebranlard/viz3Danim))


### Step 1 (and 2): 
-	To generate a json file:

      python legacy/subDynModeViz  File.sum.yaml  

-	To generate a json file, launch a web server and open the json file directly:

      python legacy/subDynModeViz  --open File.sum.yaml  

### Step 2 :
-	Option 1: use the [internet demo version](https://ebranlard.github.io/viz3Danim/) and open the json file there
-	Option 2: use the python script with `--open` flag to launch a local server 
-	Option 3: create your own local server and open the json file manually: 
```bash
      python legacy/subdynModeViz --open  # launch a web server on port 1337
      # then open a browser and navigate to https://localhost:1337/
```




# Debugging

Most browser can open a debugging console by pressing `Ctrl+Shift+J`. Error messages from javascript will be reported in the Console window, together with some log outputs from the app.

To force reload the webapp use `Ctrl-F5`, this will reload all the files included (otherwise cached versions are used).



# Contributing
Any contributions to this project are welcome! If you want to add a feature to this program or report a bug, the best approach would be to open an issue and start the discussion there.


If you find this project useful, you can also buy me a coffee (donate a small amount) with the link below:

<a href="https://www.buymeacoffee.com/hTpOQGl" rel="nofollow"><img alt="Donate just a small amount, buy me a coffee!" src="https://warehouse-camo.cmh1.psfhosted.org/1c939ba1227996b87bb03cf029c14821eab9ad91/68747470733a2f2f696d672e736869656c64732e696f2f62616467652f446f6e6174652d4275792532306d6525323061253230636f666665652d79656c6c6f77677265656e2e737667"></a>
