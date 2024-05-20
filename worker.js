
self.onmessage = function (event) {
  const data = event.data;
  const { bodies, G, K, drawField, drawGravityStrength, drawKStrength, drawSStrength,
    gravity, electrostatic, softbody, globalCollide, paused, springEquilPos,
    springConst, dampening, drawGThreshold, drawKThreshold, trace, totalzoom, ctx } = data;

  function runSim() {
    let maxBody = { mass: 0 };
    bodies.forEach((body, index) => {
      const body1 = body;
      if (drawField && body1.mass > maxBody.mass) maxBody = body1;
      if (bodies.length > 1 &&
        (((gravity && G || softbody || electrostatic && K || globalCollide) && !paused) ||
          (drawGravityStrength || drawKStrength || drawSStrength))) {
        for (let i = index + 1; i < bodies.length; i++) {
          const body2 = bodies[i];

          const xDist = body2.xPos - body1.xPos;
          const yDist = body2.yPos - body1.yPos;

          const minDist = body1.radius + body2.radius;
          const distThreshSqr = minDist * minDist + 1;
          const sqr = Math.max(xDist * xDist + yDist * yDist, distThreshSqr);

          if (sqr == distThreshSqr && bodies.includes(body1) && bodies.includes(body2) && body1.id != body2.id) {
            if (globalCollide && body2.collide && body1.collide && !paused) collision(body1, body2);
          } else {
            const dist = Math.sqrt(sqr);
            let xAccel = 0, yAccel = 0, forceX = 0, forceY = 0, kForce = 0, sForce = 0;

            if (G != 0 && gravity && !(body1.immovable && body2.immovable)) {
              const g = G / sqr;
              xAccel = (g * xDist) / dist;
              yAccel = (g * yDist) / dist;

              if (drawGravityStrength) {
                const strength = Math.abs(1 - 10 / (g * body1.mass * body2.mass + 10));
                const drawThreshold = drawGThreshold ? (trace ? 1e-4 : 1e-2) : 0;
                if (strength >= drawThreshold) {
                  ctx.beginPath();
                  ctx.strokeStyle =
                    "rgba(" + (255 - 255 * strength) + ", " + (255 * strength) + ",0 ," + strength + ")";
                  ctx.lineWidth = 1 / totalzoom;
                  ctx.moveTo(body2.xPos, body2.yPos);
                  ctx.lineTo(body1.xPos, body1.yPos);
                  ctx.closePath();
                  ctx.stroke();
                }
              }
            }

            if ((K != 0 && electrostatic || softbody) && !(body1.immovable && body2.immovable)) {
              if (electrostatic) {
                kForce += electrostatic ? (K * (-body1.charge) * body2.charge) / sqr : 0;

                if (drawKStrength && kForce != 0) {
                  const strength = Math.sign(kForce) * (1 - 10 / (Math.abs(kForce) + 10));
                  const drawThreshold = drawKThreshold ? (trace ? 1e-4 : 1e-2) : 0;
                  if (Math.abs(strength) >= drawThreshold) {
                    ctx.beginPath();
                    ctx.strokeStyle =
                      "rgba(" + (strength > 0 ? 0 : 255) + ", " + (strength > 0 ? 255 : 0) + ",0 ," + Math.abs(strength) + ")";
                    ctx.lineWidth = 1 / totalzoom;
                    ctx.moveTo(body2.xPos, body2.yPos);
                    ctx.lineTo(body1.xPos, body1.yPos);
                    ctx.closePath();
                    ctx.stroke();
                  }
                }
              }
              if (softbody && dist < springEquilPos * 1.2) {
                let springDist = dist - springEquilPos;
                sForce += springDist * springConst;
                body1.xVel *= dampening;
                body1.yVel *= dampening;
                body2.xVel *= dampening;
                body2.yVel *= dampening;

                if (drawSStrength) {
                  const strength = Math.sign(sForce) * (1 - 10 / (Math.abs(sForce) + 10));
                  const scaledStrength = 127.5 * strength;
                  ctx.beginPath();
                  ctx.strokeStyle =
                    "rgba(" + (127.5 - scaledStrength) + ", " + (127.5 + scaledStrength) + ",0 ," + (127.5 + Math.abs(scaledStrength)) + ")";
                  ctx.lineWidth = 1 / totalzoom;
                  ctx.moveTo(body2.xPos, body2.yPos);
                  ctx.lineTo(body1.xPos, body1.yPos);
                  ctx.closePath();
                  ctx.stroke();
                }
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
    });
  }

  /**
 * Calculate perfectly inelastic collisions, merge smaller body into larger
 * @param {Body} body1 the first body
 * @param {Body} body2 the second body
 */
  function merge(body1, body2) {
    // collisionCount += 1;
    // ui.collisionCount.innerText = collisionCount;
    activeBodies = bodies.length - 1;
    ui.bodyCount.innerText = activeBodies;

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
    if (trackBody === smaller) trackBody = larger;
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
    collisionCount += 1;
    ui.collisionCount.innerText = collisionCount;
    if (inelastic) merge(body1, body2); // combine the bodies into one
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

  runSim();
  self.postMessage({ bodies });
};