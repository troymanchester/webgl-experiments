function initBuffers(gl) {
	const objCount = 6724;
	const positionBuffers = initPositionBuffers(gl,objCount);
	const colorBuffers = initColorBuffers(gl,objCount);

	return {
		positions: positionBuffers,
		colors: colorBuffers,
		objectCount: objCount,
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

function initColorBuffers(gl, objCount) {
	let colorBuffers = [];
	let count = 0;

	while (count < objCount) {
		const colorArray = colorArrayFromRGB(Math.random(), Math.random(), Math.random());
		colorBuffers[count] = initGLBufferFromColorArray(gl, colorArray);
		count ++;
	}
  return colorBuffers;
}

function initPositionBuffers(gl, objCount) {
	let positionBuffers = [];
	let count = 0;
	let curX = -2.5;//-2.0
	let curY = 2.5;//2.0

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
		//const positions = [curX, curY, curX, curY+0.125, curX+0.125, curY, curX+0.125, curY+0.125];
		const positions = [curX, curY, curX, curY+0.0625, curX+0.0625, curY, curX+0.0625, curY+0.0625];
	
		// Now pass the list of positions into WebGL to build the
		// shape. We do this by creating a Float32Array from the
		// JavaScript array, then use it to fill the current buffer.
		gl.bufferData(gl.ARRAY_BUFFER, new Float32Array(positions), gl.STATIC_DRAW);

		positionBuffers[count] = positionBuffer;

		if ((count+1) % gridSize == 0) {
			//curY -= 0.25;
			//curY -= 0.125;

			curY -= 0.0625;
			//curY -= 0.09375;
			curX = -2.5;//-2.0
		} else {
			//curX += 0.25;
			//curX += 0.125;

			curX += 0.0625;
			//curX += 0.09375;
		}

		count ++;
	}

  return positionBuffers;
}

export { initBuffers };