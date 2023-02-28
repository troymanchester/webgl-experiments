// this is used to "remember" the colors after we've written them to GL buffer.
let cachedColorArrays = [];

function initBuffers(gl, temperature, offlineSensors) {
	const objCount = 3025;
	const positionBuffers = initPositionBuffers(gl,objCount);
	const colorBuffers = initColorBuffers(gl,objCount, temperature, offlineSensors, false);

	return {
		positions: positionBuffers,
		colors: colorBuffers,
		objectCount: objCount,
	};
}

function updateBuffers(gl, buffers, temperature, offlineSensors, sensorFusionIterationCount) {
	// after init, do requested passes of sensor fusion
	let colorBuffers = initColorBuffers(gl,buffers.objectCount,temperature,offlineSensors);
	let count = 0;
	while (count < sensorFusionIterationCount) {
		colorBuffers = doSensorFusion(gl,buffers.objectCount,buffers.colors);
		count ++;
	}

	return {
		positions: buffers.positions,
		colors: colorBuffers,
		objectCount: buffers.objectCount,
	};
}

function colorArrayFromRGB(red,green,blue) {
	return [
		red, green, blue, 1.0,
		red, green, blue, 1.0,
		red, green, blue, 1.0,
		red, green, blue, 1.0,
	];
}

function initGLBufferFromColorArray(gl, colors) {
  const colorBuffer = gl.createBuffer();
  gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);
	return colorBuffer;
}

function initColorBuffers(gl, objCount, temperature, offlineSensors) {
	let colorBuffers = [];
	let count = 0;

	while (count < objCount) {
		// green is always 0 since we're using red-blue spectrum to represent temperature
		const green = 0.0;

		// noise can be in either direction (+ or -)
		let noise = (Math.random()-Math.random())*0.5;
		let red = temperature*0.01 + noise;
		let blue = 1 - red + noise;

		// Simulate some % of "dead" sensors
		if (Math.random()*100 < offlineSensors) {
			red = 0.0;
			blue = 0.0;
		}

		const colorArray = colorArrayFromRGB(red, green, blue);
		colorBuffers[count] = initGLBufferFromColorArray(gl, colorArray);

		// cache the "raw" array for use during sensor fusion.
		cachedColorArrays[count] = colorArray;
		count ++;
	}
  return colorBuffers;
}

// How to get neighboring cells from a 1D representation of a 2D square grid:
// above cell index = cur index - grid length (stay in bounds)
// below cell index = cur index + grid length (stay in bounds)
// left cell = cur index - 1 (only if cur index mod grid length != 0)
// right index = cur index + 1 (only if cur index + 1 mod grid length != 0)
// For edge cases, use wraparound logic (use the other side of the grid)
function getAbove(index, gridSize, objectCount, colorBuffers, offset) {
	if (index - gridSize < 0) {
		return colorBuffers[objectCount-gridSize+index][offset];
	} else {
		return colorBuffers[index-gridSize][offset];
	}
}

function getBelow(index, gridSize, objectCount, colorBuffers, offset) {
	if (index + gridSize > objectCount-1) {
		return colorBuffers[index%gridSize][offset];
	} else {
		return colorBuffers[index+gridSize][offset];
	}
}

function getLeft(index, gridSize, colorBuffers, offset) {
	if (index % gridSize == 0) {
		return colorBuffers[index+gridSize-1][offset];
	} else {
		return colorBuffers[index-1][offset];
	}
}

function getRight(index, gridSize, colorBuffers, offset) {
	if ((index+1) % gridSize == 0) {
		return colorBuffers[index-gridSize+1][offset];
	} else {
		return colorBuffers[index+1][offset];
	}
}

// Take the average of the current sensor reading with it's neighbors
function getAverageColorWithNeighbors(index, gridSize, objectCount, colorBuffers, offset) {
	return (colorBuffers[index][offset] +
				 getAbove(index,gridSize,objectCount,colorBuffers,offset) +
				 getBelow(index,gridSize,objectCount,colorBuffers,offset) +
				 getLeft(index,gridSize,colorBuffers,offset) +
				 getRight(index,gridSize,colorBuffers,offset))/5.0;
}

function doSensorFusion(gl, objectCount) {
	let newColorBuffers = [];
	let gridSize = Math.sqrt(objectCount);
	let updatedColorBuffersCache = [];
	let colorBuffers = cachedColorArrays;

	let count = 0;
	while (count < objectCount) {

		// This computes the "average" color of a cell with its 4 neighbors (above, below, left, right)
		// This is written for the general case (different colors in the array) even though
		// up above we only ever init the color array to all the same color.
  	const colorArray = [
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,0),
			getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,1),
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,2),
  	  1.0,
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,4),
			getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,5),
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,6),
  	  1.0,
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,8),
			getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,9),
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,10),
  	  1.0,
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,12),
			getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,13),
  	  getAverageColorWithNeighbors(count,gridSize,objectCount,colorBuffers,14),
  	  1.0,
  	];

		newColorBuffers[count] = initGLBufferFromColorArray(gl, colorArray);
		updatedColorBuffersCache[count] = colorArray;
		count ++;
	}

	cachedColorArrays = updatedColorBuffersCache;
	return newColorBuffers;
}

function initPositionBuffers(gl, objCount) {
	let positionBuffers = [];
	let count = 0;
	let curX = -2.5;
	let curY = 2.5;

	// TODO: would be nice if everything here was configurable via the simulator UI

	// Create a grid of squares, each 0.125 length/width
	// starting with negative X (and increasing) and positive Y (and decreasing)
	let gridSize = Math.sqrt(objCount)
	
	while (count < objCount) {
		// Create a buffer for the square's positions.
		const positionBuffer = gl.createBuffer();

		// Select the positionBuffer as the one to apply buffer
		// operations to from here out.
		gl.bindBuffer(gl.ARRAY_BUFFER, positionBuffer);
	
		// Now create an array of positions for the square.
		const positions = [curX, curY, curX, curY+0.0625, curX+0.0625, curY, curX+0.0625, curY+0.0625];
	
		// Now pass the list of positions into WebGL to build the
		// shape. We do this by creating a Float32Array from the
		// JavaScript array, then use it to fill the current buffer.
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		positionBuffers[count] = positionBuffer;

		if ((count+1) % gridSize == 0) {
			curY -= 0.09375;
			curX = -2.5;
		} else {
			curX += 0.09375;
		}

		count ++;
	}

  return positionBuffers;
}

export { initBuffers, updateBuffers };