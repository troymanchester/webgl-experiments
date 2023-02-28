# WebGL Experiments

* [Random 2D Grid demo](https://github.com/troymanchester/webgl-experiments/tree/main/src/random-grid-demo)
* [Sensor Fusion Visualizer](https://github.com/troymanchester/webgl-experiments/tree/main/src/sensor-fusion-demo)

## Local Development
The lowest effort way to run the site locally on macOS is using PHP:
```shell
brew install php
cd webgl-experiments
php -S localhost:8080
```

You could also use macOS' Apache web server.

## Deploy
This site is hosted by Neocities - https://webgl-experiments.neocities.org/  
New commits will run a GH action that triggers the deploy workflow.
