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

uniform vec3 uPaletteLuminosity;
uniform vec3 uPaletteContrast;
uniform vec3 uPaletteFreq;
uniform vec3 uPalettePhase;
uniform float uPointSize;
uniform float uTotalPoints;
uniform sampler2D uPositions;
out vec4 color;

float PI = 3.141;


vec3 color_palette(float val) {
    // From Inigo Quilez
    // https://www.youtube.com/shorts/TH3OTy5fTog
    // https://iquilezles.org/articles/palettes/
    return uPaletteLuminosity + uPaletteContrast*cos(2.0*PI*(val*uPaletteFreq+uPalettePhase));
}

ivec2 coordsFromIndex() {
    int index = gl_InstanceID;
    int width = textureSize(uPositions, 0).x;
    int x = index % width;
    int y = index / width;
    return ivec2(x, y);
}

// Given information about a particle stored in a texture at an index (gl_InstanceID)
// When the particle is drawn
// Then information at index is collected and output to fragment shader,
// And position of particle is applied to position of vertex
//
// Input:
//     gl_InstanceID: int, index of point being drawn
//     uPositions: vec4, indexed by gl_InstanceID, with x, y being position of particle
// 
// Output:
//     color: vec4, color of the particle
//     gl_Position: vec4, position of particle
//     gl_PointSize: int, size of particle
void main() {
    vec3 position = texelFetch(uPositions, coordsFromIndex(), 0).xyz;
    gl_Position =  vec4(position, 1.0);
    gl_PointSize = uPointSize;
    color = vec4(color_palette(float(gl_InstanceID) / uTotalPoints ), 1.0);
}