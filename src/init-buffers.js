// this is a hack to "remember" the colors used after we've written them to GL buffer..
let cachedColorBuffers = [];

function initBuffers(gl, initialVal, useBinaryReadings) {
	const objCount = 256
	const positionBuffers = initPositionBuffers(gl,objCount);
	const colorBuffers = initColorBuffersNoGreen(gl,objCount, initialVal, useBinaryReadings);

	return {
		positions: positionBuffers,
		colors: colorBuffers,
		objectCount: objCount,
	};
}

function updateBuffers(gl, buffers, initialVal, useFusion, useBinaryReadings) {
	let colorBuffers;
	if (useFusion) {
		// after init, do 1 pass of sensor fusion
		colorBuffers = initColorBuffersNoGreen(gl,buffers.objectCount,initialVal,useBinaryReadings);
		colorBuffers = doSensorFusion(gl,buffers.objectCount,buffers.colors);
	} else {
		colorBuffers = initColorBuffersNoGreen(gl,buffers.objectCount,initialVal,useBinaryReadings);
	}

	return {
		positions: buffers.positions,
		colors: colorBuffers,
		objectCount: buffers.objectCount,
	};
}

function initColorBuffersNoGreen(gl, objCount, initialVal, binary) {
	let colorBuffers = [];
	let count = 0;

	while (count < objCount) {
		let _r;
		const _g = 0.0;
		let _b;

		// TODO pull this logic into a helper - pass RGB vals into this function
		if (binary) {
			if (Math.random()*100 > 50) {
				_r = 1.0;
				_b = 0.0;
			} else {
				_r = 0.0;
				_b = 1.0;
			}
		} else {
			// noise can be in either direction (+ or -)
			let noise = (Math.random()-Math.random())*0.5;
			_r = initialVal*0.01 + noise;
			_b = 1 - _r + noise;
		}
		
  	const colors = [
  	  _r,
  	  _g,
  	  _b,
  	  1.0,
  	  _r,
  	  _g,
  	  _b,
  	  1.0,
  	  _r,
  	  _g,
  	  _b,
  	  1.0,
  	  _r,
  	  _g,
  	  _b,
  	  1.0,
  	];

  	const colorBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

		colorBuffers[count] = colorBuffer;
		// cache the "raw" array for use later!
		cachedColorBuffers[count] = colors;
		count ++;
	}
  return colorBuffers;
}

// how to get neighboring cells from a 1D representation of a 2D square grid:
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
	let colorBuffers = cachedColorBuffers;

	// would be nice if everything here was parameterized!

	let count = 0;
	while (count < objectCount) {

		// This computes the "average" color of a cell with its 4 neighbors (above, below, left, right)
  	const colors = [
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

  	const colorBuffer = gl.createBuffer();
  	gl.bindBuffer(gl.ARRAY_BUFFER, colorBuffer);
  	gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(colors), gl.STATIC_DRAW);

		newColorBuffers[count] = colorBuffer;
		updatedColorBuffersCache[count] = colors;
		count ++;
	}

	cachedColorBuffers = updatedColorBuffersCache;
	return newColorBuffers;
}

function initPositionBuffers(gl, objCount) {
	let positionBuffers = [];
	let count = 0;
	let curX = -2.0;
	let curY = 2.0;

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
		const positions = [curX, curY, curX, curY+0.125, curX+0.125, curY, curX+0.125, curY+0.125];
	
		// Now pass the list of positions into WebGL to build the
		// shape. We do this by creating a Float32Array from the
		// JavaScript array, then use it to fill the current buffer.
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		positionBuffers[count] = positionBuffer;

		if ((count+1) % gridSize == 0) {
			curY -= 0.25;
			curX = -2.0;
		} else {
			curX += 0.25;
		}

		count ++;
	}

  return positionBuffers;
}

export { initBuffers, updateBuffers };