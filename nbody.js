// todo: implement electrostatic and magnetic (?) fields, fix gravity line positions
let frameDelayMs = 0; // Chromebook Simulator (or for debug purposes): 0 for default requestAnimationFrame fps

// object containing the user interface elements
const ui = {
  panel: document.getElementById("settings"),
  collapse: document.getElementById("toggleSettings"),
  timestep: document.getElementById("timestep"),
  tOut: document.getElementById("tOut"),
  numBodies: document.getElementById("num"),
  trace: document.getElementById("trace"),
  fade: document.getElementById("fade"),
  drawVector: document.getElementById("vectors"),
  drawGravity: document.getElementById("drawG"),
  drawGravityStrength: document.getElementById("drawGStrength"),
  drawGThreshold: document.getElementById("drawGThreshold"),
  continuous: document.getElementById("continuous"),
  G: document.getElementById("g"),
  collide: document.getElementById("collide"),
  maxMass: document.getElementById("maxSize"),
  minMass: document.getElementById("minSize"),
  initVel: document.getElementById("initVel"),
  randBtn: document.getElementById("rand"),
  loadBtn: document.getElementById("loadPreset"),
  presets: document.getElementById("presets"),
  add: document.getElementById("add"),
  clear: document.getElementById("clear"),
  toggle: document.getElementById("toggle"),
  clrOffscreen: document.getElementById("clrOffscreen"),
  collisionCount: document.getElementById("collisionCount"),
  bodyCount: document.getElementById("bodyCount"),
  fps: document.getElementById("fps"),
  offset: document.getElementById("offset"),
  viewport: document.getElementById("viewport"),
  zoom: document.getElementById("zoom"),
  mass: document.getElementById("mass"),
  radius: document.getElementById("radius"),
  xp: document.getElementById("xPos"),
  yp: document.getElementById("yPos"),
  vx: document.getElementById("Vx"),
  vy: document.getElementById("Vy"),
  heatmap: document.getElementById("heatmap"),
  drawCoM: document.getElementById("drawCoM"),
  trackCoM: document.getElementById("trackCoM"),
  colorByVel: document.getElementById("colorByVel"),
  globalCollide: document.getElementById("globalCollide"),
  drawOffscreen: document.getElementById("drawOffscreen"),
  fadeStrength: document.getElementById("fadeStrength"),
  fadeOutput: document.getElementById("fadeOutput"),
  drawMouseVector: document.getElementById("drawMouseVector"),
  inelastic: document.getElementById("collideType"),
  CoR: document.getElementById("CoR"),
  CoROut: document.getElementById("CoROut"),
  maxCharge: document.getElementById("maxCharge"),
  minCharge: document.getElementById("minCharge"),
  charge: document.getElementById("charge"),
  electrostatic: document.getElementById("electrostatic"),
  colorByCharge: document.getElementById("colorByCharge"),
  K: document.getElementById("K"),
  drawKStrength: document.getElementById("drawKStrength"),
  drawKThreshold: document.getElementById("drawKThreshold"),
  uniformg: document.getElementById("uniformg"),
  gravity: document.getElementById("gravity"),
  immovable: document.getElementById("immovable"),
  decoupleFPS: document.getElementById("decoupleFPS"),
  softbody: document.getElementById("softbody"),
  springConst: document.getElementById("springConst"),
  dampening: document.getElementById("dampening"),
  dampOut: document.getElementById("dampOut"),
  springEquilPos: document.getElementById("softbodyEquilPos"),
  drawSStrength: document.getElementById("drawSStrength"),
};

// utilities
// calculate radius based on a spherical mass
const getRadius = (mass) => Math.abs(Math.cbrt((mass * (3 / 4)) / Math.PI));
// generate a random hex color
const randColor = () => "#" + (~~(Math.random() * (16777215 - 5592405) + 5592405)).toString(16);

// initialize worker
const worker = new Worker("worker.js");

// initialize main canvas
const canvas = document.getElementById("canvas", { alpha: false });
const ctx = canvas.getContext("2d");
canvas.height = window.innerHeight;
canvas.width = window.innerWidth;
ui.viewport.innerText = canvas.width + " x " + canvas.height;
let center = { x: canvas.width / 2, y: canvas.height / 2 };

// make the canvas size responsive
window.onresize = () => {
  canvas.height = window.innerHeight;
  canvas.width = window.innerWidth;
  ui.viewport.innerText = canvas.width + " x " + canvas.height;
  center = { x: canvas.width / 2, y: canvas.height / 2 };
  viewport.x = canvas.width / totalzoom;
  viewport.y = canvas.height / totalzoom;
};

// initialize graphs
const fpsGraph = document.getElementById("fpsGraph");
const fpsCtx = fpsGraph.getContext("2d");
const bodyGraph = document.getElementById("bodyGraph");
const bodyCtx = bodyGraph.getContext("2d");
fpsCtx.fillStyle = "rgba(0, 0, 0, 1)";
fpsCtx.fillRect(0, 0, canvas.width, canvas.height);
bodyCtx.fillStyle = "rgba(0, 0, 0, 1)";
bodyCtx.fillRect(0, 0, canvas.width, canvas.height);
let xCoord = 0;

// simulation variables
let bodies = [];
let G = ui.G.value;
let K = ui.K.value;
const Gconst = 6.6743 * Math.pow(10, -11);
let numBodies, maxMass, minMass, initVel, timestep, oldTimestep, CoM, maxCharge, minCharge, uniformg;
let continuous = true;
let CoR = 1;
let springConst = 100;
let dampening = 0.99;
let springEquilPos = 25;

// tracking variables
let collisionCount = (frameCount = bodyCount = activeBodies = 0);
let lastTime = performance.now();
let clearTrails = false, paused = false;

// interactive variables
let panOffset = { x: 0, y: 0 };
let panSpeed = 8;
let currentOffset = { x: 0, y: 0 };
let collideOffset = { x: 0, y: 0 };
let trackBody;
let trackNum = 0;
let newBody = false;
let zoomfactor = 1;
let totalzoom = 1;
let viewport = { x: canvas.width, y: canvas.height };
let mouseX, mouseY;

// heatmap
let maxBody;
const minPotential = 0;
const heatmapRes = 4;
let minL = 0.1;

// initialize settings
let colorBySpeed = ui.colorByVel.checked,
  trace = ui.trace.checked,
  fade = ui.fade.checked,
  gravity = ui.gravity.checked,
  drawGravity = ui.drawGravity.checked,
  drawGravityStrength = ui.drawGravityStrength.checked,
  drawGThreshold = ui.drawGThreshold.checked,
  drawVector = ui.drawVector.checked,
  collide = ui.collide.checked,
  drawField = ui.heatmap.checked,
  drawCoM = ui.drawCoM.checked,
  trackCoM = ui.trackCoM.checked,
  globalCollide = ui.globalCollide.checked,
  drawOffscreen = ui.drawOffscreen.checked,
  fadeStrength = ui.fadeStrength.value,
  drawMouseVector = ui.drawMouseVector.checked,
  inelastic = ui.inelastic.checked,
  electrostatic = ui.electrostatic.checked,
  colorByCharge = ui.colorByCharge.checked,
  drawKStrength = ui.drawKStrength.checked,
  drawKThreshold = ui.drawKThreshold.checked,
  softbody = ui.softbody.checked,
  drawSStrength = ui.drawSStrength.checked;

// initialize the ui inputs and then start the draw loop
initParams();
draw();

/** init form inputs */
function initParams() {
  if (!paused) timestep = parseFloat(ui.timestep.value);
  initVel = parseFloat(ui.initVel.value);
  G = parseFloat(ui.G.value);
  uniformg = parseFloat(ui.uniformg.value);
  if (uniformg) {
    collide = true;
    ui.collide.checked = true;
  }
  numBodies = parseFloat(ui.numBodies.value);
  maxMass = parseFloat(ui.maxMass.value);
  minMass = parseFloat(ui.minMass.value);
  minCharge = parseFloat(ui.minCharge.value);
  maxCharge = parseFloat(ui.maxCharge.value);
}

/**
 * Removes bodies during collision
 * @param {Array} arr input array
 * @param {Number} id id of the value to remove
 * @returns the input array without the removed body
 */
function remove(body, i = 0) {
  const index = body ? bodies.indexOf(body) : i; //bodies.findIndex((body) => body.id === id);
  if (index != -1) {
    bodies.splice(index, 1);
  }
}

/**
 * Check if the body is in view
 * @param {Body} body the body to check
 * @param {Object} offset viewport offset
 */
const isInView = (body, offset = { x: 0, y: 0 }) =>
  body.xPos <= offset.x + center.x + viewport.x / 2 + body.radius &&
  body.xPos >= offset.x + center.x - viewport.x / 2 - body.radius &&
  body.yPos <= offset.x + center.y + viewport.y / 2 + body.radius &&
  body.yPos >= offset.x + center.y - viewport.y / 2 - body.radius;

/**
 * Map values from one range to another (lerp)
 * @param {Number} in_min minimum input value
 * @param {Number} in_max maximum input value
 * @param {Number} out_min minimum output value
 * @param {Number} out_max maximum output value
 * @param {Boolean} clampMax whether to clamp the maximum value if the input exceeds max
 * @param {Boolean} clampMin whether to clamp the minimum value if the input exceeds min
 */
Number.prototype.map = function (
  in_min,
  in_max,
  out_min,
  out_max,
  clampMax = false,
  clampMin = false
) {
  let mapped = ((this - in_min) * (out_max - out_min)) / (in_max - in_min) + out_min;
  mapped = clampMax ? Math.min(mapped, out_max) : mapped;
  mapped = clampMin ? Math.max(mapped, out_min) : mapped;
  return mapped;
};

/** Class containing all the physical properties of a body */
class Body {
  constructor(
    xPos = 0,
    yPos = 0,
    xVel = 0,
    yVel = 0,
    r = 5,
    mass = 0,
    color = "gray",
    collide = true,
    charge = 0,
    immovable = false,
    lockAxis = "none",
    xAccel = 0,
    yAccel = 0,
    id = bodyCount++
  ) {
    this.xPos = this.xPrev = xPos;
    this.yPos = this.yPrev = yPos;

    this.xVel = xVel;
    this.yVel = yVel;

    this.xAccel = yAccel;
    this.yAccel = xAccel;

    this.radius = r ? r : getRadius(mass);
    this.mass = mass ? mass : (4 / 3) * Math.PI * (r * r * r);

    this.charge = charge;

    this.color = color == "default" ? "gray" : color;
    this.id = id;
    this.collide = collide;

    this.immovable = immovable;
    this.lockAxis = lockAxis;
  }
  /** Returns the x and y momentum */
  getMomentum() {
    return { x: this.xVel * this.mass, y: this.yVel * this.mass };
  }
  /** Draw the body onto the canvas */
  draw() {
    let drawColor = this.color;
    // change the color based on speed
    if (colorByCharge) {
      drawColor = "rgb(" + (128 + this.charge * 10) + ", " + (128 - Math.abs(this.charge * 10)) + ", " + (128 - this.charge * 10) + ")";
    } else if (colorBySpeed) {
      let speed = Math.hypot(
        this.xVel - (trackBody ? trackBody.xVel : 0),
        this.yVel - (trackBody ? trackBody.yVel : 0)
      );
      let hue = Math.max(240 - 10 * speed, 0);
      drawColor = "hsl(" + hue + ", 100%, 50%)";
    }

    // Draw the body
    {
      if (!isInView(this) && drawOffscreen) {
        // offscreen indicators
        // use slope to draw lines pointing toward center
        let bodyPos = { x: this.xPos - center.x, y: this.yPos - center.y };
        let slope = (this.yPos - center.y) / (this.xPos - center.x);
        let angle = Math.abs(Math.atan2(bodyPos.y, bodyPos.x));
        let x =
          (Math.sign(bodyPos.x) * (center.x - (this.radius / 2 + 5) * Math.abs(Math.cos(angle)))) /
          totalzoom;
        let y =
          (Math.sign(bodyPos.y) * (center.y - (this.radius / 2 + 5) * Math.sin(angle))) / totalzoom;
        ctx.beginPath();
        ctx.strokeStyle = drawColor;
        ctx.lineWidth = 1 / totalzoom;
        ctx.moveTo(center.x + bodyPos.x, center.y + bodyPos.y);
        Math.abs(bodyPos.x / canvas.width) > Math.abs(bodyPos.y / canvas.height)
          ? ctx.lineTo(center.x + x, center.y + slope * x)
          : ctx.lineTo(center.x + y / slope, center.y + y);
        ctx.closePath();
        ctx.stroke();
      } else {
        if (trackBody != this && trace && !(collide && trackBody) && !this.immovable) {
          // connect to previous
          if (continuous && trace) {
            ctx.beginPath();
            ctx.lineWidth = 2 * this.radius;
            ctx.strokeStyle = drawColor;
            ctx.moveTo(this.xPos, this.yPos);
            ctx.lineTo(this.xPrev, this.yPrev);
            ctx.closePath();
            ctx.stroke();
          }
          ctx.beginPath();
          ctx.arc(this.xPrev, this.yPrev, this.radius, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.fillStyle = drawColor;
          ctx.fill();
        }

        // draw the body
        ctx.beginPath();
        ctx.arc(this.xPos, this.yPos, this.radius, 0, Math.PI * 2, true);
        ctx.closePath();
        ctx.fillStyle = drawColor;
        ctx.fill();

        // center
        if (this.radius > 3) {
          ctx.beginPath();
          ctx.arc(
            this.xPos,
            this.yPos,
            this.radius < 1.5 ? this.radius : 1.5,
            0,
            Math.PI * 2,
            true
          );
          ctx.closePath();
          ctx.fillStyle = "black";
          ctx.fill();
        }

        // black outline for field visualization
        if (drawField) {
          ctx.strokeStyle = "black";
          ctx.lineWidth = 1;
          ctx.beginPath();
          ctx.arc(this.xPos, this.yPos, this.radius, 0, Math.PI * 2, true);
          ctx.closePath();
          ctx.stroke();
        }

        // motion vector
        if (drawVector) {
          let mult = 10 * timestep;
          ctx.beginPath();
          ctx.strokeStyle = "blue";
          ctx.lineWidth = 1 / totalzoom;
          ctx.moveTo(this.xPos, this.yPos);
          ctx.lineTo(this.xPos + mult * this.xVel, this.yPos + mult * this.yVel);
          ctx.closePath();
          ctx.stroke();
        }
        // acceleration vector
        if (drawGravity) {
          let mult = 1; //timestep;
          ctx.beginPath();
          ctx.lineWidth = 1 / totalzoom;
          ctx.strokeStyle = "red";
          ctx.moveTo(this.xPos, this.yPos);
          ctx.lineTo(this.xPos + mult * this.xAccel, this.yPos + mult * this.yAccel);
          ctx.closePath();
          ctx.stroke();
        }
      }
    }

    // Update the position of the body
    if (!this.immovable) {
      this.xPrev = this.xPos;
      this.yPrev = this.yPos;

      // implement acceleration
      this.xVel += this.xAccel * timestep;
      this.yVel += this.yAccel * timestep;

      // change pos based on velocity
      this.xPos += this.xVel * timestep;
      this.yPos += this.yVel * timestep;

      // reset acceleration
      this.xAccel = 0;
      this.yAccel = uniformg;

      // edge collision
      if (collide) {
        const xOffset = -collideOffset.x + currentOffset.x;
        const yOffset = -collideOffset.y + currentOffset.y;
        if (
          this.xPos >= xOffset + canvas.width - this.radius ||
          this.xPos <= xOffset + this.radius
        ) {
          // increment collision
          collisionCount += 1;
          ui.collisionCount.innerText = collisionCount;

          // reverse velocity and implement CoR
          this.xVel = CoR * -this.xVel;
          this.yVel *= CoR;

          // set position within box, visual glitch but accurate
          if (this.xPos >= xOffset + canvas.width - this.radius) {
            this.xPos = 2 * (xOffset + canvas.width - this.radius) - this.xPos;
          } else {
            this.xPos = 2 * (xOffset + this.radius) - this.xPos;
          }
        }
        if (
          this.yPos >= yOffset + canvas.height - this.radius ||
          this.yPos <= yOffset + this.radius
        ) {
          // increment collision
          collisionCount += 1;
          ui.collisionCount.innerText = collisionCount;

          // reverse velocity and implement CoR
          this.xVel *= CoR;
          this.yVel = CoR * -this.yVel;

          // set position within box, visual glitch but accurate
          if (this.yPos >= yOffset + canvas.height - this.radius)
            this.yPos = 2 * (yOffset + canvas.height - this.radius) - this.yPos;
          else this.yPos = 2 * (yOffset + this.radius) - this.yPos;
        }
      }
    }

  }
}


/**
 * calculate field strength at a given point
 * @param {Number} x X-coordinate for field calculation
 * @param {Number} y Y-coordinate for field calculation
 * @param {Number} res resolution of the grid for full field calculation
 * @param {Boolean} hypot whether to retern the net strength or the X and Y components
 * @returns Net field strength if hypot is true, otherwise an object with the X and Y components
 */
function calcFieldAtPoint(x, y, res = 0, hypot = false) {
  let xPot = 0,
    yPot = 0;

  // accumulate total potential using vector sum
  bodies.forEach((body) => {
    let distance = res
      ? Math.hypot(body.xPos - x - res / 2, body.yPos - y - res / 2)
      : Math.hypot(body.xPos - x, body.yPos - y);
    if (distance >= body.radius - (res ? res : 0)) {
      const gForce = (G * body.mass) / (distance * distance);
      xPot += (gForce * (body.xPos - x)) / distance;
      yPot += (gForce * (body.yPos - y)) / distance;
    }
  });
  return hypot
    ? Math.hypot(xPot, yPot)
    : {
      x: xPot,
      y: yPot,
    };
}

/**
 * Converts a color from HSL to RGB for the heatmap
 * @param {Number} h hue as an angle [0, 360]
 * @param {Number} s saturation [0, 1]
 * @param {Number} l lightness [0, 1]
 * @returns An array with the RGB color values [0, 1]
 */
function hsl2rgb(h, s, l) {
  let a = s * Math.min(l, 1 - l);
  let f = (n, k = (n + h / 30) % 12) => l - a * Math.max(Math.min(k - 3, 9 - k, 1), -1);
  return [f(0), f(8), f(4)];
}

/** display gravitational field for the whole canvas */
function drawFullField() {
  const res = heatmapRes / totalzoom;
  const width = canvas.width;
  const imgData = ctx.createImageData(width, canvas.height);
  const data = imgData.data;

  // used to adjust coloring based on the max potential value
  const maxPotential = (G * maxBody.mass) / (maxBody.radius * maxBody.radius);

  // calculate for every res*res block of pixels
  for (let y = center.y - viewport.y / 2, py = 0; y < center.y + viewport.y / 2; y += res, py++) {
    for (let x = center.x - viewport.x / 2, px = 0; x < center.x + viewport.x / 2; x += res, px++) {
      // const vector = calcFieldAtPoint(x, y, res);
      const potential = calcFieldAtPoint(x, y, res, true); //Math.hypot(vector.x, vector.y);
      let rgbColor = [0, 0, 0.2];
      if (potential >= 0.05) {
        // Map the potential to HSL color space
        const hue = 240 - potential.map(minPotential, maxPotential, 0, 240);
        const lightness = potential.map(minPotential, maxPotential, 0.01, 0.5);

        // Convert HSL to RGB
        rgbColor = hsl2rgb(hue, 1, lightness);

        // set the pixels to that color
        for (let i = 0; i < heatmapRes; i++) {
          for (let j = 0; j < heatmapRes; j++) {
            const index = ((py * 4 + i) * width + (px * 4 + j)) * heatmapRes;
            data[index] = rgbColor[0] * 255;
            data[index + 1] = rgbColor[1] * 255;
            data[index + 2] = rgbColor[2] * 255;
            data[index + 3] = 255;
          }
        }
      }
    }
  }
  // update the field visualization
  ctx.putImageData(imgData, 0, 0);
}

/** display gravitational field vector at the mouse position */
function drawPointField() {
  const x = (mouseX / canvas.width) * viewport.x + center.x - viewport.x / 2;
  const y = (mouseY / canvas.height) * viewport.y + center.y - viewport.y / 2;

  const vector = calcFieldAtPoint(x, y);

  // draw the vector line
  ctx.beginPath();
  ctx.strokeStyle = "white";
  ctx.lineWidth = 1 / totalzoom;
  ctx.moveTo(x, y);
  ctx.lineTo(x + vector.x * 2, y + vector.y * 2);
  ctx.closePath();
  ctx.stroke();
}

/** calculate center of mass of the system */
function calcCoM() {
  // calc x and y CoM using (m1x1+m2x2...) / (m1+m2...)
  let CoM = { x: 0, y: 0 };
  let mass = 0;
  bodies.forEach((body) => {
    CoM.x += body.xPrev * body.mass;
    CoM.y += body.yPrev * body.mass;
    mass += body.mass;
  });
  CoM.x /= mass;
  CoM.y /= mass;
  return CoM;
}

/**
 * Pan by adjusting positions of all bodies based on an offset value
 * @param {Object} offset
 * @param {Boolean} clrTrails
 */
function pan(offset = { x: 0, y: 0 }, clrTrails = true) {
  // remove faint trails
  if (clrTrails) {
    continuous = false;
    clearTrails = true;
  }
  // offset each body
  currentOffset.x += offset.x;
  currentOffset.y += offset.y;
  bodies.forEach((body) => {
    body.xPos += offset.x;
    body.yPos += offset.y;
  });

  ui.offset.innerText = Math.floor(currentOffset.x) + " Y=" + Math.floor(currentOffset.y);
}

/**
 * Track body by panning and zeroing velocity
 * @param {Body} body the body to track
 */
function track(body) {
  if (newBody) {
    // place the tracked body in the center
    pan({
      x: center.x - body.xPos,// - currentOffset.x,
      y: center.y - body.yPos,// - currentOffset.y,
    });
  }
  // follow the body
  pan({ x: -body.xVel * timestep, y: -body.yVel * timestep }, false);
  newBody = false;
}

/** draw and animate */
function draw() {
  continuous = true;
  let continueTrace = trace;

  debug = false;
  if (debug) {
    trace = false;
    drawGravity = false;
    drawGravityStrength = false;
    drawVector = false;
  }

  // update the FPS and bodycount graphs
  updateGraphs(100);

  if (!maxBody && bodies[0]) maxBody = bodies[0];
  else if (!bodies[0]) maxBody = null;

  // check draw settings and draw stuff
  {
    if (trackBody) track(trackBody);
    // pan if needed
    if (panOffset.x != 0 || panOffset.y != 0) {
      pan(panOffset, false);
      trace = false;
    }
    // fade the trails if needed, or draw the field, or remove the trails
    if (fade && trace && timestep) {
      // fade by covering canvas with a slightly opaque black
      ctx.fillStyle = "rgba(0, 0, 0, " + fadeStrength + ")";
      ctx.fillRect(center.x - viewport.x / 2, center.y - viewport.y / 2, viewport.x, viewport.y);
    } else if (!trace && drawField && G && bodies[0]) {
      // draw the field
      drawFullField();
    } else if (!trace) {
      // remove trails by drawing black over the canvas
      ctx.fillStyle = "rgba(0, 0, 0, 1)";
      ctx.fillRect(center.x - viewport.x / 2, center.y - viewport.y / 2, viewport.x, viewport.y);
    }
    // draw collision box
    if (collide) {
      // set the collision box at the current viewport location
      if (!collideOffset.x && !collideOffset.y) {
        collideOffset.x = currentOffset.x;
        collideOffset.y = currentOffset.y;
      }
      if (trackBody) {
        // can't have trails while colliding
        ctx.fillStyle = "rgba(0, 0, 0, 1)";
        ctx.fillRect(center.x - viewport.x / 2, center.y - viewport.y / 2, viewport.x, viewport.y);
      }
      // draw the box
      ctx.strokeStyle = "white";
      ctx.lineWidth = 1;
      ctx.strokeRect(
        -collideOffset.x + currentOffset.x,
        -collideOffset.y + currentOffset.y,
        canvas.width,
        canvas.height
      );
    } else {
      collideOffset.x = collideOffset.y = 0;
    }
  }
  // loop through bodies, draw and update// Send data to the worker
  worker.postMessage({
    bodiesData: bodies.map(body => ({
      xPos: body.xPos,
      yPos: body.yPos,
      xVel: body.xVel,
      yVel: body.yVel,
      radius: body.radius,
      mass: body.mass,
      color: body.color,
      collide: body.collide,
      charge: body.charge,
      immovable: body.immovable,
      lockAxis: body.lockAxis,
      xAccel: body.xAccel,
      yAccel: body.yAccel,
      id: body.id,
    })),
    G: G,
    K: K,
    drawGravityStrength: drawGravityStrength,
    drawKStrength: drawKStrength,
    drawSStrength: drawSStrength,
    gravity: gravity,
    electrostatic: electrostatic,
    softbody: softbody,
    globalCollide: globalCollide,
    paused: paused,
    springEquilPos: springEquilPos,
    springConst: springConst,
    dampening: dampening,
    // collisionCount: collisionCount,
    bodyCount: bodyCount,
    timestep: timestep,
    uniformg: uniformg,
    collideOffset: collideOffset,
    CoR: CoR,
    width: canvas.width,
    height: canvas.width,
    collide: collide,
    inelastic: inelastic
  });
  if (continueTrace) trace = true;
  if (drawMouseVector) drawPointField();

  // draw CoM
  if (bodies.length && drawCoM) {
    CoM = calcCoM();
    ctx.beginPath();
    ctx.arc(CoM.x, CoM.y, 2 / totalzoom, 0, Math.PI * 2, true);
    ctx.closePath();
    ctx.fillStyle = "white";
    ctx.fill();
    if (trackCoM) {
      pan({ x: center.x - CoM.x, y: center.y - CoM.y }, false);
    }
  }
  // clear the trails if needed
  if (clearTrails) {
    ctx.fillStyle = "rgba(0, 0, 0, 1)";
    ctx.fillRect(center.x - viewport.x / 2, center.y - viewport.y / 2, viewport.x, viewport.y);
    clearTrails = false;
  }

  // call the loop again
  frameDelayMs ? setTimeout(draw, frameDelayMs) : requestAnimationFrame(draw);
}

// Handle messages from the worker
worker.onmessage = function (event) {
  const { bodiesData } = event.data;
  if (bodiesData) {
    bodies = bodies.map(body => new Body(
      body.id,
      body.xPos,
      body.yPos,
      body.xVel,
      body.yVel,
      body.xAccel,
      body.yAccel,
      body.mass,
      body.radius,
      body.charge,
      body.immovable,
      body.collide,
      body.lockAxis,
      body.color
    ));
    // Update the bodies in the main thread
    bodies.forEach((body) => {
      body.draw();
    });
    ui.bodyCount.innerText = bodies.length;
  }
};

/**
 * Update graphs to display framerate and number of bodies
 * @param {Number} interval interval to measure and display values
 */
function updateGraphs(interval) {
  // get fps
  frameCount++;
  const currentTime = performance.now();
  const elapsedTime = currentTime - lastTime;

  // only update in specific intervals
  if (elapsedTime >= interval) {
    // Update 10 times per second
    const fps = frameCount / (elapsedTime / 1000);
    ui.fps.innerText = ~~(fps * 100) / 100;

    // draw fps graph
    xCoord += 2;
    fpsCtx.beginPath();
    fpsCtx.strokeStyle = fps >= 15 ? (fps >= 30 ? "lightgreen" : "orange") : "red"; //"white";
    fpsCtx.lineWidth = 1;
    fpsCtx.moveTo(xCoord % fpsGraph.width, fpsGraph.height);
    fpsCtx.lineTo(xCoord % fpsGraph.width, fpsGraph.height - fps);
    fpsCtx.closePath();
    fpsCtx.stroke();
    fpsCtx.fillStyle = "rgba(0, 0, 0, 0.02)";
    fpsCtx.fillRect(0, 0, (xCoord % fpsGraph.width) - 2, fpsGraph.height);
    fpsCtx.fillRect((xCoord % fpsGraph.width) + 2, 0, fpsGraph.width, fpsGraph.height);

    frameCount = 0;
    lastTime = currentTime;

    // draw bodycount graph
    bodyCtx.beginPath();
    bodyCtx.strokeStyle =
      activeBodies >= 500 ? "red" : activeBodies >= 200 ? "orange" : "lightgreen";
    bodyCtx.lineWidth = 1;
    bodyCtx.moveTo(xCoord % bodyGraph.width, bodyGraph.height);
    bodyCtx.lineTo(xCoord % bodyGraph.width, bodyGraph.height - activeBodies / 8);
    bodyCtx.closePath();
    bodyCtx.stroke();
    bodyCtx.fillStyle = "rgba(0, 0, 0, 0.02)";
    bodyCtx.fillRect(0, 0, (xCoord % bodyGraph.width) - 2, bodyGraph.height);
    bodyCtx.fillRect((xCoord % bodyGraph.width) + 2, 0, bodyGraph.width, bodyGraph.height);
  }
}
