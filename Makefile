all:
	python subDynModeViz.py TetraSpar.SD.sum.yaml
# 	python subDynModeViz.py Main_Monopile-SoilDyn-Simple.SD.sum.yaml
# 	python subDynModeViz.py Main_OC4_Jacket_Decay.SD.sum.yaml
# 	python subDynModeViz.py Main_Spar.SD.sum.yaml
# 	python subDynModeViz.py Pendulum.SD.sum.yaml

json:
	python subDynModeViz.py --json-only TetraSpar.SD.sum.yaml
	python subDynModeViz.py --json-only Main_Monopile_Decay.SD.sum.yaml
	python subDynModeViz.py --json-only Main_OC4_Jacket_Decay.SD.sum.yaml
	python subDynModeViz.py --json-only Main_Spar.SD.sum.yaml
	python subDynModeViz.py --json-only Pendulum.SD.sum.yaml


server:
	python -m http.server 8080
