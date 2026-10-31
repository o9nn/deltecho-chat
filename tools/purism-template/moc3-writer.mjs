/*
 * Bounded MOC3 v3.0 writer for PurismCore v1.1.0 (v5 WASM).
 *
 * Section ordering and field mapping were derived from the MIT-licensed
 * SakuraMotion/PurismCore reader: src/moc3.h, moc3.c, verify.c, param.c,
 * gather.h, artmesh.c, and render.c. This writer creates fresh bytes from
 * the supplied spec; it neither reads nor incorporates an existing MOC.
 *
 * This is intentionally a direct-ArtMesh subset for the tested PurismCore
 * runtime, not a claim of compatibility with proprietary Cubism Core builds.
 */

import { Buffer } from "node:buffer";

const MOC_VERSION_30 = 1;
const HEADER_BYTES = 64;
const OFFSET_COUNT = 160;
// Native PurismCore v1.1.0 v5 sizeof(psm__moc3_data_v52) is 2,064 bytes on
// 64-bit hosts. The same prefix is also safely larger than the WASM32 layout.
const RUNTIME_WORKSPACE_BYTES = 2064;
const POINTER_SLOT_BYTES = 8;
const SECTION_COUNT_V30 = 101;
const COUNT_INFO_INTS = 32;
const CANVAS_BYTES = 24;
const ID_BYTES = 64;
const MAX_PARAMETERS = 128;
const MAX_MESHES = 1024;
const MAX_VERTICES_PER_MESH = 8192;
const MAX_INDICES_PER_MESH = 24576;
const MAX_BINDINGS_PER_MESH = 12;
const MAX_KEYFORMS_PER_MESH = 65536;
const MAX_TOTAL_KEYFORMS = 131072;
const MAX_TOTAL_POSITION_SCALARS = 4_000_000;
const MAX_TOTAL_BYTES = 64 * 1024 * 1024;
const MAX_DRAW_ORDER_MAGNITUDE = 8192;
const MAX_DRAW_ORDER_SPAN = 16384;

const Section = Object.freeze({
  countInfo: 0,
  canvas: 1,
  artIdRuntime: 29,
  artUvRuntime: 30,
  artIndexRuntime: 31,
  artMaskRuntime: 32,
  artId: 33,
  artBinding: 34,
  artKeyformOffset: 35,
  artKeyformLength: 36,
  artVisible: 37,
  artEnable: 38,
  artParentPart: 39,
  artParentDeformer: 40,
  artTexture: 41,
  artFlags: 42,
  artVertexCount: 43,
  artUvOffset: 44,
  artIndexOffset: 45,
  artIndexLength: 46,
  artMaskOffset: 47,
  artMaskLength: 48,
  parameterIdRuntime: 49,
  parameterId: 50,
  parameterMaximum: 51,
  parameterMinimum: 52,
  parameterDefault: 53,
  parameterRepeat: 54,
  parameterDecimalPlaces: 55,
  parameterKeyTableOffset: 56,
  parameterKeyTableLength: 57,
  artKeyOpacity: 68,
  artKeyDrawOrder: 69,
  artKeyPositionOffset: 70,
  keyPositions: 71,
  keyTableIndices: 72,
  bindingKeyTableOffset: 73,
  bindingKeyTableLength: 74,
  keyTableKeyOffset: 75,
  keyTableKeyLength: 76,
  keys: 77,
  uvs: 78,
  indices: 79,
  masks: 80,
  drawGroupItemOffset: 81,
  drawGroupItemLength: 82,
  drawGroupTotalCount: 83,
  drawGroupMaximumOrder: 84,
  drawGroupMinimumOrder: 85,
  drawItemType: 86,
  drawItemIndex: 87,
  drawItemGroup: 88,
});

function fail(message) {
  throw new TypeError(`Invalid MOC3 template spec: ${message}`);
}

function isPlainObject(value) {
  return value !== null && typeof value === "object" && !Array.isArray(value);
}

function finiteNumber(value, label) {
  if (typeof value !== "number" || !Number.isFinite(value))
    fail(`${label} must be finite`);
  return value;
}

function safeInteger(value, label, min, max) {
  if (!Number.isSafeInteger(value) || value < min || value > max)
    fail(`${label} must be an integer in [${min}, ${max}]`);
  return value;
}

function f32(value, label) {
  const result = Math.fround(finiteNumber(value, label));
  if (!Number.isFinite(result)) fail(`${label} is outside the float32 range`);
  return result;
}

function positiveF32(value, label) {
  const result = f32(value, label);
  if (!(result > 0)) fail(`${label} must be greater than zero`);
  return result;
}

function checkedProduct(values, label, maximum) {
  let product = 1;
  for (const value of values) {
    if (product > Math.floor(maximum / value)) fail(`${label} is too large`);
    product *= value;
  }
  return product;
}

function id(value, label) {
  if (typeof value !== "string" || value.length === 0)
    fail(`${label} must be a non-empty string`);
  for (let index = 0; index < value.length; index++) {
    const codePoint = value.charCodeAt(index);
    if (codePoint < 32 || codePoint === 127)
      fail(`${label} contains a control character`);
  }
  const bytes = Buffer.from(value, "utf8");
  if (bytes.toString("utf8") !== value)
    fail(`${label} is not valid UTF-8 text`);
  if (bytes.length >= ID_BYTES)
    fail(`${label} exceeds ${ID_BYTES - 1} UTF-8 bytes`);
  return value;
}

function vec2(value, label) {
  if (!Array.isArray(value) || value.length !== 2)
    fail(`${label} must be a [x, y] pair`);
  return [f32(value[0], `${label}[0]`), f32(value[1], `${label}[1]`)];
}

function checkedArray(value, label) {
  if (!Array.isArray(value)) fail(`${label} must be an array`);
  return value;
}

function normalizeParameters(value) {
  const parameters = checkedArray(value, "parameters");
  if (parameters.length > MAX_PARAMETERS)
    fail(`parameters may contain at most ${MAX_PARAMETERS} entries`);
  const ids = new Set();
  return parameters.map((parameter, index) => {
    if (!isPlainObject(parameter))
      fail(`parameters[${index}] must be an object`);
    const parameterId = id(parameter.id, `parameters[${index}].id`);
    if (ids.has(parameterId))
      fail(`duplicate parameter id ${JSON.stringify(parameterId)}`);
    ids.add(parameterId);
    const min = f32(parameter.min, `parameters[${index}].min`);
    const max = f32(parameter.max, `parameters[${index}].max`);
    const defaultValue = f32(parameter.default, `parameters[${index}].default`);
    if (!(min < max)) fail(`parameters[${index}] requires min < max`);
    if (defaultValue < min || defaultValue > max)
      fail(`parameters[${index}].default must be within [min, max]`);
    return { id: parameterId, min, max, default: defaultValue };
  });
}

function normalizeMeshes(value, parameterIndex) {
  const meshes = checkedArray(value, "meshes");
  if (meshes.length === 0) fail("meshes must contain at least one ArtMesh");
  if (meshes.length > MAX_MESHES)
    fail(`meshes may contain at most ${MAX_MESHES} entries`);
  const ids = new Set();
  let totalKeyforms = 0;
  let totalPositionScalars = 0;

  const normalized = meshes.map((mesh, meshIndex) => {
    if (!isPlainObject(mesh)) fail(`meshes[${meshIndex}] must be an object`);
    const meshId = id(mesh.id, `meshes[${meshIndex}].id`);
    if (ids.has(meshId)) fail(`duplicate mesh id ${JSON.stringify(meshId)}`);
    ids.add(meshId);

    const positions = checkedArray(
      mesh.positions,
      `meshes[${meshIndex}].positions`,
    ).map((point, pointIndex) =>
      vec2(point, `meshes[${meshIndex}].positions[${pointIndex}]`),
    );
    if (positions.length < 3 || positions.length > MAX_VERTICES_PER_MESH)
      fail(
        `meshes[${meshIndex}].positions must contain 3..${MAX_VERTICES_PER_MESH} vertices`,
      );

    const uvs = checkedArray(mesh.uvs, `meshes[${meshIndex}].uvs`).map(
      (point, pointIndex) =>
        vec2(point, `meshes[${meshIndex}].uvs[${pointIndex}]`),
    );
    if (uvs.length !== positions.length)
      fail(`meshes[${meshIndex}].uvs length must equal positions length`);

    const indices = checkedArray(
      mesh.indices,
      `meshes[${meshIndex}].indices`,
    ).map((vertexIndex, index) => {
      const parsed = safeInteger(
        vertexIndex,
        `meshes[${meshIndex}].indices[${index}]`,
        0,
        positions.length - 1,
      );
      return parsed;
    });
    if (
      indices.length < 3 ||
      indices.length % 3 !== 0 ||
      indices.length > MAX_INDICES_PER_MESH
    )
      fail(
        `meshes[${meshIndex}].indices must contain 3..${MAX_INDICES_PER_MESH} values in complete triangles`,
      );

    const texture = safeInteger(
      mesh.texture,
      `meshes[${meshIndex}].texture`,
      0,
      0x7fffffff,
    );
    const order = safeInteger(
      mesh.order,
      `meshes[${meshIndex}].order`,
      -MAX_DRAW_ORDER_MAGNITUDE,
      MAX_DRAW_ORDER_MAGNITUDE,
    );

    const bindingsInput =
      mesh.bindings === undefined
        ? []
        : checkedArray(mesh.bindings, `meshes[${meshIndex}].bindings`);
    if (bindingsInput.length > MAX_BINDINGS_PER_MESH)
      fail(
        `meshes[${meshIndex}].bindings may contain at most ${MAX_BINDINGS_PER_MESH} axes`,
      );
    const boundParameterIds = new Set();
    const bindings = bindingsInput.map((binding, bindingIndex) => {
      if (!isPlainObject(binding))
        fail(
          `meshes[${meshIndex}].bindings[${bindingIndex}] must be an object`,
        );
      const parameter = id(
        binding.parameter,
        `meshes[${meshIndex}].bindings[${bindingIndex}].parameter`,
      );
      const parameterNumber = parameterIndex.get(parameter);
      if (parameterNumber === undefined)
        fail(
          `meshes[${meshIndex}].bindings[${bindingIndex}] references unknown parameter ${JSON.stringify(
            parameter,
          )}`,
        );
      if (boundParameterIds.has(parameter))
        fail(
          `meshes[${meshIndex}] binds ${JSON.stringify(
            parameter,
          )} more than once`,
        );
      boundParameterIds.add(parameter);
      const keys = checkedArray(
        binding.keys,
        `meshes[${meshIndex}].bindings[${bindingIndex}].keys`,
      ).map((key, keyIndex) =>
        f32(
          key,
          `meshes[${meshIndex}].bindings[${bindingIndex}].keys[${keyIndex}]`,
        ),
      );
      if (keys.length < 1)
        fail(
          `meshes[${meshIndex}].bindings[${bindingIndex}].keys requires at least one value`,
        );
      for (let keyIndex = 1; keyIndex < keys.length; keyIndex++) {
        if (!(keys[keyIndex - 1] < keys[keyIndex]))
          fail(
            `meshes[${meshIndex}].bindings[${bindingIndex}].keys must be strictly ascending`,
          );
      }
      const param = parameterIndex.parameters[parameterNumber];
      if (keys[0] < param.min || keys[keys.length - 1] > param.max)
        fail(
          `meshes[${meshIndex}].bindings[${bindingIndex}].keys must lie inside parameter bounds`,
        );
      return { parameter, parameterNumber, keys };
    });

    const keyformCount = checkedProduct(
      bindings.map((binding) => binding.keys.length),
      `meshes[${meshIndex}].binding keyform product`,
      MAX_KEYFORMS_PER_MESH,
    );
    const keyformsInput = checkedArray(
      mesh.keyforms,
      `meshes[${meshIndex}].keyforms`,
    );
    if (keyformsInput.length !== keyformCount)
      fail(
        `meshes[${meshIndex}].keyforms length must equal binding key product (${keyformCount})`,
      );
    const keyforms = keyformsInput.map((keyform, keyformIndex) => {
      if (!isPlainObject(keyform))
        fail(
          `meshes[${meshIndex}].keyforms[${keyformIndex}] must be an object`,
        );
      const keyPositions = checkedArray(
        keyform.positions,
        `meshes[${meshIndex}].keyforms[${keyformIndex}].positions`,
      ).map((point, pointIndex) =>
        vec2(
          point,
          `meshes[${meshIndex}].keyforms[${keyformIndex}].positions[${pointIndex}]`,
        ),
      );
      if (keyPositions.length !== positions.length)
        fail(
          `meshes[${meshIndex}].keyforms[${keyformIndex}].positions length must equal vertex count`,
        );
      const opacity =
        keyform.opacity === undefined
          ? 1
          : f32(
              keyform.opacity,
              `meshes[${meshIndex}].keyforms[${keyformIndex}].opacity`,
            );
      if (opacity < 0 || opacity > 1)
        fail(
          `meshes[${meshIndex}].keyforms[${keyformIndex}].opacity must be in [0, 1]`,
        );
      const drawOrder =
        keyform.order === undefined
          ? order
          : finiteNumber(
              keyform.order,
              `meshes[${meshIndex}].keyforms[${keyformIndex}].order`,
            );
      if (
        drawOrder < -MAX_DRAW_ORDER_MAGNITUDE ||
        drawOrder > MAX_DRAW_ORDER_MAGNITUDE
      )
        fail(
          `meshes[${meshIndex}].keyforms[${keyformIndex}].order is out of supported bounds`,
        );
      return {
        positions: keyPositions,
        opacity,
        order: f32(
          drawOrder,
          `meshes[${meshIndex}].keyforms[${keyformIndex}].order`,
        ),
      };
    });

    // Purism allocates and verifies 2^axisCount keyform slots even if an axis
    // has one key (which can only have zero interpolation weight). Preserve the
    // contract-sized supplied tensor and add private duplicate padding later.
    const runtimeKeyformCount = Math.max(keyforms.length, 2 ** bindings.length);
    totalKeyforms += runtimeKeyformCount;
    totalPositionScalars += runtimeKeyformCount * positions.length * 2;
    if (totalKeyforms > MAX_TOTAL_KEYFORMS)
      fail(`total keyforms may not exceed ${MAX_TOTAL_KEYFORMS}`);
    if (totalPositionScalars > MAX_TOTAL_POSITION_SCALARS)
      fail(
        `total keyform position scalars may not exceed ${MAX_TOTAL_POSITION_SCALARS}`,
      );

    return {
      id: meshId,
      positions,
      uvs,
      indices,
      texture,
      order,
      bindings,
      keyforms,
      runtimeKeyformCount,
    };
  });

  return normalized;
}

function normalizeSpec(spec) {
  if (!isPlainObject(spec)) fail("spec must be an object");
  if (!isPlainObject(spec.canvas)) fail("canvas must be an object");
  const canvas = {
    width: positiveF32(spec.canvas.width, "canvas.width"),
    height: positiveF32(spec.canvas.height, "canvas.height"),
    pixelsPerUnit: positiveF32(
      spec.canvas.pixelsPerUnit,
      "canvas.pixelsPerUnit",
    ),
  };
  const parameters = normalizeParameters(spec.parameters);
  const parameterIndex = new Map(
    parameters.map((parameter, index) => [parameter.id, index]),
  );
  parameterIndex.parameters = parameters;
  const meshes = normalizeMeshes(spec.meshes, parameterIndex);
  return { canvas, parameters, meshes };
}

function align8(value) {
  return (value + 7) & ~7;
}

function flatPairs(pairs) {
  const flat = [];
  for (const [x, y] of pairs) flat.push(x, y);
  return flat;
}

function int32Section(values) {
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => bytes.writeInt32LE(value, index * 4));
  return bytes;
}

function float32Section(values) {
  const bytes = Buffer.alloc(values.length * 4);
  values.forEach((value, index) => bytes.writeFloatLE(value, index * 4));
  return bytes;
}

function uint16Section(values) {
  const bytes = Buffer.alloc(values.length * 2);
  values.forEach((value, index) => bytes.writeUInt16LE(value, index * 2));
  return bytes;
}

function idsSection(values) {
  const bytes = Buffer.alloc(values.length * ID_BYTES);
  values.forEach((value, index) =>
    Buffer.from(value, "utf8").copy(bytes, index * ID_BYTES),
  );
  return bytes;
}

function pointerSection(count) {
  return Buffer.alloc(count * POINTER_SLOT_BYTES);
}

function f32IntegerOrder(value) {
  // Equivalent for our bounded finite values to Purism's f32_to_i32(sum + .001).
  const float = Math.fround(value);
  return Math.trunc(float + 0.001);
}

function makeTables(parameters, meshes) {
  const perParameter = parameters.map(() => []);
  const meshBindingTableNumbers = [];
  for (const mesh of meshes) {
    const tableNumbers = [];
    for (const binding of mesh.bindings) {
      const table = {
        parameterNumber: binding.parameterNumber,
        keys: binding.keys,
      };
      perParameter[binding.parameterNumber].push(table);
      tableNumbers.push(table);
    }
    meshBindingTableNumbers.push(tableNumbers);
  }

  const tables = [];
  const parameterTableOffset = [];
  const parameterTableLength = [];
  for (const perParam of perParameter) {
    parameterTableOffset.push(tables.length);
    parameterTableLength.push(perParam.length);
    for (const table of perParam) {
      table.number = tables.length;
      tables.push(table);
    }
  }
  return {
    tables,
    parameterTableOffset,
    parameterTableLength,
    meshBindingTableNumbers,
  };
}

function buildSections(model) {
  const { canvas, parameters, meshes } = model;
  const tableLayout = makeTables(parameters, meshes);
  const artCount = meshes.length;

  const artKeyformOffsets = [];
  const artKeyformLengths = [];
  const artKeyOpacity = [];
  const artKeyDrawOrder = [];
  const artKeyPositionOffset = [];
  const keyPositions = [];
  const uvs = [];
  const indices = [];
  const artUvOffsets = [];
  const artIndexOffsets = [];
  const artIndexLengths = [];
  const bindingKeyTableOffsets = [];
  const bindingKeyTableLengths = [];
  const keyTableIndices = [];
  const drawOrders = [];

  for (let meshIndex = 0; meshIndex < meshes.length; meshIndex++) {
    const mesh = meshes[meshIndex];
    artKeyformOffsets.push(artKeyOpacity.length);
    // This is the externally declared tensor length: exactly the product of
    // the explicit binding key counts (or one for a neutral, unbound mesh).
    // See the loop below for private, globally-addressable runtime padding.
    artKeyformLengths.push(mesh.keyforms.length);
    for (
      let keyformIndex = 0;
      keyformIndex < mesh.runtimeKeyformCount;
      keyformIndex++
    ) {
      // Padding is unreachable: a one-key axis has zero interpolation weight.
      // Duplicate keyform zero only to satisfy Purism's 2^axis workspace check.
      const keyform =
        mesh.keyforms[Math.min(keyformIndex, mesh.keyforms.length - 1)];
      artKeyOpacity.push(keyform.opacity);
      artKeyDrawOrder.push(keyform.order);
      artKeyPositionOffset.push(keyPositions.length);
      keyPositions.push(...flatPairs(keyform.positions));
      drawOrders.push(f32IntegerOrder(keyform.order));
    }

    artUvOffsets.push(uvs.length);
    uvs.push(...flatPairs(mesh.uvs));
    artIndexOffsets.push(indices.length);
    artIndexLengths.push(mesh.indices.length);
    indices.push(...mesh.indices);

    bindingKeyTableOffsets.push(keyTableIndices.length);
    bindingKeyTableLengths.push(mesh.bindings.length);
    for (const table of tableLayout.meshBindingTableNumbers[meshIndex])
      keyTableIndices.push(table.number);
  }

  const tableKeyOffsets = [];
  const tableKeyLengths = [];
  const keys = [];
  for (const table of tableLayout.tables) {
    tableKeyOffsets.push(keys.length);
    tableKeyLengths.push(table.keys.length);
    keys.push(...table.keys);
  }

  const minDrawOrder = Math.min(...drawOrders);
  const maxDrawOrder = Math.max(...drawOrders);
  if (maxDrawOrder - minDrawOrder > MAX_DRAW_ORDER_SPAN)
    fail(`draw-order span may not exceed ${MAX_DRAW_ORDER_SPAN}`);

  const counts = new Array(COUNT_INFO_INTS).fill(0);
  counts[4] = artCount; // art_meshes
  counts[5] = parameters.length; // parameters
  counts[9] = artKeyOpacity.length; // art_mesh_keyforms
  counts[10] = keyPositions.length; // keyform_pos: scalar float count
  counts[11] = keyTableIndices.length;
  counts[12] = artCount; // one binding record per ArtMesh
  counts[13] = tableLayout.tables.length;
  counts[14] = keys.length;
  counts[15] = uvs.length;
  counts[16] = indices.length;
  counts[18] = 1; // one actual direct ArtMesh draw group
  counts[19] = artCount;

  const section = new Array(SECTION_COUNT_V30).fill(null);
  section[Section.countInfo] = int32Section(counts);
  section[Section.canvas] = (() => {
    const bytes = Buffer.alloc(CANVAS_BYTES);
    bytes.writeFloatLE(canvas.pixelsPerUnit, 0);
    bytes.writeFloatLE(canvas.width / 2, 4);
    bytes.writeFloatLE(canvas.height / 2, 8);
    bytes.writeFloatLE(canvas.width, 12);
    bytes.writeFloatLE(canvas.height, 16);
    bytes[20] = 1; // PSM__CANVAS_FLAG_Y_REVERSED: preserve supplied model-space Y values.
    return bytes;
  })();

  section[Section.artIdRuntime] = pointerSection(artCount);
  section[Section.artUvRuntime] = pointerSection(artCount);
  section[Section.artIndexRuntime] = pointerSection(artCount);
  section[Section.artMaskRuntime] = pointerSection(artCount);
  section[Section.artId] = idsSection(meshes.map((mesh) => mesh.id));
  section[Section.artBinding] = int32Section(meshes.map((_, index) => index));
  section[Section.artKeyformOffset] = int32Section(artKeyformOffsets);
  section[Section.artKeyformLength] = int32Section(artKeyformLengths);
  section[Section.artVisible] = int32Section(meshes.map(() => 1));
  section[Section.artEnable] = int32Section(meshes.map(() => 1));
  section[Section.artParentPart] = int32Section(meshes.map(() => -1));
  section[Section.artParentDeformer] = int32Section(meshes.map(() => -1));
  section[Section.artTexture] = int32Section(
    meshes.map((mesh) => mesh.texture),
  );
  section[Section.artFlags] = Buffer.alloc(artCount);
  section[Section.artVertexCount] = int32Section(
    meshes.map((mesh) => mesh.positions.length),
  );
  section[Section.artUvOffset] = int32Section(artUvOffsets);
  section[Section.artIndexOffset] = int32Section(artIndexOffsets);
  section[Section.artIndexLength] = int32Section(artIndexLengths);
  section[Section.artMaskOffset] = int32Section(meshes.map(() => 0));
  section[Section.artMaskLength] = int32Section(meshes.map(() => 0));

  section[Section.parameterIdRuntime] = pointerSection(parameters.length);
  section[Section.parameterId] = idsSection(
    parameters.map((parameter) => parameter.id),
  );
  section[Section.parameterMaximum] = float32Section(
    parameters.map((parameter) => parameter.max),
  );
  section[Section.parameterMinimum] = float32Section(
    parameters.map((parameter) => parameter.min),
  );
  section[Section.parameterDefault] = float32Section(
    parameters.map((parameter) => parameter.default),
  );
  section[Section.parameterRepeat] = int32Section(parameters.map(() => 0));
  section[Section.parameterDecimalPlaces] = int32Section(
    parameters.map(() => 6),
  );
  section[Section.parameterKeyTableOffset] = int32Section(
    tableLayout.parameterTableOffset,
  );
  section[Section.parameterKeyTableLength] = int32Section(
    tableLayout.parameterTableLength,
  );

  section[Section.artKeyOpacity] = float32Section(artKeyOpacity);
  section[Section.artKeyDrawOrder] = float32Section(artKeyDrawOrder);
  section[Section.artKeyPositionOffset] = int32Section(artKeyPositionOffset);
  section[Section.keyPositions] = float32Section(keyPositions);
  section[Section.keyTableIndices] = int32Section(keyTableIndices);
  section[Section.bindingKeyTableOffset] = int32Section(bindingKeyTableOffsets);
  section[Section.bindingKeyTableLength] = int32Section(bindingKeyTableLengths);
  section[Section.keyTableKeyOffset] = int32Section(tableKeyOffsets);
  section[Section.keyTableKeyLength] = int32Section(tableKeyLengths);
  section[Section.keys] = float32Section(keys);
  section[Section.uvs] = float32Section(uvs);
  section[Section.indices] = uint16Section(indices);
  section[Section.masks] = Buffer.alloc(0);
  section[Section.drawGroupItemOffset] = int32Section([0]);
  section[Section.drawGroupItemLength] = int32Section([artCount]);
  section[Section.drawGroupTotalCount] = int32Section([artCount]);
  section[Section.drawGroupMaximumOrder] = int32Section([maxDrawOrder]);
  section[Section.drawGroupMinimumOrder] = int32Section([minDrawOrder]);
  section[Section.drawItemType] = int32Section(meshes.map(() => 0));
  section[Section.drawItemIndex] = int32Section(
    meshes.map((_, index) => index),
  );
  section[Section.drawItemGroup] = int32Section(meshes.map(() => -1));

  return section;
}

function serialize(sections) {
  let cursor = RUNTIME_WORKSPACE_BYTES;
  const offsets = new Array(OFFSET_COUNT).fill(0);
  const placements = [];
  for (let sectionIndex = 0; sectionIndex < SECTION_COUNT_V30; sectionIndex++) {
    const bytes = sections[sectionIndex] ?? Buffer.alloc(0);
    cursor = align8(cursor);
    offsets[sectionIndex] = cursor;
    placements.push({ offset: cursor, bytes });
    cursor += bytes.length;
  }
  cursor = align8(cursor);
  if (cursor > MAX_TOTAL_BYTES)
    fail(`encoded MOC3 exceeds ${MAX_TOTAL_BYTES} bytes`);

  const output = Buffer.alloc(cursor);
  output.write("MOC3", 0, "ascii");
  output[4] = MOC_VERSION_30;
  output[5] = 0; // MOC3 little endian flag (Purism treats 0 as little endian).
  for (let index = 0; index < offsets.length; index++)
    output.writeUInt32LE(offsets[index], HEADER_BYTES + index * 4);
  for (const { offset, bytes } of placements) bytes.copy(output, offset);
  return output;
}

/**
 * Encode a fresh bounded MOC3 v3.0 direct-ArtMesh model for PurismCore v1.1.0.
 *
 * Keyforms for each mesh are a mixed-radix tensor in explicit `bindings` order:
 * binding zero is least significant, so index = k0 + c0*(k1 + c1*(...)).
 * A mesh without bindings has exactly one neutral keyform.
 *
 * @param {object} spec Template specification described by the Purism writer contract.
 * @returns {Buffer} Newly allocated MOC3 bytes.
 */
export function encodeMoc3(spec) {
  const model = normalizeSpec(spec);
  return serialize(buildSections(model));
}
