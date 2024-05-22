
let settings = {
  bodiesData: null, bodies: [], G: null, K: null, drawGravityStrength: null, drawKStrength: null, drawSStrength: null,
  gravity: null, electrostatic: null, softbody: null, globalCollide: null, paused: null, springEquilPos: null,
  springConst: null, dampening: null, bodyCount: null, timestep: null, uniformg: null, collideOffset: null, currentOffset: null, CoR: null, width: null, height: null, collide: null, inelastic: null
}

// calculate radius based on a spherical mass
const getRadius = (mass) => Math.abs(Math.cbrt((mass * (3 / 4)) / Math.PI));

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
    id = 0
  ) {
    this.xPos = this.xPrev = xPos;
    this.yPos = this.yPrev = yPos;

    this.xVel = xVel;
    this.yVel = yVel;

    this.xAccel = xAccel;
    this.yAccel = yAccel;

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
}

function runSim() {
  settings.bodies.forEach((body, index) => {
    const body1 = body;
    if (settings.bodies.length > 1 &&
      (((settings.gravity && settings.G || settings.softbody || settings.electrostatic && settings.K || settings.globalCollide) && !settings.paused) ||
        (settings.drawGravityStrength || settings.drawKStrength || settings.drawSStrength))) {
      for (let i = index + 1; i < settings.bodies.length; i++) {
        const body2 = settings.bodies[i];
        const xDist = body2.xPos - body1.xPos;
        const yDist = body2.yPos - body1.yPos;

        const minDist = body1.radius + body2.radius;
        const distThreshSqr = minDist * minDist + 1;
        const sqr = Math.max(xDist * xDist + yDist * yDist, distThreshSqr);

        if (sqr == distThreshSqr && settings.bodies.includes(body1) && settings.bodies.includes(body2) && body1.id != body2.id) {
          if (settings.globalCollide && body2.collide && body1.collide && !settings.paused) collision(body1, body2);
        } else {
          const dist = Math.sqrt(sqr);
          let xAccel = 0, yAccel = 0, forceX = 0, forceY = 0, kForce = 0, sForce = 0;

          if (settings.G != 0 && settings.gravity && !(body1.immovable && body2.immovable)) {
            const g = settings.G / sqr;
            xAccel = (g * xDist) / dist;
            yAccel = (g * yDist) / dist;
          }

          if ((settings.K != 0 && settings.electrostatic || settings.softbody) && !(body1.immovable && body2.immovable)) {
            if (settings.electrostatic) {
              kForce += settings.electrostatic ? (K * (-body1.charge) * body2.charge) / sqr : 0;
            }
            if (settings.softbody && dist < settings.springEquilPos * 1.2) {
              let springDist = dist - settings.springEquilPos;
              sForce += springDist * settings.springConst;
              body1.xVel *= settings.dampening;
              body1.yVel *= settings.dampening;
              body2.xVel *= settings.dampening;
              body2.yVel *= settings.dampening;
            }

            let force = kForce + sForce;
            forceX += force * xDist / dist;
            forceY += force * yDist / dist;
          }
          if (!body1.immovable) {
            body1.xAccel += (xAccel * body2.mass + forceX / body1.mass);
            body1.yAccel += (yAccel * body2.mass + forceY / body1.mass);
          }
          if (!body2.immovable) {
            body2.xAccel -= (xAccel * body1.mass + forceX / body2.mass);
            body2.yAccel -= (yAccel * body1.mass + forceY / body2.mass);
          }
        }
      }
    }
    // Update the position of the body
    if (!body1.immovable) {
      // body1.xPrev = body1.xPos;
      // body1.yPrev = body1.yPos;

      // implement acceleration
      body1.xVel += body1.xAccel * settings.timestep;
      body1.yVel += body1.yAccel * settings.timestep;

      // change pos based on velocity
      body1.xPos += body1.xVel * settings.timestep;
      body1.yPos += body1.yVel * settings.timestep;

      // reset acceleration
      body1.xAccel = 0;
      body1.yAccel = settings.uniformg;

      // edge collision
      if (settings.collide) {
        const xOffset = -settings.collideOffset.x + settings.currentOffset.x;
        const yOffset = -settings.collideOffset.y + settings.currentOffset.y;
        if (
          body1.xPos >= settings.xOffset + settings.width - body1.radius ||
          body1.xPos <= settings.xOffset + body1.radius
        ) {
          // increment collision
          // collisionCount += 1;
          // ui.collisionCount.innerHTML = collisionCount;

          // reverse velocity and implement CoR
          body1.xVel = settings.CoR * -body1.xVel;
          body1.yVel *= settings.CoR;

          // set position within box, visual glitch but accurate
          if (body1.xPos >= settings.xOffset + settings.width - body1.radius) {
            body1.xPos = 2 * (settings.xOffset + settings.width - body1.radius) - body1.xPos;
          } else {
            body1.xPos = 2 * (settings.xOffset + body1.radius) - body1.xPos;
          }
        }
        if (
          body1.yPos >= settings.yOffset + settings.height - body1.radius ||
          body1.yPos <= settings.yOffset + body1.radius
        ) {
          // increment collision
          // collisionCount += 1;
          // ui.collisionCount.innerHTML = collisionCount;

          // reverse velocity and implement CoR
          body1.xVel *= settings.CoR;
          body1.yVel = settings.CoR * -body1.yVel;

          // set position within box, visual glitch but accurate
          if (body1.yPos >= settings.yOffset + settings.height - body1.radius)
            body1.yPos = 2 * (settings.yOffset + settings.height - body1.radius) - body1.yPos;
          else body1.yPos = 2 * (settings.yOffset + body1.radius) - body1.yPos;
        }
      }
    }
  });
}
/**
 * Removes bodies during collision
 * @param {Array} arr input array
 * @param {Number} id id of the value to remove
 * @returns the input array without the removed body
 */
function remove(body, i = 0) {
  const index = body ? settings.bodies.indexOf(body) : i; //bodies.findIndex((body) => body.id === id);
  if (index != -1) {
    settings.bodies.splice(index, 1);
  }
}
/**
 * Calculate perfectly inelastic collisions, merge smaller body into larger
 * @param {Body} body1 the first body
 * @param {Body} body2 the second body
 */
function merge(body1, body2) {
  // collisionCount += 1;
  // ui.collisionCount.innerHTML = collisionCount;
  // activeBodies = bodies.length - 1;
  // ui.bodyCount.innerHTML = activeBodies;

  // merge masses and calculate corresponding radius and velocity based on momentum
  // color of new body is inherited from the larger
  const mass = body1.mass + body2.mass;
  const larger = (body1.immovable || body2.immovable) ? (body1.immovable ? body1 : body2) : (body1.mass > body2.mass ? body1 : body2);
  const smaller = larger === body1 ? body2 : body1;

  // if one is immovable, merge into that one
  if (!larger.immovable) {
    // get velocity based on momentum
    larger.xVel = (body1.getMomentum().x + body2.getMomentum().x) / mass;
    larger.yVel = (body1.getMomentum().y + body2.getMomentum().y) / mass;

    // move to cg
    larger.xPos = (body1.xPos * body1.mass + body2.xPos * body2.mass) / mass;
    larger.yPos = (body1.yPos * body1.mass + body2.yPos * body2.mass) / mass;
  }

  // if the density has been manually set, don't change it
  if (Math.abs(larger.radius - getRadius(larger.mass)) < 0.1) larger.radius = getRadius(mass);
  // Conserve mass and charge
  larger.mass = mass;
  larger.charge += smaller.charge;

  // Maintain tracking
  // if (trackBody === smaller) trackBody = larger;
  // Remove the smaller object
  remove(smaller);
}

/**
 * Calculate inelastic (CoR != 1) and elastic (CoR = 1) collisions
 * @param {Body} body1 the first body
 * @param {Body} body2 the second body
 */
function collision(body1, body2) {
  // increment collision counter
  // collisionCount += 1;
  // ui.collisionCount.innerHTML = collisionCount;
  if (settings.inelastic) merge(body1, body2); // combine the bodies into one
  else { // calculate non-perfectly inelastic collisions
    // larger and smaller bodies
    const larger = (body1.immovable || body2.immovable) ? (body1.immovable ? body1 : body2) : (body1.mass > body2.mass ? body1 : body2);
    const smaller = larger === body1 ? body2 : body1;

    // initial separation
    const xPosDist = body2.xPos - body1.xPos;
    const yPosDist = body2.yPos - body1.yPos;

    const xPosDistAbs = larger.xPos - smaller.xPos;
    const yPosDistAbs = larger.yPos - smaller.yPos;
    const d = Math.max(Math.sqrt(xPosDist * xPosDist + yPosDist * yPosDist), 0.0001);

    const totalMass = body1.mass + body2.mass;
    const massDiff = body1.mass - body2.mass;

    // set the bodies to not touch
    if (!larger.immovable && larger.mass - smaller.mass * 2 <= 0) {
      // set the bodies to just touch to avoid intersecting
      const midpointX = (larger.xPos * smaller.mass + smaller.xPos * larger.mass) / totalMass;
      const midpointY = (larger.yPos * smaller.mass + smaller.yPos * larger.mass) / totalMass;

      // move the bodies to just touch each other
      larger.xPos = midpointX + (larger.radius) * xPosDistAbs / d;
      larger.yPos = midpointY + (larger.radius) * yPosDistAbs / d;
      smaller.xPos = midpointX - (smaller.radius) * 1.1 * xPosDistAbs / d;
      smaller.yPos = midpointY - (smaller.radius) * 1.1 * yPosDistAbs / d;
    } else {
      // just move smaller
      smaller.xPos = larger.xPos - (larger.radius + smaller.radius) * xPosDistAbs / d;
      smaller.yPos = larger.yPos - (larger.radius + smaller.radius) * yPosDistAbs / d;
    }

    // Intiial velocity of the center of mass
    const vCoMX = (body1.getMomentum().x + body2.getMomentum().x) / totalMass;
    const vCoMY = (body1.getMomentum().y + body2.getMomentum().y) / totalMass;

    // angle of the collision normal
    const phi = Math.atan2(yPosDist, xPosDist);

    // net velocity magnitude
    const v1 = Math.sqrt(body1.xVel * body1.xVel + body1.yVel * body1.yVel);
    const v2 = Math.sqrt(body2.xVel * body2.xVel + body2.yVel * body2.yVel);

    // velocity angle relative to phi
    const a1 = Math.atan2(body1.yVel, body1.xVel) - phi;
    const a2 = Math.atan2(body2.yVel, body2.xVel) - phi;

    // velocity relative to the collision line
    const v1relX = v1 * Math.cos(a1);
    const v1relY = v1 * Math.sin(a1);
    const v2relX = v2 * Math.cos(a2);
    const v2relY = v2 * Math.sin(a2);

    // calculate final velocities in rotated frame, changing the component perpendicular to collision
    let v1finalXrel;
    let v2finalXrel;
    if (body1.immovable) {
      v1finalXrel = 0;
      v2finalXrel = -v2relX;
    } else if (body2.immovable) {
      v1finalXrel = -v1relX;
      v2finalXrel = 0;
    } else {
      v1finalXrel = (massDiff * v1relX + 2 * body2.mass * v2relX) / (totalMass);
      v2finalXrel = (2 * body1.mass * v1relX - massDiff * v2relX) / (totalMass);
    }

    // precompute these values
    const cosPhi = Math.cos(phi);
    const sinPhi = Math.sin(phi);

    // switch back to original frame and get final velocities, then implement new velocity with CoR if not immovable
    if (!body1.immovable) {
      const v1xFinal = cosPhi * v1finalXrel - sinPhi * v1relY;
      const v1yFinal = sinPhi * v1finalXrel + cosPhi * v1relY;
      body1.xVel = vCoMX + CoR * (v1xFinal - vCoMX);
      if (body1.lockAxis != "y") body1.yVel = vCoMY + CoR * (v1yFinal - vCoMY);
    }
    if (!body2.immovable) {
      const v2xFinal = cosPhi * v2finalXrel - sinPhi * v2relY;
      const v2yFinal = sinPhi * v2finalXrel + cosPhi * v2relY;
      body2.xVel = vCoMX + CoR * (v2xFinal - vCoMX);
      if (body2.lockAxis != "y") body2.yVel = vCoMY + CoR * (v2yFinal - vCoMY);
    }
  }
}


self.onmessage = function (event) {
  const data = event.data;
  // let { bodiesData, G, K, drawGravityStrength, drawKStrength, drawSStrength,
  //   gravity, electrostatic, softbody, globalCollide, paused, springEquilPos,
  //   springConst, dampening, bodyCount, timestep, uniformg, collideOffset, currentOffset, CoR, width, height, collide, inelastic } = data;
  settings = data;
  settings.bodies = settings.bodiesData.map(body => new Body(...Object.values(body)));



  runSim();

  self.postMessage({
    bodiesData: settings.bodies.map(body => ({
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
    }))
  });

};