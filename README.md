# viz3Danim

Visualize 3D animations in a web gui.
Input files are `json` files with an undocumented format for now, which may evolve. Example files are located in the `examples` folder. 

A live and active version of te web gui is available [here](https://ebranlard.github.io/viz3Danim/)

The live version opening an example file can be accessed [here](https://ebranlard.github.io/viz3Danim/index.html?load=examples/OC4_Jacket.sum.json).


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


### Some notes:
-	I'm aware that converting to json is a bit annoying..
-	The perspective and views of the GUI are not always well centered (you can "pan" with right click).
-	The Guyan modes have a default frequency of 1, the CB modes usually have a high frequency, so you need to use the frequency scaling  slider to slow them down (or holding the w and s keys). 
-	The diameter is estimated based on the area, so it’s not the actual diameter for now. 
