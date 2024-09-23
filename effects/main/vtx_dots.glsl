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

void main() {
    vec3 position = texelFetch(uPositions, ivec2(gl_InstanceID, 0), 0).xyz;
    gl_Position =  vec4(position, 1.0);
    gl_PointSize = uPointSize;
    color = vec4(color_palette(float(gl_InstanceID) / uTotalPoints ), 1.0);
}