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

import { Pane } from "tweakpane";
import * as TweakpaneEssentialsPlugin from "tweakpane/plugin-essentials";
import { isHDPI } from "../../js/utils.js";
import { PARAMS_DEFAULT } from "./params.js";


let isGuiSetup = false;

export function setupGUI(params, paramUpdatedCallback, resolutionUpdatedCallback, particleCountUpdatedCallback) {

    if (isGuiSetup) {
        console.warn("GUI is arealdy setup, skipping");
        return;
    }
    isGuiSetup = true;

    const pane = new Pane({
        title: "Parameters",
        expanded: false,
    });
    pane.registerPlugin(TweakpaneEssentialsPlugin);
    pane.on("change", (_ev) =>  paramUpdatedCallback());
    
    pane.addBinding(params, "fpsDisplay", { label: "Display FPS" });

    const particleFolder = pane.addFolder({
        title: "Particles",
        expanded: true,
    });
    particleFolder
        .addBinding(params, "particleCount", {
            label: "Particle count",
            min: 0,
            step: 1,
        })
        .on("change", _ev => particleCountUpdatedCallback());
    particleFolder.addBinding(params, "trailEnabled", { label: "With trail" });
    particleFolder.addBinding(params, "trailFadeSpeed", {
        min: 0,
        label: "Fade speed",
    });
    particleFolder.addBinding(params, "speedStep");
    particleFolder.addBinding(params, "pointSize", {
        min: 0,
        label: "Point Size",
    });

    const screenResolutionFolder = pane.addFolder({
        title: "Display",
        expanded: false,
    });
    screenResolutionFolder.on("change", (_ev) => resolutionUpdatedCallback());
    screenResolutionFolder
        .addBinding(params, "canvasResolution", {
            label: "Resolution",
            step: 1,
            min: 1,
            max: 100,
            format: (v) => v + " %",
        })
    screenResolutionFolder.addBinding(params, "canvasScale", { label: "Full screen" });
    screenResolutionFolder.addBinding(params, "canvasSmooth", { label: "Canvas Smooth" });
    screenResolutionFolder.addBinding(params, "withHDPI", {
        label: "Enable HDPI",
        disabled: !isHDPI(),
    });
    
    const fieldFolder = pane.addFolder({
        title: "Vector field",
        expanded: false,
    });
    fieldFolder.addBinding(params, "fieldFrequence", { 
        label: "Frequence",
        min: 0.0
    });
    fieldFolder.addBinding(params, "fieldOctaves", { 
        label: "Octaves",
        min: 1,
        step: 1,
    });
    fieldFolder.addBinding(params, "fieldGain", { 
        label: "Gain",
        min: 0.0
    });
    fieldFolder.addBinding(params, "fieldLacunarity", { 
        label: "Lacunarity",
        min: 0.0
    });
    fieldFolder.addBinding(params, "fieldShiftX", { 
        label: "Shift X",
    });
    fieldFolder.addBinding(params, "fieldShiftY", { 
        label: "Shift Y",
    });

    const colorPaletteFolder = pane.addFolder({
        title: "Color Palette",
        expanded: false,
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
    
    const animationFolder = pane.addFolder({
        title: "Animation",
        expanded: false,
    });
    animationFolder.addBinding(params, "animRun", { label: "Run Animation" });

    pane
        .addButton({title: 'Reset Parameters'})
        .on('click', () => {
            Object.assign(params, structuredClone(PARAMS_DEFAULT));
            pane.refresh();
        });

}