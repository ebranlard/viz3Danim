all:
	python subDynModeViz.py TetraSpar.SD.sum.yaml
# 	python subDynModeViz.py Pendulum.SD.sum.yaml

server:
	python -m http.server 8080
