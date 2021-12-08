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


# --- Rules for python app
test:
	python viz3danim.py


tests:
	python -m unittest discover -v

dep:
	python -m pip install -r requirements.txt

install:
	python setup.py install

installer:
	python -m nsist installer.cfg


# --- Rules for web app
sd2viz:
	python subDynModeViz.py --open examples/OC4_Jacket.sum.yaml
# 	python subDynModeViz.py --open examples/Main_Monopile-SoilDyn-Simple.SD.sum.yaml
# 	python subDynModeViz.py --open examples/TetraSpar.SD.sum.yaml
# 	python subDynModeViz.py --open examples/Main_Spar.SD.sum.yaml
# 	python subDynModeViz.py --open examples/Pendulum.SD.sum.yaml

sd2json:
	python subDynModeViz.py examples/TetraSpar.SD.sum.yaml
	python subDynModeViz.py examples/Main_Monopile_Decay.SD.sum.yaml
	python subDynModeViz.py examples/Main_OC4_Jacket_Decay.SD.sum.yaml
	python subDynModeViz.py examples/Main_Spar.SD.sum.yaml
	python subDynModeViz.py examples/Pendulum.SD.sum.yaml

server:
	python -m http.server 8080


# --- Common rules
clean:
	rm -rf __pycache__
	rm -rf *.egg-info
	rm -rf *.spec
	rm -rf build*
	rm -rf dist
