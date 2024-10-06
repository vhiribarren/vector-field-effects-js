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
precision highp float;

uniform float uSpeedStep;
uniform float uTimeAccMs;
uniform float uTimeDeltaMs;
uniform sampler2D uPositions;

uniform float uFieldFrequence;
uniform uint uFieldOctaves;
uniform float uFieldGain;
uniform float uFieldLacunarity;
uniform float uFieldShiftX;
uniform float uFieldShiftY;

layout(location = 0) out vec4 outputValue;

float PI = 3.14;

float random(vec2 uv) {
  return fract(sin(dot(uv.xy, vec2(12.9898, 78.233))) * 43758.5453123);
}

float average_noise_smoothstep(vec2 scaled_uv) {
    vec2 percent = smoothstep(vec2(0.), vec2(1.), fract(scaled_uv));
    float rand_tl = random(floor(scaled_uv));
    float rand_tr = random(floor(scaled_uv + vec2(1.0, 0.0)));
    float rand_bl = random(floor(scaled_uv + vec2(0.0, 1.0)));
    float rand_br = random(ceil(scaled_uv));
    float top_avg = mix(rand_tl, rand_tr, percent.x);
    float bottom_avg = mix(rand_bl, rand_br, percent.x);
    return mix(top_avg, bottom_avg, percent.y);
}


vec2 vector_field(vec2 uv) {

    float scaled_u = uv.x * uFieldFrequence + uFieldShiftX;
    float scaled_v = uv.y * uFieldFrequence + uFieldShiftY;
    float noise_val = 0.0;
    float freq = uFieldFrequence;
    float amp = 1.0;
    float total_amplitude = 0.0;
    for (uint i = 0u; i < uFieldOctaves; i++) {
        total_amplitude += amp;
        noise_val += amp * average_noise_smoothstep(vec2(scaled_u, scaled_v));
        amp *= uFieldGain;
        scaled_u *= uFieldLacunarity;
        scaled_v *= uFieldLacunarity;
    }
    noise_val /= total_amplitude;

    float r = 2.0*PI*noise_val;
    return vec2(cos(r), sin(r));
    //return normalize(vec2(1.0, cos(PI*uv.y/size.y)));
}

// Given a texture containing information on particle state
// When we need to update this information before next drawing,
// Then the texture is updated with new information 
void main() {
  vec4 currentPosition = texelFetch(uPositions, ivec2(gl_FragCoord.x, gl_FragCoord.y), 0);
  float randomValue = random(uTimeDeltaMs * currentPosition.xy);
  bool shouldRandomize = randomValue < 0.01;
  vec4 particlePos = shouldRandomize
    ? vec4(1.0 - 2.0*random(vec2(currentPosition.x, randomValue)), 1.0- 2.0*random(vec2(randomValue, currentPosition.y)), 0.0, 0.0)
    : currentPosition;
  outputValue = particlePos + vec4(vector_field(particlePos.xy), 0.0, 0.0)*uSpeedStep*uTimeDeltaMs;
}