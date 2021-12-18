# --- Detecting OS
ifeq '$(findstring ;,$(PATH))' ';'
    detected_OS := Windows
else
    detected_OS := $(shell uname 2>/dev/null || echo Unknown)
    detected_OS := $(patsubst CYGWIN%,Cygwin,$(detected_OS))
    detected_OS := $(patsubst MSYS%,MSYS,$(detected_OS))
    detected_OS := $(patsubst MINGW%,MSYS,$(detected_OS))
endif



all: test

sd2viz:
	python legacy/subDynModeViz.py --open examples/OC4_Jacket.sum.yaml

sd2json:
	python legacy/subDynModeViz.py examples/TetraSpar.SD.sum.yaml
	python legacy/subDynModeViz.py examples/Main_Monopile_Decay.SD.sum.yaml
	python legacy/subDynModeViz.py examples/Main_OC4_Jacket_Decay.SD.sum.yaml
	python legacy/subDynModeViz.py examples/Main_Spar.SD.sum.yaml
	python legacy/subDynModeViz.py examples/Pendulum.SD.sum.yaml

server:
	python webapp.py 


clean:
	rm -rf __pycache__
	rm -rf *.egg-info
