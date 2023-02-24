import { initBuffers, updateBuffers } from "./init-buffers.js";
import { drawScene } from "./draw-scene.js";

//
// Initialize a shader program, so WebGL knows how to draw our data
//
function initShaderProgram(gl, vsSource, fsSource) {
  const vertexShader = loadShader(gl, gl.VERTEX_SHADER, vsSource);
  const fragmentShader = loadShader(gl, gl.FRAGMENT_SHADER, fsSource);

  // Create the shader program

  const shaderProgram = gl.createProgram();
  gl.attachShader(shaderProgram, vertexShader);
  gl.attachShader(shaderProgram, fragmentShader);
  gl.linkProgram(shaderProgram);

  // If creating the shader program failed, alert

  if (!gl.getProgramParameter(shaderProgram, gl.LINK_STATUS)) {
    alert(
      `Unable to initialize the shader program: ${gl.getProgramInfoLog(
        shaderProgram
      )}`
    );
    return null;
  }

  return shaderProgram;
}

//
// creates a shader of the given type, uploads the source and
// compiles it.
//
function loadShader(gl, type, source) {
  const shader = gl.createShader(type);

  // Send the source to the shader object

  gl.shaderSource(shader, source);

  // Compile the shader program

  gl.compileShader(shader);

  // See if it compiled successfully

  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    alert(
      `An error occurred compiling the shaders: ${gl.getShaderInfoLog(shader)}`
    );
    gl.deleteShader(shader);
    return null;
  }

  return shader;
}

function main() {
  const canvas = document.querySelector("#glcanvas");
  // Init the GL context
  const gl = canvas.getContext("webgl");

  // Only continue if WebGL is available and working
  if (gl === null) {
    alert(
      "Unable to initialize WebGL. Your browser or machine may not support it."
    );
    return;
  }

	// Vertex shader program
	const vsSource = `
		attribute vec4 aVertexPosition;
		attribute vec4 aVertexColor;
		uniform mat4 uModelViewMatrix;
		uniform mat4 uProjectionMatrix;
		varying lowp vec4 vColor;

		void main() {
			gl_Position = uProjectionMatrix * uModelViewMatrix * aVertexPosition;
			vColor = aVertexColor;
		}
	`;

	// Fragment shader program
	const fsSource = `
		varying lowp vec4 vColor;

		void main(void) {
			gl_FragColor = vColor;
		}
	`;

	// Initialize a shader program; this is where all the lighting
	// for the vertices and so forth is established.
	const shaderProgram = initShaderProgram(gl, vsSource, fsSource);

	// Collect all the info needed to use the shader program.
	// Look up which attributes our shader program is using
	// for aVertexPosition, aVertexColor and also
	// look up uniform locations.
	const programInfo = {
	  program: shaderProgram,
	  attribLocations: {
	    vertexPosition: gl.getAttribLocation(shaderProgram, "aVertexPosition"),
	    vertexColor: gl.getAttribLocation(shaderProgram, "aVertexColor"),
	  },
	  uniformLocations: {
	    projectionMatrix: gl.getUniformLocation(shaderProgram, "uProjectionMatrix"),
	    modelViewMatrix: gl.getUniformLocation(shaderProgram, "uModelViewMatrix"),
	  },
	};

	var slider = document.getElementById("tempSetting");
	let sliderVal = slider.value;
	slider.oninput = function() {
  	sliderVal = slider.value;
	}

	// Here's where we call the routine that builds all the
	// objects we'll be drawing.
	let buffers = initBuffers(gl,
		sliderVal, document.getElementById("useBinarySensing").checked);

	let last = 0;
	let isRendering = false;
	// Draw the scene repeatedly - 1s "steps"
	function render(now) {
		if (isRendering !== true) {
			return;
		}

  	if(!last || now - last >= 1000) {
			last = now;
			buffers = updateBuffers(gl,buffers,
															sliderVal,
															document.getElementById("useFusion").checked,
															document.getElementById("useBinarySensing").checked);
			drawScene(gl, programInfo, buffers);
		}
  	requestAnimationFrame(render);
	}

	function startRendering() {
		isRendering = true;
		requestAnimationFrame(render);
	}

	function stopRendering() {
		isRendering = false;
	}

	function resetBuffers() {
		buffers = initBuffers(gl);
	}

	document.getElementById("playButton").onclick = startRendering;
	document.getElementById("pauseButton").onclick = stopRendering;
	document.getElementById("resetButton").onclick = resetBuffers;
}

main();