/**
 * Host-side Cubism dynamics helpers.
 *
 * Purism Core only evaluates a MOC3 model's parameter/geometry state.  It does
 * not schedule clips or own physics.  These helpers deliberately return the
 * standard data that the Cubism SDK consumes; the application host is
 * responsible for sampling a motion and passing its parameters to the model.
 */

const CUBISM_FPS = 30;
const MAX_SPRING_FREQUENCY = 60;
const MAX_SPRING_DAMPING = 10;
const MAX_SPRING_DT = 0.25;

function isRecord(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function assertFiniteNumber(value, name) {
  if (typeof value !== "number" || !Number.isFinite(value)) {
    throw new TypeError(`${name} must be a finite number`);
  }
  return value;
}

function assertIdentifier(value, name) {
  if (typeof value !== "string" || value.trim() === "") {
    throw new TypeError(`${name} must be a non-empty string`);
  }
  return value;
}

function collectParameterIds(parameters) {
  const ids = new Set();

  const add = (value, name) => ids.add(assertIdentifier(value, name));
  const addEntry = (entry, name) => {
    if (typeof entry === "string") {
      add(entry, name);
      return;
    }
    if (isRecord(entry)) {
      if (typeof entry.Id === "string") {
        add(entry.Id, `${name}.Id`);
        return;
      }
      if (typeof entry.id === "string") {
        add(entry.id, `${name}.id`);
        return;
      }
    }
    throw new TypeError(`${name} must be a parameter id or an object with Id`);
  };

  if (parameters instanceof Map) {
    for (const id of parameters.keys()) add(id, "parameters key");
  } else if (parameters instanceof Set || Array.isArray(parameters)) {
    for (const entry of parameters) addEntry(entry, "parameters entry");
  } else if (isRecord(parameters)) {
    // Accommodate the common model-definition shape while keeping the simple
    // API as an array/set of parameter IDs.
    if (parameters.parameters !== undefined)
      return collectParameterIds(parameters.parameters);
    if (parameters.Parameters !== undefined)
      return collectParameterIds(parameters.Parameters);
    for (const id of Object.keys(parameters)) add(id, "parameters key");
  } else {
    throw new TypeError(
      "parameters must be an array, Set, Map, or parameter-id record",
    );
  }

  if (ids.size === 0) {
    throw new RangeError("parameters must contain at least one parameter id");
  }
  return ids;
}

function readClipKeys(segments, parameter) {
  if (!Array.isArray(segments) || segments.length < 2) {
    throw new TypeError(`curve ${parameter} must contain a start point`);
  }

  const startTime = assertFiniteNumber(
    segments[0],
    `curve ${parameter} start time`,
  );
  const startValue = assertFiniteNumber(
    segments[1],
    `curve ${parameter} start value`,
  );
  const keys = [{ time: startTime, value: startValue }];

  for (let index = 2; index < segments.length; index += 3) {
    if (segments[index] !== 0) {
      throw new RangeError(
        `curve ${parameter} contains a non-linear Cubism segment`,
      );
    }
    if (index + 2 >= segments.length) {
      throw new TypeError(
        `curve ${parameter} has an incomplete linear segment`,
      );
    }
    const time = assertFiniteNumber(
      segments[index + 1],
      `curve ${parameter} key time`,
    );
    const value = assertFiniteNumber(
      segments[index + 2],
      `curve ${parameter} key value`,
    );
    if (time <= keys[keys.length - 1].time) {
      throw new RangeError(
        `curve ${parameter} key times must be strictly increasing`,
      );
    }
    keys.push({ time, value });
  }

  return keys;
}

function normalizeSampleTime(duration, loop, time) {
  assertFiniteNumber(time, "time");
  if (!loop) return Math.min(duration, Math.max(0, time));

  const wrapped = time % duration;
  return wrapped < 0 ? wrapped + duration : wrapped;
}

function sampleKeys(keys, time) {
  if (time <= keys[0].time) return keys[0].value;
  const finalKey = keys[keys.length - 1];
  if (time >= finalKey.time) return finalKey.value;

  for (let index = 1; index < keys.length; index += 1) {
    const right = keys[index];
    if (time <= right.time) {
      const left = keys[index - 1];
      const progress = (time - left.time) / (right.time - left.time);
      return left.value + (right.value - left.value) * progress;
    }
  }

  // The boundary checks above make this unreachable, but return the last value
  // rather than leaking an implementation detail if a caller supplies a clip
  // with an unusual floating-point boundary.
  return finalKey.value;
}

/**
 * Create a standard Cubism 3 motion JSON object made only of linear parameter
 * curves. `name` is retained as non-enumerable host metadata so JSON output
 * remains an unmodified motion3 payload.
 */
export function createMotionClip(definition, parameters) {
  if (!isRecord(definition)) {
    throw new TypeError("clip definition must be an object");
  }

  const name = assertIdentifier(definition.name, "name");
  const duration = assertFiniteNumber(definition.duration, "duration");
  if (duration <= 0) throw new RangeError("duration must be greater than zero");
  if (typeof definition.loop !== "boolean") {
    throw new TypeError("loop must be a boolean");
  }
  if (!Array.isArray(definition.tracks) || definition.tracks.length === 0) {
    throw new RangeError("tracks must contain at least one parameter track");
  }

  const parameterIds = collectParameterIds(parameters);
  const seenTracks = new Set();
  let totalSegmentCount = 0;
  let totalPointCount = 0;

  const curves = definition.tracks.map((track, trackIndex) => {
    if (!isRecord(track)) {
      throw new TypeError(`tracks[${trackIndex}] must be an object`);
    }
    const parameter = assertIdentifier(
      track.parameter,
      `tracks[${trackIndex}].parameter`,
    );
    if (!parameterIds.has(parameter)) {
      throw new RangeError(
        `tracks[${trackIndex}].parameter is not in parameters: ${parameter}`,
      );
    }
    if (seenTracks.has(parameter)) {
      throw new RangeError(`duplicate parameter track: ${parameter}`);
    }
    seenTracks.add(parameter);

    if (!Array.isArray(track.keys) || track.keys.length === 0) {
      throw new RangeError(
        `tracks[${trackIndex}].keys must contain at least one key`,
      );
    }

    const keys = track.keys.map((key, keyIndex) => {
      if (!isRecord(key)) {
        throw new TypeError(
          `tracks[${trackIndex}].keys[${keyIndex}] must be an object`,
        );
      }
      const time = assertFiniteNumber(
        key.time,
        `tracks[${trackIndex}].keys[${keyIndex}].time`,
      );
      const value = assertFiniteNumber(
        key.value,
        `tracks[${trackIndex}].keys[${keyIndex}].value`,
      );
      if (time < 0 || time > duration) {
        throw new RangeError(
          `tracks[${trackIndex}].keys[${keyIndex}].time must be within 0..duration`,
        );
      }
      if (keyIndex > 0 && time <= track.keys[keyIndex - 1].time) {
        throw new RangeError(
          `tracks[${trackIndex}].keys must have strictly increasing times`,
        );
      }
      return { time, value };
    });

    const segments = [keys[0].time, keys[0].value];
    for (let keyIndex = 1; keyIndex < keys.length; keyIndex += 1) {
      const key = keys[keyIndex];
      // Cubism motion3 segment type 0 is a linear segment.
      segments.push(0, key.time, key.value);
    }

    totalSegmentCount += keys.length - 1;
    totalPointCount += keys.length;
    return { Target: "Parameter", Id: parameter, Segments: segments };
  });

  const clip = {
    Version: 3,
    Meta: {
      Duration: duration,
      Fps: CUBISM_FPS,
      Loop: definition.loop,
      AreBeziersRestricted: true,
      CurveCount: curves.length,
      TotalSegmentCount: totalSegmentCount,
      TotalPointCount: totalPointCount,
      UserDataCount: 0,
      TotalUserDataSize: 0,
    },
    Curves: curves,
  };

  Object.defineProperty(clip, "name", {
    configurable: false,
    enumerable: false,
    value: name,
    writable: false,
  });
  return clip;
}

/**
 * Sample a linear Cubism motion JSON object into a parameter-value map. This is
 * a pure seek operation: it does not advance a clock or retain playback state.
 */
export function sampleClip(clip, time) {
  if (!isRecord(clip) || !isRecord(clip.Meta) || !Array.isArray(clip.Curves)) {
    throw new TypeError("clip must be a motion3 JSON object");
  }
  const duration = assertFiniteNumber(clip.Meta.Duration, "clip.Meta.Duration");
  if (duration <= 0)
    throw new RangeError("clip.Meta.Duration must be greater than zero");
  if (typeof clip.Meta.Loop !== "boolean") {
    throw new TypeError("clip.Meta.Loop must be a boolean");
  }

  const sampleTime = normalizeSampleTime(duration, clip.Meta.Loop, time);
  const values = {};
  const seenParameters = new Set();

  for (let index = 0; index < clip.Curves.length; index += 1) {
    const curve = clip.Curves[index];
    if (!isRecord(curve) || curve.Target !== "Parameter") {
      throw new TypeError(`clip.Curves[${index}] must be a Parameter curve`);
    }
    const parameter = assertIdentifier(curve.Id, `clip.Curves[${index}].Id`);
    if (seenParameters.has(parameter)) {
      throw new RangeError(`duplicate parameter curve: ${parameter}`);
    }
    seenParameters.add(parameter);
    Object.defineProperty(values, parameter, {
      configurable: true,
      enumerable: true,
      value: sampleKeys(readClipKeys(curve.Segments, parameter), sampleTime),
      writable: true,
    });
  }

  return values;
}

/**
 * Create one standard Cubism Physics3 pendulum setting. The SDK owns its
 * evaluation; `frequency` and `damping` are mapped to the documented vertex
 * delay and mobility controls rather than stored as non-standard JSON fields.
 */
export function createPhysics3({
  input,
  output,
  frequency = 5,
  damping = 0.35,
} = {}) {
  assertIdentifier(input, "input");
  assertIdentifier(output, "output");
  assertFiniteNumber(frequency, "frequency");
  assertFiniteNumber(damping, "damping");
  if (frequency <= 0 || frequency > CUBISM_FPS) {
    throw new RangeError(
      `frequency must be greater than zero and no more than ${CUBISM_FPS}`,
    );
  }
  if (damping < 0 || damping > 1) {
    throw new RangeError("damping must be between 0 and 1");
  }

  const setting = {
    Id: "PhysicsSetting1",
    Input: [
      {
        Source: { Target: "Parameter", Id: input },
        Weight: 100,
        Type: "Angle",
        Reflect: false,
      },
    ],
    Output: [
      {
        Destination: { Target: "Parameter", Id: output },
        VertexIndex: 1,
        Scale: 1,
        Weight: 100,
        Type: "Angle",
        Reflect: false,
      },
    ],
    Vertices: [
      {
        Position: { X: 0, Y: 0 },
        Mobility: 1,
        Delay: 0,
        Acceleration: 0,
        Radius: 0,
      },
      {
        Position: { X: 0, Y: 1 },
        // Cubism's delay is inversely proportional to response frequency.
        Delay: 1 / frequency,
        // Mobility is the retained velocity fraction (one minus damping).
        Mobility: 1 - damping,
        Acceleration: 1,
        Radius: 1,
      },
    ],
    Normalization: {
      Position: { Minimum: -10, Default: 0, Maximum: 10 },
      Angle: { Minimum: -30, Default: 0, Maximum: 30 },
    },
  };

  return {
    Version: 3,
    Meta: {
      PhysicsSettingCount: 1,
      TotalInputCount: 1,
      TotalOutputCount: 1,
      VertexCount: setting.Vertices.length,
      Fps: CUBISM_FPS,
      EffectiveForces: {
        Gravity: { X: 0, Y: -1 },
        Wind: { X: 0, Y: 0 },
      },
      PhysicsDictionary: [{ Id: setting.Id, Name: output }],
    },
    PhysicsSettings: [setting],
  };
}

function integrateDampedSpring(
  position,
  velocity,
  target,
  angularFrequency,
  damping,
  dt,
) {
  const displacement = position - target;

  if (damping < 1) {
    const dampedFrequency = angularFrequency * Math.sqrt(1 - damping * damping);
    const decay = Math.exp(-damping * angularFrequency * dt);
    const cosine = Math.cos(dampedFrequency * dt);
    const sine = Math.sin(dampedFrequency * dt);
    const nextPosition =
      target +
      decay *
        (displacement * cosine +
          ((velocity + damping * angularFrequency * displacement) /
            dampedFrequency) *
            sine);
    const nextVelocity =
      decay *
      (velocity *
        (cosine - ((damping * angularFrequency) / dampedFrequency) * sine) -
        displacement *
          ((angularFrequency * angularFrequency) / dampedFrequency) *
          sine);
    return { position: nextPosition, velocity: nextVelocity };
  }

  if (damping === 1) {
    const decay = Math.exp(-angularFrequency * dt);
    const coefficient = velocity + angularFrequency * displacement;
    return {
      position: target + decay * (displacement + coefficient * dt),
      velocity: decay * (velocity - angularFrequency * coefficient * dt),
    };
  }

  const root = Math.sqrt(damping * damping - 1);
  const slowRoot = -angularFrequency * (damping - root);
  const fastRoot = -angularFrequency * (damping + root);
  const slowCoefficient =
    (velocity - fastRoot * displacement) / (slowRoot - fastRoot);
  const fastCoefficient = displacement - slowCoefficient;
  const slow = Math.exp(slowRoot * dt);
  const fast = Math.exp(fastRoot * dt);
  return {
    position: target + slowCoefficient * slow + fastCoefficient * fast,
    velocity:
      slowCoefficient * slowRoot * slow + fastCoefficient * fastRoot * fast,
  };
}

/**
 * Create an independent, caller-driven damped oscillator.  It has no timer or
 * global state. A single host update is bounded to 250 ms so a suspended tab or
 * a malformed delta cannot inject an unbounded state transition.
 */
export function createSpring({
  frequency,
  damping,
  position = 0,
  velocity = 0,
} = {}) {
  assertFiniteNumber(frequency, "frequency");
  assertFiniteNumber(damping, "damping");
  assertFiniteNumber(position, "position");
  assertFiniteNumber(velocity, "velocity");
  if (frequency <= 0 || frequency > MAX_SPRING_FREQUENCY) {
    throw new RangeError(
      `frequency must be greater than zero and no more than ${MAX_SPRING_FREQUENCY}`,
    );
  }
  if (damping < 0 || damping > MAX_SPRING_DAMPING) {
    throw new RangeError(`damping must be between 0 and ${MAX_SPRING_DAMPING}`);
  }

  const initial = { position, velocity };
  const angularFrequency = 2 * Math.PI * frequency;
  let state = { ...initial };

  const snapshot = () => ({
    position: state.position,
    velocity: state.velocity,
  });

  return {
    step(target, dt) {
      assertFiniteNumber(target, "target");
      assertFiniteNumber(dt, "dt");
      if (dt < 0) throw new RangeError("dt must not be negative");

      const boundedDt = Math.min(dt, MAX_SPRING_DT);
      if (boundedDt > 0) {
        const next = integrateDampedSpring(
          state.position,
          state.velocity,
          target,
          angularFrequency,
          damping,
          boundedDt,
        );
        assertFiniteNumber(next.position, "computed spring position");
        assertFiniteNumber(next.velocity, "computed spring velocity");
        state = next;
      }
      return snapshot();
    },
    reset() {
      state = { ...initial };
      return snapshot();
    },
    snapshot,
  };
}
