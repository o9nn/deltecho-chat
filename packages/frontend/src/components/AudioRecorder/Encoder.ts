/**
 * This file is based on https://github.com/closeio/mic-recorder-to-mp3/blob/master/src/encoder.js
 *
 * @license MIT Copyright (c) 2017 Elastic Inc. (Close.io) see ./LICENSE
 */

import { Mp3Encoder } from "@breezystack/lamejs";

interface EncoderConfig {
  sampleRate?: number;
  bitRate?: number;
}

class Encoder {
  private config: Required<EncoderConfig>;
  private mp3Encoder: Mp3Encoder;
  private maxSamples: number;
  private samplesMono: Int16Array | null;
  private dataBuffer: Uint8Array[] = [];

  constructor(config: EncoderConfig = {}) {
    this.config = {
      sampleRate: 44100,
      bitRate: 128,
      ...config,
    };

    this.mp3Encoder = new Mp3Encoder(
      1, // Mono channel
      this.config.sampleRate,
      this.config.bitRate,
    );

    // Audio is processed by frames of 1152 samples per audio channel
    // http://lame.sourceforge.net/tech-FAQ.txt
    this.maxSamples = 1152;

    this.samplesMono = null;
    this.clearBuffer();
  }

  /**
   * Clear active buffer
   */
  clearBuffer(): void {
    this.dataBuffer = [];
  }

  /**
   * Append new audio buffer to current active buffer
   * @param {ArrayBuffer | Int8Array | Uint8Array} buffer
   */
  appendToBuffer(buffer: ArrayBuffer | Int8Array | Uint8Array): void {
    // Create a copy with its own ArrayBuffer to avoid SharedArrayBuffer issues
    const copy = new Uint8Array(buffer.byteLength);
    copy.set(
      new Uint8Array(
        buffer instanceof ArrayBuffer ? buffer : buffer.buffer,
        buffer instanceof ArrayBuffer ? 0 : buffer.byteOffset,
        buffer.byteLength,
      ),
    );
    this.dataBuffer.push(copy);
  }

  /**
   * Float current data to 16 bits PCM
   * @param {Float32Array} input
   * @param {Int16Array} output
   */
  floatTo16BitPCM(input: Float32Array, output: Int16Array): void {
    for (let i = 0; i < input.length; i++) {
      const s = Math.max(-1, Math.min(1, input[i]));
      output[i] = s < 0 ? s * 0x8000 : s * 0x7fff;
    }
  }

  /**
   * Convert buffer to proper format
   * @param {Float32Array | ArrayBuffer} arrayBuffer
   * @returns {Int16Array}
   */
  convertBuffer(arrayBuffer: Float32Array | ArrayBuffer): Int16Array {
    const data = new Float32Array(arrayBuffer);
    const out = new Int16Array(
      arrayBuffer instanceof ArrayBuffer
        ? arrayBuffer.byteLength / 4
        : arrayBuffer.length,
    );
    this.floatTo16BitPCM(data, out);

    return out;
  }

  /**
   * Encode and append current buffer to dataBuffer
   * @param {Float32Array | ArrayBuffer} arrayBuffer
   */
  encode(arrayBuffer: Float32Array | ArrayBuffer): void {
    this.samplesMono = this.convertBuffer(arrayBuffer);
    let remaining = this.samplesMono.length;

    for (let i = 0; remaining > 0; i += this.maxSamples) {
      const left = this.samplesMono.subarray(i, i + this.maxSamples);
      const mp3buffer = this.mp3Encoder.encodeBuffer(left);
      this.appendToBuffer(mp3buffer);
      remaining -= this.maxSamples;
    }
  }

  /**
   * Return full dataBuffer
   * @returns {Uint8Array[]}
   */
  finish(): Uint8Array[] {
    this.appendToBuffer(this.mp3Encoder.flush());
    return this.dataBuffer;
  }
}

export default Encoder;
