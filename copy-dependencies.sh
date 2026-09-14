#!/bin/bash

mkdir -p css js

cp node_modules/bootstrap/dist/css/bootstrap.min.css css/
cp node_modules/bootstrap/dist/js/bootstrap.bundle.min.js js/
cp node_modules/cytoscape/dist/cytoscape.min.js js/

echo "Dependencies copied successfully."