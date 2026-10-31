// Original procedural authoring functions. Configuration is data, never eval'd code.
// Runtime parameters drive mesh keyforms; this module does not produce agent speech.
const LIMITS = Object.freeze({ meshes: 64, vertices: 4096, keyforms: 4096 });
const finite = (x, label) => {
  if (!Number.isFinite(x)) throw new Error(`${label}: expected finite number`);
  return x;
};
const count = (x, min, max, label) => {
  if (!Number.isSafeInteger(x) || x < min || x > max)
    throw new Error(`${label}: out of bounds`);
  return x;
};
function pair(x, label) {
  if (!Array.isArray(x) || x.length !== 2)
    throw new Error(`${label}: expected pair`);
  return x.map((v) => finite(v, label));
}
export function ellipse({
  center = [0, 0],
  radius = [1, 1],
  segments = 24,
} = {}) {
  const [cx, cy] = pair(center, "ellipse center");
  const [rx, ry] = pair(radius, "ellipse radius");
  if (rx <= 0 || ry <= 0) throw new Error("ellipse: positive radii required");
  count(segments, 3, 256, "ellipse segments");
  const positions = [[cx, cy]];
  const uvs = [[0.5, 0.5]];
  for (let i = 0; i < segments; i++) {
    const t = (i * Math.PI * 2) / segments;
    positions.push([cx + rx * Math.cos(t), cy + ry * Math.sin(t)]);
    uvs.push([0.5 + Math.cos(t) / 2, 0.5 + Math.sin(t) / 2]);
  }
  const indices = [];
  for (let i = 0; i < segments; i++)
    indices.push(0, i + 1, ((i + 1) % segments) + 1);
  return { positions, uvs, indices };
}
export function grid({
  center = [0, 0],
  size = [1, 1],
  columns = 2,
  rows = 2,
} = {}) {
  const [cx, cy] = pair(center, "grid center");
  const [w, h] = pair(size, "grid size");
  if (w <= 0 || h <= 0) throw new Error("grid: positive size required");
  count(columns, 1, 32, "grid columns");
  count(rows, 1, 32, "grid rows");
  const positions = [],
    uvs = [],
    indices = [];
  for (let y = 0; y <= rows; y++)
    for (let x = 0; x <= columns; x++) {
      positions.push([cx + (x / columns - 0.5) * w, cy + (y / rows - 0.5) * h]);
      uvs.push([x / columns, y / rows]);
    }
  for (let y = 0; y < rows; y++)
    for (let x = 0; x < columns; x++) {
      const a = y * (columns + 1) + x,
        b = a + 1,
        c = a + columns + 1,
        d = c + 1;
      indices.push(a, b, d, a, d, c);
    }
  return { positions, uvs, indices };
}
export function ribbon({
  origin = [0, 0],
  length = 1,
  width = 0.12,
  curve = 0.2,
  segments = 12,
} = {}) {
  const [ox, oy] = pair(origin, "ribbon origin");
  finite(length, "ribbon length");
  finite(width, "ribbon width");
  finite(curve, "ribbon curve");
  if (length <= 0 || width <= 0)
    throw new Error("ribbon: positive dimensions required");
  count(segments, 1, 128, "ribbon segments");
  const positions = [],
    uvs = [],
    indices = [];
  for (let i = 0; i <= segments; i++) {
    const t = i / segments,
      x = ox + curve * Math.sin(t * Math.PI),
      y = oy - length * t;
    const half = (width * (1 - t * 0.6)) / 2;
    positions.push([x - half, y], [x + half, y]);
    uvs.push([0, t], [1, t]);
    if (i < segments) {
      const a = i * 2;
      indices.push(a, a + 2, a + 3, a, a + 3, a + 1);
    }
  }
  return { positions, uvs, indices };
}
const shapes = { ellipse, grid, ribbon };
function transform(points, driver, value) {
  const pivot = pair(driver.pivot ?? [0, 0], "driver pivot");
  const amount = finite(driver.amount ?? 1, "driver amount");
  const base = finite(driver.base ?? 0, "driver base");
  const v = base + value * amount;
  const kind = driver.kind;
  if (
    ![
      "translateX",
      "translateY",
      "rotate",
      "scaleX",
      "scaleY",
      "bend",
    ].includes(kind)
  )
    throw new Error(`unsupported driver ${kind}`);
  return points.map(([x, y]) => {
    const dx = x - pivot[0],
      dy = y - pivot[1];
    if (kind === "translateX") return [x + v, y];
    if (kind === "translateY") return [x, y + v];
    if (kind === "scaleX") return [pivot[0] + dx * v, y];
    if (kind === "scaleY") return [x, pivot[1] + dy * v];
    if (kind === "bend") return [x + v * dy * dy, y];
    const a = (v * Math.PI) / 180;
    return [
      pivot[0] + dx * Math.cos(a) - dy * Math.sin(a),
      pivot[1] + dx * Math.sin(a) + dy * Math.cos(a),
    ];
  });
}
export function compileTemplate(template) {
  if (!template || template.format !== "purism-template/v1")
    throw new Error("unsupported template format");
  if (!Array.isArray(template.parameters) || !Array.isArray(template.meshes))
    throw new Error("parameter/mesh arrays required");
  count(template.meshes.length, 1, LIMITS.meshes, "mesh count");
  const params = new Map();
  for (const p of template.parameters) {
    if (
      typeof p.id !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(p.id) ||
      params.has(p.id)
    )
      throw new Error("invalid/duplicate parameter id");
    finite(p.min, "parameter min");
    finite(p.max, "parameter max");
    finite(p.default, "parameter default");
    if (!(p.min < p.max && p.default >= p.min && p.default <= p.max))
      throw new Error("invalid parameter range");
    const keys =
      p.keys ?? [...new Set([p.min, p.default, p.max])].sort((a, b) => a - b);
    if (
      !Array.isArray(keys) ||
      keys.length < 2 ||
      keys.length > 16 ||
      keys[0] !== p.min ||
      keys.at(-1) !== p.max ||
      keys.some((k, i) => !Number.isFinite(k) || (i > 0 && k <= keys[i - 1]))
    )
      throw new Error("invalid parameter keys");
    params.set(p.id, { ...p, keys: [...keys] });
  }
  const names = new Set();
  let totalKeyforms = 0;
  const meshes = template.meshes.map((m, index) => {
    if (
      typeof m.id !== "string" ||
      !/^[A-Za-z][A-Za-z0-9_]{0,62}$/.test(m.id) ||
      names.has(m.id)
    )
      throw new Error("invalid/duplicate mesh id");
    names.add(m.id);
    if (!Object.hasOwn(shapes, m.shape))
      throw new Error(`unknown shape ${m.shape}`);
    const geometry = shapes[m.shape](m.geometry);
    count(geometry.positions.length, 3, LIMITS.vertices, "vertex count");
    const drivers = m.drivers ?? [];
    if (!Array.isArray(drivers) || drivers.length > 8)
      throw new Error("invalid drivers");
    const ids = [...new Set(drivers.map((d) => d.parameter))];
    const bindings = ids.map((id) => {
      const p = params.get(id);
      if (!p) throw new Error(`unknown parameter ${id}`);
      return { parameter: id, keys: [...p.keys] };
    });
    let combinations = [{}];
    for (const binding of bindings) {
      // First binding changes fastest; Purism interpolates this mixed-radix order.
      combinations = binding.keys.flatMap((v) =>
        combinations.map((c) => ({ ...c, [binding.parameter]: v })),
      );
      if (combinations.length > LIMITS.keyforms)
        throw new Error("keyform budget exceeded");
    }
    totalKeyforms += combinations.length;
    if (totalKeyforms > LIMITS.keyforms)
      throw new Error("total keyform budget exceeded");
    const keyforms = combinations.map((c) => {
      let positions = geometry.positions.map((p) => [...p]);
      for (const d of drivers)
        positions = transform(positions, d, c[d.parameter]);
      for (const p of positions)
        p.forEach((v) => finite(v, "transformed position"));
      return { positions, opacity: 1, order: index };
    });
    // Procedural texture atlas: each mesh gets a constant-color cell, no inherited artwork.
    const color = m.color ?? "#70d9e8";
    if (!/^#[0-9a-fA-F]{6}$/.test(color))
      throw new Error("color must be #RRGGBB");
    const uvs = geometry.uvs.map(([u, v]) => [
      (index + 0.125 + u * 0.75) / template.meshes.length,
      0.125 + v * 0.75,
    ]);
    return {
      id: m.id,
      ...geometry,
      uvs,
      texture: 0,
      order: index,
      bindings,
      keyforms,
      color,
    };
  });
  return {
    canvas: template.canvas ?? { width: 512, height: 512, pixelsPerUnit: 256 },
    parameters: [...params.values()],
    meshes,
  };
}
export function createEchoSeed({
  eyeSpacing = 0.24,
  headWidth = 0.64,
  headHeight = 0.68,
  ribbonLength = 0.65,
  accent = "#eeaeff",
} = {}) {
  for (const [k, v] of Object.entries({
    eyeSpacing,
    headWidth,
    headHeight,
    ribbonLength,
  })) {
    finite(v, k);
    if (v <= 0 || v > 2) throw new Error(`${k}: expected (0,2]`);
  }
  const rot = {
    kind: "rotate",
    parameter: "ParamAngleZ",
    amount: 1,
    pivot: [0, 0.25],
  };
  const param = (id, min, max, d) => ({ id, min, max, default: d });
  const mesh = (id, shape, geometry, color, drivers = []) => ({
    id,
    shape,
    geometry,
    color,
    drivers,
  });
  const eye = (side, x) =>
    mesh(
      `Eye${side}`,
      "ellipse",
      { center: [x, 0.53], radius: [0.13, 0.09] },
      "#143e56",
      [
        {
          kind: "scaleY",
          parameter: `ParamEye${side}Open`,
          base: 0.04,
          amount: 0.96,
          pivot: [x, 0.53],
        },
        rot,
      ],
    );
  return {
    format: "purism-template/v1",
    name: "EchoSeed",
    canvas: { width: 512, height: 512, pixelsPerUnit: 256 },
    parameters: [
      param("ParamAngleZ", -20, 20, 0),
      param("ParamEyeLOpen", 0, 1, 1),
      param("ParamEyeROpen", 0, 1, 1),
      param("ParamMouthOpenY", 0, 1, 0),
      param("ParamBreath", 0, 1, 0),
      param("ParamHairSwing", -1, 1, 0),
    ],
    meshes: [
      mesh(
        "Body",
        "ellipse",
        { center: [0, -0.48], radius: [0.45, 0.44] },
        "#305a85",
        [
          {
            kind: "scaleY",
            parameter: "ParamBreath",
            base: 1,
            amount: 0.035,
            pivot: [0, -0.9],
          },
        ],
      ),
      mesh(
        "RibbonL",
        "ribbon",
        { origin: [-0.55, 0.75], length: ribbonLength, curve: -0.1 },
        accent,
        [
          {
            kind: "bend",
            parameter: "ParamHairSwing",
            amount: 0.25,
            pivot: [-0.55, 0.75],
          },
          rot,
        ],
      ),
      mesh(
        "RibbonR",
        "ribbon",
        { origin: [0.55, 0.75], length: ribbonLength, curve: 0.1 },
        accent,
        [
          {
            kind: "bend",
            parameter: "ParamHairSwing",
            amount: 0.25,
            pivot: [0.55, 0.75],
          },
          rot,
        ],
      ),
      mesh(
        "Head",
        "ellipse",
        { center: [0, 0.47], radius: [headWidth, headHeight] },
        "#70d9e8",
        [rot],
      ),
      eye("L", -eyeSpacing),
      eye("R", eyeSpacing),
      mesh(
        "Mouth",
        "ellipse",
        { center: [0, 0.19], radius: [0.14, 0.12] },
        "#493554",
        [
          {
            kind: "scaleY",
            parameter: "ParamMouthOpenY",
            base: 0.08,
            amount: 0.92,
            pivot: [0, 0.19],
          },
          rot,
        ],
      ),
      mesh(
        "Antenna",
        "grid",
        { center: [0, 1.18], size: [0.025, 0.18], columns: 1, rows: 1 },
        accent,
        [rot],
      ),
      mesh(
        "AntennaTip",
        "ellipse",
        { center: [0, 1.28], radius: [0.07, 0.07], segments: 16 },
        accent,
        [rot],
      ),
    ],
  };
}
export const TEMPLATE_LIMITS = LIMITS;
