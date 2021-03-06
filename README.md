# viz3Danim

Visualize 3D animations and structures (for OpenFAST for now).

Two different applications are provided: a python app (.dat, .yaml), or a web browser app (.json files).

A live and active version of the web GUI is available [here](https://ebranlard.github.io/viz3Danim/)


See documentation below for the Python app and Web App.



# Python App

The python app can open SubDyn and HydroDyn inputs files (.dat), and SubDyn yaml files (.yaml) to display the modes.

##Installation:
```bash
git clone --recurse-submodules http://github.com/ebranlard/viz3danim
cd viz3danim
python -m pip install -r requirements.txt
```

If you forgot the `recurse-submodules` flag, and you end up with errors that `weio` is missing, type the following:
```bash
git submodule update --init --recursive
```

##Running:
```bash
python viz3danim.py
```

Drag and drop files.

## Keyboard shortcuts

a: increase amplitude
d: decrease amplitude
w: speed up 
s: slow down 




# Web App
Input files are `json` files with an undocumented format for now, which may evolve. Example files are located in the `examples` folder. 

A live and active version of the web GUI is available [here](https://ebranlard.github.io/viz3Danim/)

An example of this same live version with a loaded example file is available [here](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket.sum.json).


## Basic help

Look at "Menu -> Help", in particular for some keyboard shortcuts to scale the modes. 


## SubDyn modes visualization

This describes how to visualize the Guyan and CB modes in the SubDyn summary file.

### Testing it
If you want to try it out without cloning anything, some input files are located in the `examples` folder, you can drag and drop each of them to the web-app that I've hosted [here](https://ebranlard.github.io/viz3Danim/)

Look at "Menu -> Help", in particular for some keyboard shortcuts to scale the modes. 

### Doing it
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

## Notes

### Current limitations:
- Only for mode shape vizualization for now
- "json" format undocumented, and generated from SubDyn summary files only. 

### Some notes:
- The perspective and views of the GUI are not always well centered (you can "pan" with right click).
- The Guyan modes have a default frequency of 1, the CB modes usually have a high frequency, so you need to use the frequency scaling  slider to slow them down (or holding the w and s keys). 
- The diameter is estimated based on the area, so it’s not the actual diameter for now. 


