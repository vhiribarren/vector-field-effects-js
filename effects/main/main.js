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
import Stats from "three/addons/libs/stats.module.js";
import { Pane } from "tweakpane";
import * as TweakpaneEssentialsPlugin from "tweakpane/plugin-essentials";
import { textFileLoader } from "../../js/utils.js";

const FShaderDots = await textFileLoader("./frg_dots.glsl");
const VShaderDots = await textFileLoader("./vtx_dots.glsl");
const FShaderInitPos = await textFileLoader("./frg_init_positions.glsl");
const FShaderUpdatePos = await textFileLoader("./frg_update_positions.glsl");
const FShaderCanvasPreprocess = await textFileLoader("./frg_canvas_preprocessing.glsl");


const MAX_TEXTURE_SIZE = 1024;

function textureDimensionsFromCount(count) {
    return [MAX_TEXTURE_SIZE, Math.ceil(count / MAX_TEXTURE_SIZE)];
}

// Global parameters managed by Tweakpane
/////////////////////////////////////////

const params = {
    entityCount: 1000000, // Warning, entityCount - 1 is drawn, to check why, probably because gl_InstanceID starts with 1
    canvasResolution: 100, // In percentage
    canvasScale: true,
    canvasSmooth: false,
    fpsDisplay: false,
    paletteLuminosity: { x: 1.0, y: 1.0, z: 0.1 },
    paletteContrast: { x: 1.0, y: 1.0, z: 1.0 },
    paletteFreq: { x: 2.0, y: 0.5, z: 0.5 },
    palettePhase: { x: 0.5, y: 0.5, z: 0.5 },
    backgroundColor:  {r: 0, g: 0, b: 0, a: 1.0},
    speedStep: 0.0001,
    pointSize: 1.0,
    animRun: true,
};


// Prepre ThreeJS objects
/////////////////////////

const camera = new THREE.OrthographicCamera(-0.5, 0.5, 0.5, -0.5, 0.1, 10);
camera.position.z = 1;
const renderer = new THREE.WebGLRenderer({});
document.body.appendChild(renderer.domElement);
const canvasGeometry = new THREE.PlaneGeometry(1, 1);

let textureDim = textureDimensionsFromCount(params.entityCount);
let inputPositionsRenderTarget = new THREE.WebGLRenderTarget(...textureDim, {type: THREE.FloatType});
let outputPositionsRenderTarget = new THREE.WebGLRenderTarget(...textureDim, {type: THREE.FloatType});
let inputDisplayRenderTarget = new THREE.WebGLRenderTarget(null, null);
let outputDisplayRenderTarget = new THREE.WebGLRenderTarget(null, null);

const initMaterial = new THREE.ShaderMaterial({
    fragmentShader: FShaderInitPos,
    glslVersion: THREE.GLSL3,
});
const initScene = new THREE.Scene();
initScene.add(new THREE.Mesh(canvasGeometry, initMaterial));

const updateScene = new THREE.Scene();
const updateMaterial = new THREE.ShaderMaterial({
    fragmentShader: FShaderUpdatePos,
    glslVersion: THREE.GLSL3,
    uniforms: {
        uPositions: { value: outputPositionsRenderTarget.texture},
        uTimeAccMs: { value: 0},
        uTimeDeltaMs: { value: 0},
        uSpeedStep: { value: 0},
    }
});
updateScene.add(new THREE.Mesh(canvasGeometry, updateMaterial));

const drawGeometry = new THREE.InstancedBufferGeometry();
drawGeometry.instanceCount = params.entityCount;
drawGeometry.setAttribute( 'position',  new THREE.Float32BufferAttribute([0.0, 0.0, 0.0], 3 ));
const drawMaterial = new THREE.RawShaderMaterial({
    vertexShader: VShaderDots,
    fragmentShader: FShaderDots,
    glslVersion: THREE.GLSL3,
    uniforms: {
        uPositions: { value: outputPositionsRenderTarget.texture},
        uPointSize: { value: 0},
        uTotalPoints: { value: 0},
        uPaletteLuminosity: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uPaletteContrast: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uPaletteFreq: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
        uPalettePhase: { value: new THREE.Vector3(0.0, 0.0, 0.0) },
    }
});
const drawScene = new THREE.Scene();
drawScene.add(new THREE.Points(drawGeometry, drawMaterial ));

const canvasPreprocessingScene = new THREE.Scene();
const canvasPreprocessingMaterial = new THREE.ShaderMaterial({
    depthTest: false,
    fragmentShader: FShaderCanvasPreprocess,
    glslVersion: THREE.GLSL3,
    uniforms: {
        uCanvas: { value: inputDisplayRenderTarget.texture},
    }
});
canvasPreprocessingScene.add(new THREE.Mesh(canvasGeometry, canvasPreprocessingMaterial));

const finalScene = new THREE.Scene();
const finalMaterial = new THREE.MeshBasicMaterial({map: inputDisplayRenderTarget.texture, depthTest: false});
finalScene.add(new THREE.Mesh(canvasGeometry, finalMaterial));



// To display FPS statistics
const stats = new Stats()
document.body.appendChild(stats.dom);

// Configure elements depending on window and Tweakpane
const applyDisplayParams = () => {
    const paramPoint3ToVector3 = (paramPoint3Val) => new THREE.Vector3(
        paramPoint3Val.x, paramPoint3Val.y, paramPoint3Val.z
    );
    const newWidth = window.innerWidth * params.canvasResolution / 100;
    const newHeight = window.innerHeight * params.canvasResolution / 100;
    inputDisplayRenderTarget = new THREE.WebGLRenderTarget(newWidth, newHeight);
    outputDisplayRenderTarget = new THREE.WebGLRenderTarget(newWidth, newHeight);
    finalMaterial.map = inputDisplayRenderTarget.texture;
    renderer.setSize(newWidth, newHeight);
    if (params.canvasScale) {
        renderer.domElement.style.cssText = "width: 100%; margin:0; padding: 0;";
        if (!params.canvasSmooth) {
            renderer.domElement.style.cssText += "image-rendering: pixelated"
        }
    }
    drawMaterial.uniforms.uTotalPoints.value = params.entityCount;
    drawMaterial.uniforms.uPaletteLuminosity.value = paramPoint3ToVector3(params.paletteLuminosity);
    drawMaterial.uniforms.uPaletteContrast.value = paramPoint3ToVector3(params.paletteContrast);
    drawMaterial.uniforms.uPaletteFreq.value = paramPoint3ToVector3(params.paletteFreq);
    drawMaterial.uniforms.uPalettePhase.value = paramPoint3ToVector3(params.palettePhase);
    updateMaterial.uniforms.uSpeedStep.value = params.speedStep;
    drawMaterial.uniforms.uPointSize.value = params.pointSize;
    stats.dom.hidden = !params.fpsDisplay;
    renderer.setClearColor(new THREE.Color(params.backgroundColor.r, params.backgroundColor.g, params.backgroundColor.b), params.backgroundColor.a);
}



// Rendering
////////////

applyDisplayParams();
renderer.setRenderTarget(outputPositionsRenderTarget);
renderer.render(initScene, camera);
renderer.autoClear = false;

let timeAcc = 0;
let timeDatePrev =  Date.now();
renderer.setAnimationLoop(() => {
    const timeDateCurrent = Date.now();
    const timeDelta =  params.animRun ? timeDateCurrent - timeDatePrev : 0.0;
    timeAcc += timeDelta;
    timeDatePrev = timeDateCurrent;

    [inputPositionsRenderTarget, outputPositionsRenderTarget] = [outputPositionsRenderTarget, inputPositionsRenderTarget];
    updateMaterial.uniforms.uPositions.value = inputPositionsRenderTarget.textures[0];
    updateMaterial.uniforms.uTimeAccMs.value = timeAcc;
    updateMaterial.uniforms.uTimeDeltaMs.value = timeDelta;
    renderer.setRenderTarget(outputPositionsRenderTarget);
    renderer.render(updateScene, camera);
    
    [inputDisplayRenderTarget, outputDisplayRenderTarget] = [outputDisplayRenderTarget, inputDisplayRenderTarget];
    canvasPreprocessingMaterial.uniforms.uCanvas.value = inputDisplayRenderTarget.texture;
    renderer.setRenderTarget(outputDisplayRenderTarget);
    renderer.render(canvasPreprocessingScene, camera);

    drawMaterial.uniforms.uPositions.value = outputPositionsRenderTarget.texture;
    renderer.setRenderTarget(outputDisplayRenderTarget);
    renderer.render(drawScene, camera);

    finalMaterial.map = outputDisplayRenderTarget.texture;
    renderer.setRenderTarget(null);
    renderer.render(finalScene, camera);

    if (params.fpsDisplay) {
        stats.update();
    }
});


window.addEventListener("resize", (_event) => {
    //Disabled for now
    //applyDisplayParams();
});


// Configure Tweakpane
//////////////////////

const pane = new Pane({
    title: "Parameters",
    expanded: true,
});
pane.registerPlugin(TweakpaneEssentialsPlugin);
pane.on("change", (_ev) => {
    applyDisplayParams();
});

const displayFolder = pane.addFolder({
    title: "Display",
    expanded: true,
});
displayFolder.addBinding(params, "canvasResolution", {
    label: "Resolution",
    step: 1,
    min: 1,
    max: 100,
    format: (v) => v + " %",
});
displayFolder.addBinding(params, "canvasScale", { label: "Full screen" });
displayFolder.addBinding(params, "canvasSmooth", { label: "Canvas Smooth" });
displayFolder.addBinding(params, "fpsDisplay", { label: "Display FPS" });

const colorPaletteFolder = pane.addFolder({
    title: "Color Palette",
    expanded: true,
})
colorPaletteFolder.addBinding(params, "paletteLuminosity", {
    label: "Luminosity",
    x: { min: 0, max: 1 },
    y: { min: 0, max: 1 },
    z: { min: 0, max: 1 },
});
colorPaletteFolder.addBinding(params, "paletteContrast", {
    label: "Contrast",
    x: { min: 0, max: 1 },
    y: { min: 0, max: 1 },
    z: { min: 0, max: 1 },
});
colorPaletteFolder.addBinding(params, "paletteFreq", {
    label: "Frequence",
    x: { min: 0, max: 100 },
    y: { min: 0, max: 100 },
    z: { min: 0, max: 100 },
});
colorPaletteFolder.addBinding(params, "palettePhase", {
    label: "Phase",
    x: { min: 0, max: 1 },
    y: { min: 0, max: 1 },
    z: { min: 0, max: 1 },
});
colorPaletteFolder.addBinding(params, "backgroundColor", {
    label: "Background Color",
    picker: 'inline',
    color: {type: "float", alpha: true},
});

const simulationFolder = pane.addFolder({
    title: "Simulation",
    expanded: true,
});
simulationFolder.addBinding(params, "speedStep");
simulationFolder.addBinding(params, "pointSize", {
    min: 0,
    label: "Point Size",
});

const animationFolder = pane.addFolder({
    title: "Animation",
    expanded: true,
});
animationFolder.addBinding(params, "animRun", { label: "Run Animation" });
