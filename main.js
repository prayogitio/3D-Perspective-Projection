const canvas = document.getElementById('scene');
document.body.style.cursor = "none";

let width = canvas.offsetWidth;
let height = canvas.offsetHeight;

const ctx = canvas.getContext('2d');

let PERSPECTIVE = width * 0.8;
let PROJECTION_CENTER_X = width / 2;
let PROJECTION_CENTER_Y = height / 2;

const cubes = [];
var targettedCubes = [];
var angle = degree_to_radian(1);
var lastMouseXPos = 0;
var lastMouseYPos = 0;
const mouseSensitivity = 0.7;
var showCollisionCircles = false;
var showHelp = false;

class Vector {
	constructor(x = 0, y = 0, z = 0) {
		this.x = x;
		this.y = y;
		this.z = z;
	}
}

function vector_scale(a, k) {
	return new Vector(a.x * k, a.y * k, a.z * k);
}

function vector_addition(a, b) {
	return new Vector(a.x + b.x, a.y + b.y, a.z + b.z);
}

function vector_subtract(a, b) {
	return new Vector(a.x - b.x, a.y - b.y, a.z - b.z);
}

function vector_length(a) {
	return Math.sqrt(a.x * a.x + a.y * a.y + a.z * a.z);
}

function vector_normalize(a) {
	const vectorLength = vector_length(a);
	return new Vector(a.x / vectorLength, a.y / vectorLength, a.z / vectorLength);
}

function vector_cross_product(a, b) {
	return new Vector(a.y * b.z - a.z * b.y, a.z * b.x - a.x * b.z, a.x * b.y - a.y * b.x);
}

function vector_dot_product(a, b) {
	return a.x * b.x + a.y * b.y + a.z * b.z;
}

function degree_to_radian(a) {
	return a * Math.PI / 180;
}

class Camera {
	constructor() {
		this.yaw = degree_to_radian(0);
		this.pitch = degree_to_radian(0);
		this.cameraMoveSpeed = 40;
		this.cameraTiltSpeed = 5;
		this.cameraPosition = new Vector(-700, 0, 3);
		this.init_direction();
	}
	init_direction() {
		this.cameraTarget = new Vector(0, 0, 0);
		this.cameraDirection = vector_normalize(vector_subtract(this.cameraPosition, this.cameraTarget));
		this.set_coordinate_frames();
	}
	update_direction() {
		const direction = new Vector();
		// Define camera direction after being tilt by some yaw and pitch angle
		// source: https://learnopengl.com/Getting-started/Camera
		direction.x = Math.cos(degree_to_radian(this.yaw)) * Math.cos(degree_to_radian(this.pitch));
		direction.y = Math.sin(degree_to_radian(this.pitch));
		direction.z = Math.sin(degree_to_radian(this.yaw)) * Math.cos(degree_to_radian(this.pitch));
		this.cameraDirection = vector_normalize(direction);
		this.set_coordinate_frames();
	}
	set_coordinate_frames() {
		this.cameraUp = new Vector(0, -1, 0);
		this.cameraRight = vector_normalize(vector_cross_product(this.cameraDirection, this.cameraUp));
		this.cameraUp = vector_normalize(vector_cross_product(this.cameraRight, this.cameraDirection));
	}
}

var camera = new Camera();

window.addEventListener('keydown', function (e) {
	var code = e.keyCode;
	if (code == 87) {        // move forward    | 'W'
		camera.cameraPosition = vector_addition(camera.cameraPosition, vector_scale(camera.cameraDirection, camera.cameraMoveSpeed));
	} else if (code == 83) { // move backward   | 'S'
		camera.cameraPosition = vector_subtract(camera.cameraPosition, vector_scale(camera.cameraDirection, camera.cameraMoveSpeed));
	} else if (code == 65) { // move left   | 'A'
		camera.cameraPosition = vector_subtract(camera.cameraPosition, vector_scale(camera.cameraRight, camera.cameraMoveSpeed));
	} else if (code == 68) { // move right  | 'D'
		camera.cameraPosition = vector_addition(camera.cameraPosition, vector_scale(camera.cameraRight, camera.cameraMoveSpeed));
	} else if (code == 38) { // move up     | 'ARROW UP'
		camera.cameraPosition = vector_subtract(camera.cameraPosition, vector_scale(camera.cameraUp, camera.cameraMoveSpeed));
	} else if (code == 40) { // move down   | 'ARROW DOWN'
		camera.cameraPosition = vector_addition(camera.cameraPosition, vector_scale(camera.cameraUp, camera.cameraMoveSpeed));
	} else if (code == 37) {  // look left  | 'ARROW LEFT'
		camera.yaw += camera.cameraTiltSpeed;
	} else if (code == 39) {  // look right | 'ARROW RIGHT'
		camera.yaw -= camera.cameraTiltSpeed;
	} else if (code == 67) {  // show collision circles | 'C'
		showCollisionCircles = !showCollisionCircles;
	} else if (code == 72) {
		showHelp = !showHelp;
	}
});

window.addEventListener('mousemove', function (e) {
	if (lastMouseXPos == 0 && lastMouseYPos == 0) {
		lastMouseXPos = e.x;
		lastMouseYPos = e.y;
	}
	let xOffset = lastMouseXPos - e.x;
	let yOffset = lastMouseYPos - e.y;
	lastMouseXPos = e.x;
	lastMouseYPos = e.y;
	xOffset *= mouseSensitivity;
	yOffset *= mouseSensitivity;
	camera.yaw += xOffset;
	camera.pitch += yOffset;
	if (camera.pitch > 89) {
		camera.pitch = 89;
	}
	if (camera.pitch < -89) {
		camera.pitch = -89;
	}
});

window.addEventListener('click', function (e) {
	setTargettedCubes();
	if (targettedCubes.length > 0) {
		targettedCubes[0].isVisible = false;
		clearTargettedCubes();
	}
});

class Cube {
	constructor() {
		this.CUBE_LINES = [[0, 1], [1, 3], [3, 2], [2, 0], [2, 6], [3, 7], [0, 4], [1, 5], [6, 7], [6, 4], [7, 5], [4, 5]];
		this.CUBE_VERTICES = [[-1, -1, -1],[1, -1, -1],[-1, 1, -1],[1, 1, -1],[-1, -1, 1],[1, -1, 1],[-1, 1, 1],[1, 1, 1]];

		this.x = (Math.random() - 0.5) * width;
		this.y = (Math.random() - 0.5) * height;
		this.z = Math.random() * width;
		this.side = 50;

		this.setCubeCenter();
		this.isBeingTargetted = false;
		this.isVisible = true;
		this.distanceFromCamera = Infinity;
	}

	setCubeCenter() {
		let centerX = 0;
		let centerY = 0;
		let centerZ = 0;
		for (let i = 0; i < this.CUBE_VERTICES.length; ++i) {
			centerX += this.x + (this.side * this.CUBE_VERTICES[i][0]);
			centerY += this.y + (this.side * this.CUBE_VERTICES[i][1]);
			centerZ += this.z + (this.side * this.CUBE_VERTICES[i][2]);
		}
		this.CUBE_CENTER = [centerX / 8, centerY / 8, centerZ / 8];
		this.cubeCenterVector = new Vector(this.CUBE_CENTER[0], this.CUBE_CENTER[1], this.CUBE_CENTER[2]);
	}

	project(x, y, z) { // convert 3d world to 2d
		// another learning source: https://chortle.ccsu.edu/vectorlessons/vectorindex.html
		const cameraToObject = vector_subtract(new Vector(x, y, z), camera.cameraPosition);
		const xInCameraCoordinateFrame = vector_dot_product(cameraToObject, camera.cameraRight);
		const yInCameraCoordinateFrame = vector_dot_product(cameraToObject, camera.cameraUp);
		const zInCameraCoordinateFrame = vector_dot_product(cameraToObject, camera.cameraDirection);
		const scaleProjected = PERSPECTIVE / (zInCameraCoordinateFrame);
		const xProjected = (xInCameraCoordinateFrame * scaleProjected) + PROJECTION_CENTER_X;
		const yProjected = (yInCameraCoordinateFrame * scaleProjected) + PROJECTION_CENTER_Y;
		return {
			scale: scaleProjected,
			x: xProjected,
			y: yProjected,
			z: zInCameraCoordinateFrame,
		};
	}

	draw() { // draw 2d positions to our canvas

		camera.update_direction();

		ctx.lineWidth = 2;
		ctx.strokeStyle = "#000000";
		ctx.strokeRect(0, 0, canvas.width, canvas.height);

		// source for rotation formula:
		// https://www.geeksforgeeks.org/computer-graphics-3d-rotation-transformations/
		// rotate about x axis
		for (let i = 0; i < this.CUBE_VERTICES.length; ++i) {
			const point = this.CUBE_VERTICES[i];
			let xx = point[0];
			let yy = point[1] * Math.cos(angle) - point[2] * Math.sin(angle);
			let zz = point[1] * Math.sin(angle) + point[2] * Math.cos(angle);
			this.CUBE_VERTICES[i] = [xx, yy, zz];
		}

		// rotate about y axis
		for (let i = 0; i < this.CUBE_VERTICES.length; ++i) {
			const point = this.CUBE_VERTICES[i];
			let xx = point[0] * Math.cos(angle) + point[2] * Math.sin(angle);
			let yy = point[1];
			let zz = point[2] * Math.cos(angle) - point[0] * Math.sin(angle);
			this.CUBE_VERTICES[i] = [xx, yy, zz];
		}

		// rotate about z axis
		for (let i = 0; i < this.CUBE_VERTICES.length; ++i) {
			const point = this.CUBE_VERTICES[i];
			let xx = point[0] * Math.cos(angle) - point[1] * Math.sin(angle);
			let yy = point[0] * Math.sin(angle) + point[1] * Math.cos(angle);
			let zz = point[2];
			this.CUBE_VERTICES[i] = [xx, yy, zz];
		}

		let renderCubeCenter = true;
		for (let i = 0; i < this.CUBE_LINES.length; ++i) {
			const point1 = this.CUBE_LINES[i][0];
			const point2 = this.CUBE_LINES[i][1];
			const v1 = {
				x: this.x + (this.side * this.CUBE_VERTICES[point1][0]),
				y: this.y + (this.side * this.CUBE_VERTICES[point1][1]),
				z: this.z + (this.side * this.CUBE_VERTICES[point1][2])
			};
			const v2 = {
				x: this.x + (this.side * this.CUBE_VERTICES[point2][0]),
				y: this.y + (this.side * this.CUBE_VERTICES[point2][1]),
				z: this.z + (this.side * this.CUBE_VERTICES[point2][2])
			};
			const v1Projected = this.project(v1.x, v1.y, v1.z);
			const v2Projected = this.project(v2.x, v2.y, v2.z);
			if (v1Projected.z < 0 || v2Projected.z < 0) {
				renderCubeCenter = false;
				break;
			}
			ctx.beginPath();
			if (this.isBeingTargetted) {
				ctx.strokeStyle = "#FF0000";
			} else {
				ctx.strokeStyle = "#ffffff";
			}
			ctx.moveTo(v1Projected.x, v1Projected.y);
			ctx.lineTo(v2Projected.x, v2Projected.y);
			ctx.stroke();
		}

		if (showCollisionCircles && renderCubeCenter) {
			const cubeCenterProjected = this.project(this.CUBE_CENTER[0], this.CUBE_CENTER[1], this.CUBE_CENTER[2]);
			ctx.beginPath();
			ctx.fillStyle = "#DDA0DD";
			ctx.arc(cubeCenterProjected.x, cubeCenterProjected.y, this.side * cubeCenterProjected.scale, 0, degree_to_radian(1), true);
			ctx.fill();
		}

		ctx.beginPath();
		ctx.fillStyle = "#FF0000";
		ctx.arc(PROJECTION_CENTER_X, PROJECTION_CENTER_Y, 2, 0, degree_to_radian(1), true);
		ctx.closePath();
		ctx.fill();

		ctx.fillStyle = "#FFFFFF";
		ctx.font = "20px Arial";
		ctx.fillText("Prayogi learning 3D perspective projection", 10, 30);
		ctx.font = "17px Arial";
		ctx.fillText("Press 'H' key to show / hide controls", 10, 55);
		if (showHelp) {
			ctx.fillText("W          : Move Forward", 10, 75);
			ctx.fillText("A          : Move Left", 10, 95);
			ctx.fillText("S          : Move Backward", 10, 115);
			ctx.fillText("D          : Move Right", 10, 135);
			ctx.fillText("ARROW UP   : Move Camera Up", 10, 155);
			ctx.fillText("ARROW DOWN : Move Camera Down", 10, 175);
			ctx.fillText("C          : Show Collision Detection Box", 10, 195);
			ctx.fillText("MOUSE DRAG HORIZONTAL AND VERTICAL : Look Around", 10, 215);
			ctx.fillText("MOUSE LEFT CLICK : Destroy cube", 10, 235);
		}
	}
}

function setTargettedCubes() {
	for (let i = 0; i < cubes.length; ++i) {
		let cube = cubes[i];
		if (!cube.isVisible) {
			continue;
		}

		let cameraToCircle = vector_subtract(cube.cubeCenterVector, camera.cameraPosition);
		let triangleOpposite = vector_dot_product(cameraToCircle, camera.cameraDirection);
		let hypotenuse = vector_length(cameraToCircle);
		let triangleAdjacent = Math.sqrt(hypotenuse * hypotenuse - triangleOpposite * triangleOpposite);
		cube.distanceFromCamera = triangleOpposite;
		
		if (triangleAdjacent <= cube.side) {
			targettedCubes.push(cube);
		}
	}
	targettedCubes.sort((cube1, cube2) => {
		return cube1.distanceFromCamera < cube2.distanceFromCamera;
	});
	if (targettedCubes.length > 0) {
		targettedCubes[0].isBeingTargetted = true;
	}
}

function clearTargettedCubes() {
	targettedCubes = [];
	for (let i = 0; i < cubes.length; ++i) {
		cubes[i].isBeingTargetted = false;
	}
}

function spawnCubes() {
	for (let i = 0; i < 10; ++i) {
		cubes.push(new Cube());
	}
	clearTargettedCubes();
}

function isAllCubesClicked() {
	let res = true;
	for (let i = 0; i < cubes.length; ++i) {
		if (cubes[i].isVisible) {
			res = false;
			break;
		}
	}
	return res;
}

function render() {
	ctx.fillStyle = '#686868';
	ctx.fillRect(0, 0, width, height);
	if (isAllCubesClicked()) {
		spawnCubes();
	}
	setTargettedCubes();
	cubes.sort((cube1, cube2) => {
		return cube1.distanceFromCamera > cube2.distanceFromCamera;
	});
	for (let i = 0; i < cubes.length; ++i) {
		if (cubes[i].isVisible) {
			cubes[i].draw();
		}
	}
	clearTargettedCubes();
	window.requestAnimationFrame(render);
}

spawnCubes();
render();
