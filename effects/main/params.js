/*
MIT License

Copyright (c) 2024 Vincent Hiribarren

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
*/

// Global parameters managed by Tweakpane
/////////////////////////////////////////

import { isHDPI } from "../../js/utils.js";

export const PARAMS_DEFAULT = Object.freeze({
    particleCount: 1000, // TODO Seems particleCount - 1 is drawn, to check why, probably because gl_InstanceID starts with 1?
    withHDPI: true,
    canvasResolution: 100, // In percentage
    canvasScale: true,
    canvasSmooth: false,
    fpsDisplay: false,
    paletteLuminosity: { x: 1.0, y: 1.0, z: 0.1 },
    paletteContrast: { x: 1.0, y: 1.0, z: 1.0 },
    paletteFreq: { x: 2.0, y: 0.5, z: 0.5 },
    palettePhase: { x: 0.5, y: 0.5, z: 0.5 },
    backgroundColor: { r: 0, g: 0, b: 0, a: 1.0 },
    speedStep: 0.0001,
    pointSize: isHDPI() ? 2.0 : 1.0,
    animRun: true,
    fieldFrequence: 1.0,
    fieldOctaves: 1,
    fieldGain: 0.5,
    fieldLacunarity: 2.0,
    fieldShiftX: 0.0,
    fieldShiftY: 0.0,
    trailEnabled: true,
    trailFadeSpeed: 0.01,
});