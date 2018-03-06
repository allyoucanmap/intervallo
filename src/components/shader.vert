
precision highp float;

attribute vec3 positions;
attribute vec2 textureCoordinates;

varying vec2 textureCoord;

void main(void) {
    textureCoord = textureCoordinates;
    gl_Position = vec4(positions, 1.0);
}
