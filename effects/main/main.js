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

import * as THREE from "three";
import Stats from "three/addons/stats";
import { setupGUI } from "./gui.js";
import { isHDPI, textFileLoader } from "../../js/utils.js";


const FShaderParticles = await textFileLoader("./shaders/frg_draw_particles.glsl");
const VShaderParticles = await textFileLoader("./shaders/vtx_draw_particles.glsl");
const FShaderInitPos = await textFileLoader("./shaders/frg_init_positions.glsl");
const FShaderUpdatePos = await textFileLoader("./shaders/frg_update_positions.glsl");
const FShaderCanvasPreprocess = await textFileLoader("./shaders/frg_canvas_preprocessing.glsl");

const MAX_TEXTURE_SIZE = 1024;
const PIXEL_RATIO = Math.max(1, Math.floor(window.devicePixelRatio ?? 1));

function textureDimensionsFromCount(count) {
    return [MAX_TEXTURE_SIZE, Math.ceil(count / MAX_TEXTURE_SIZE)];
}


// Global parameters managed by Tweakpane
/////////////////////////////////////////

const params = {
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
    pointSize: isHDPI()? 2.0 : 1.0,
    animRun: true,
    fieldFrequence: 1.0,
    fieldOctaves: 1,
    fieldGain: 0.5,
    fieldLacunarity: 2.0,
    fieldShiftX: 0.0,
    fieldShiftY: 0.0,
    trailEnabled: true,
    trailFadeSpeed: 0.01,
};


// Prepre ThreeJS objects
/////////////////////////

const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
camera.position.z = 1;
const renderer = new THREE.WebGLRenderer({});
document.body.appendChild(renderer.domElement);
const canvasGeometry = new THREE.PlaneGeometry(1, 1);

const textureDim = textureDimensionsFromCount(params.particleCount);
let inputPositionsRenderTarget = new THREE.WebGLRenderTarget(...textureDim, { type: THREE.FloatType });
let outputPositionsRenderTarget = new THREE.WebGLRenderTarget(...textureDim, { type: THREE.FloatType });
let inputDisplayRenderTarget = new THREE.WebGLRenderTarget(null, null);
let outputDisplayRenderTarget = new THREE.WebGLRenderTarget(null, null);

// Init scene, executed once to init particles' state
const initMaterial = new THREE.ShaderMaterial({
    fragmentShader: FShaderInitPos,
    glslVersion: THREE.GLSL3,
});
const initScene = new THREE.Scene();
initScene.add(new THREE.Mesh(canvasGeometry, initMaterial));

// Update scene, executed to update particles' state
const updateStateScene = new THREE.Scene();
const updateStateMaterial = new THREE.ShaderMaterial({
    fragmentShader: FShaderUpdatePos,
    glslVersion: THREE.GLSL3,
    uniforms: {
        uPositions: { value: outputPositionsRenderTarget.texture },
        uTimeAccMs: { value: 0 },
        uTimeDeltaMs: { value: 0 },
        uSpeedStep: { value: 0 },
        uFieldFrequence: { value: 0 },
        uFieldOctaves: { value: 0 },
        uFieldGain: { value: 0 },
        uFieldLacunarity: { value: 0 },
        uFieldShiftX: { value: 0 },
        uFieldShiftY: { value: 0 },
    }
});
updateStateScene.add(new THREE.Mesh(canvasGeometry, updateStateMaterial));

// Draw scene, actually draw the particles using their state
const drawParticleGeometry = new THREE.InstancedBufferGeometry();
drawParticleGeometry.setAttribute('position', new THREE.Float32BufferAttribute([0.0, 0.0, 0.0], 3));
const drawParticleMaterial = new THREE.RawShaderMaterial({
    vertexShader: VShaderParticles,
    fragmentShader: FShaderParticles,
    glslVersion: THREE.GLSL3,
    uniforms: {
        uPositions: { value: outputPositionsRenderTarget.texture },
        uPointSize: { value: 0 },
        uTotalPoints: { value: 0 },
        uPaletteLuminosity: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uPaletteContrast: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uPaletteFreq: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uPalettePhase: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    }
});
const drawParticleScene = new THREE.Scene();
drawParticleScene.add(new THREE.Points(drawParticleGeometry, drawParticleMaterial));

// Preprocessing scene, before particles are drawn
const canvasPreprocessingScene = new THREE.Scene();
const canvasPreprocessingMaterial = new THREE.ShaderMaterial({
    depthTest: false,
    fragmentShader: FShaderCanvasPreprocess,
    glslVersion: THREE.GLSL3,
    uniforms: {
        uCanvas: { value: inputDisplayRenderTarget.texture },
        uTrailEnabled: { value: false },
        uTrailFadeSpeed: { value: 0 },
    }
});
canvasPreprocessingScene.add(new THREE.Mesh(canvasGeometry, canvasPreprocessingMaterial));

// Display scene, render result on the screen
const displayScene = new THREE.Scene();
const displayMaterial = new THREE.MeshBasicMaterial({ map: inputDisplayRenderTarget.texture, depthTest: false, transparent: true });
displayScene.add(new THREE.Mesh(canvasGeometry, displayMaterial));

// To display FPS statistics
const stats = new Stats()
document.body.appendChild(stats.dom);

// Configure elements depending on window and Tweakpane
const applyDisplayResolution = () => {
    const pixelRatio = params.withHDPI ? PIXEL_RATIO : 1;
    const newWidth = pixelRatio * window.innerWidth * params.canvasResolution / 100;
    const newHeight = pixelRatio * window.innerHeight * params.canvasResolution / 100;
    inputDisplayRenderTarget = new THREE.WebGLRenderTarget(newWidth, newHeight);
    outputDisplayRenderTarget = new THREE.WebGLRenderTarget(newWidth, newHeight);
    displayMaterial.map = inputDisplayRenderTarget.texture;
    renderer.domElement.width = newWidth; // canvas.width, higher resolution for high pixel density
    renderer.domElement.height = newHeight; // canvas.height, higher resolution for high pixel density
    renderer.setSize(newWidth, newHeight);
}
const applyParticleCount = () => {
    const textureDim = textureDimensionsFromCount(params.particleCount);
    inputPositionsRenderTarget = new THREE.WebGLRenderTarget(...textureDim, { type: THREE.FloatType });
    outputPositionsRenderTarget = new THREE.WebGLRenderTarget(...textureDim, { type: THREE.FloatType });
    drawParticleGeometry.instanceCount = params.particleCount;
    drawParticleMaterial.uniforms.uTotalPoints.value = params.particleCount;
    renderer.setRenderTarget(outputPositionsRenderTarget);
    renderer.render(initScene, camera);
}
const applyDisplayParams = () => {
    const paramPoint3ToVector3 = (paramPoint3Val) => new THREE.Vector3(
        paramPoint3Val.x, paramPoint3Val.y, paramPoint3Val.z
    );
    if (params.canvasScale) {
        renderer.domElement.style.cssText = "width: 100%; margin:0; padding: 0;";
        if (!params.canvasSmooth) {
            renderer.domElement.style.cssText += "image-rendering: pixelated"
        }
    }
    updateStateMaterial.uniforms.uSpeedStep.value = params.speedStep;
    updateStateMaterial.uniforms.uFieldFrequence.value = params.fieldFrequence;
    updateStateMaterial.uniforms.uFieldOctaves.value = params.fieldOctaves;
    updateStateMaterial.uniforms.uFieldGain.value = params.fieldGain;
    updateStateMaterial.uniforms.uFieldLacunarity.value = params.fieldLacunarity;
    updateStateMaterial.uniforms.uFieldShiftX.value = params.fieldShiftX;
    updateStateMaterial.uniforms.uFieldShiftY.value = params.fieldShiftY;
    canvasPreprocessingMaterial.uniforms.uTrailEnabled.value = params.trailEnabled;
    canvasPreprocessingMaterial.uniforms.uTrailFadeSpeed.value = params.trailFadeSpeed;
    drawParticleMaterial.uniforms.uPaletteLuminosity.value = paramPoint3ToVector3(params.paletteLuminosity);
    drawParticleMaterial.uniforms.uPaletteContrast.value = paramPoint3ToVector3(params.paletteContrast);
    drawParticleMaterial.uniforms.uPaletteFreq.value = paramPoint3ToVector3(params.paletteFreq);
    drawParticleMaterial.uniforms.uPalettePhase.value = paramPoint3ToVector3(params.palettePhase);
    drawParticleMaterial.uniforms.uPointSize.value = params.pointSize;
    stats.dom.hidden = !params.fpsDisplay;
    renderer.setClearColor(new THREE.Color(params.backgroundColor.r, params.backgroundColor.g, params.backgroundColor.b), params.backgroundColor.a);
}


// Rendering
////////////

// Init --> Update --> Preprocess --> Draw --> Display --+
//            ^                                          |
//            |                                          |
//            +------------------------------------------+

setupGUI(params, applyDisplayParams, applyDisplayResolution, applyParticleCount);
applyDisplayResolution();
applyDisplayParams();
applyParticleCount();

renderer.autoClear = false;

let timeAcc = 0;
let timeDatePrev = Date.now();
renderer.setAnimationLoop(() => {

    const timeDateCurrent = Date.now();
    const timeDelta = params.animRun ? timeDateCurrent - timeDatePrev : 0.0;
    timeAcc += timeDelta;
    timeDatePrev = timeDateCurrent;
    if (!params.animRun) {
        return;
    }

    [inputPositionsRenderTarget, outputPositionsRenderTarget] = [outputPositionsRenderTarget, inputPositionsRenderTarget];
    updateStateMaterial.uniforms.uPositions.value = inputPositionsRenderTarget.textures[0];
    updateStateMaterial.uniforms.uTimeAccMs.value = timeAcc;
    updateStateMaterial.uniforms.uTimeDeltaMs.value = timeDelta;
    renderer.setRenderTarget(outputPositionsRenderTarget);
    renderer.render(updateStateScene, camera);

    [inputDisplayRenderTarget, outputDisplayRenderTarget] = [outputDisplayRenderTarget, inputDisplayRenderTarget];
    canvasPreprocessingMaterial.uniforms.uCanvas.value = inputDisplayRenderTarget.texture;
    renderer.setRenderTarget(outputDisplayRenderTarget);
    renderer.render(canvasPreprocessingScene, camera);

    drawParticleMaterial.uniforms.uPositions.value = outputPositionsRenderTarget.texture;
    renderer.setRenderTarget(outputDisplayRenderTarget);
    renderer.render(drawParticleScene, camera);

    displayMaterial.map = outputDisplayRenderTarget.texture;
    renderer.setRenderTarget(null);
    renderer.clearColor();
    renderer.render(displayScene, camera);

    if (params.fpsDisplay) {
        stats.update();
    }
});


window.addEventListener("resize", (_event) => {
    //Disabled for now
    //applyDisplayParams();
});