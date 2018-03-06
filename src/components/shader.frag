
precision highp float;

#define PI 3.141592653589793
varying vec2 textureCoord;

uniform float width;
uniform float height;
uniform float time;
uniform vec2 point;
uniform float frequencies[16];
uniform sampler2D textureData;
uniform sampler2D textureRadius;
uniform sampler2D textureColor;
uniform float notesLength;

const float slicesLength = 16.0;
int checkBackround = 0;

float mapValue(float val, float v1, float v2, float v3, float v4) {
    return v3 + (v4 - v3) * ((val - v1) / (v2 - v1));
}

vec2 audjustCoords(vec2 coords) {
    if (width / height > 1.0) {
        return vec2(coords.x * width / height, coords.y);
    }
    return vec2(coords.x, coords.y * height / width);
}

float rad(float deg) {
    return deg * (PI / 180.0);
}

float normalizeAngle(vec2 aPosition) {
    float angle = atan((aPosition.x) / (aPosition.y));
    float maxAngle = abs(rad(90.0));
    if (aPosition.x >= 0.0 && aPosition.y >= 0.0) {
        return mapValue(angle, -maxAngle, 0.0, 0.0, 90.0);
    } else if (aPosition.x <= 0.0 && aPosition.y >= 0.0) {
        return mapValue(angle, 0.0, maxAngle, 90.0, 180.0);
    } else if (aPosition.x <= 0.0 && aPosition.y <= 0.0) {
        return mapValue(angle, -maxAngle, 0.0, 180.0, 270.0);
    }  else if (aPosition.x >= 0.0 && aPosition.y <= 0.0) {
        return mapValue(angle, 0.0, maxAngle, 270.0, 360.0);
    }
    return 0.0;
}


vec3 drawCircle(vec2 pos, vec2 cCenter, float cRadius, vec3 diffuse) {

    vec3 color = vec3(clamp(smoothstep(cRadius,  0.0, distance(pos, cCenter)), 0.05, 0.999));
    float lng = 1.0;

    vec2 mouse = audjustCoords(point);

    if (smoothstep(cRadius, 0.0, distance(mouse, cCenter)) > 0.0) {
        color = vec3(0.1);
        float size = 360.0 / slicesLength;
        for (float slice = 0.0; slice < slicesLength; slice += 1.0) {

            float theta = size * slice;
            float posAngle = normalizeAngle(vec2(pos.x - cCenter.x, pos.y - cCenter.y)) + time * smoothstep(cRadius, 0.0, distance(mouse, cCenter)) * 10.0;
            posAngle = mod(posAngle, 360.0);
            float slicePos = smoothstep(theta - size / 2.0, theta + size / 2.0, posAngle);
            

            if (theta + size > 360.0) {
                slicePos = smoothstep(mod(theta, 360.0), mod(theta - size, 360.0), mod(posAngle - size / 2.0, 360.0));
            }

            if (theta - size < 0.0) {
                slicePos = smoothstep(mod(theta, 360.0), mod(theta + size, 360.0), mod(posAngle + size / 2.0, 360.0));
            }
            float freq = frequencies[int(slice)];
            float compression = cRadius - cRadius / 1.5 * smoothstep(cRadius, 0.0, distance(mouse, cCenter)) * smoothstep(-150.0, 0.0, freq) * abs(cos(mapValue(slicePos, 0.0, 1.0, rad(-90.0), rad(90.0))));
            if (slicePos > 0.0 && slicePos < 1.0
            && distance(pos, cCenter) < cRadius
            && distance(pos, cCenter) < compression) {

                // color += vec3(smoothstep(compression,  0.0, distance(pos, cCenter)));
                // color += mix(diffuse, vec3(smoothstep(compression,  0.0, distance(pos, cCenter))), clamp(smoothstep(0.0, cRadius, distance(mouse, cCenter)), 0.0, 1.0));
                color = mix(diffuse, vec3(smoothstep(compression,  0.0, distance(pos, cCenter))), clamp(smoothstep(0.0, cRadius, distance(mouse, cCenter)), 0.4, 1.0));
                checkBackround = 1;
                return color;
            }
        }

    } else {

        if (smoothstep(0.0, cRadius, distance(pos, cCenter)) != 1.0) {
            checkBackround = 1;
        } else {
            lng += 1.0;
        }
    }
    
    return color / lng;
}

void main(void) {

    vec2 pos = audjustCoords(vec2(textureCoord));

    vec3 color = vec3(1.0);
    float lng = 1.0;

    for (float y = 0.0; y < 8.0; y += 1.0) {
        for (float x = 0.0; x < 8.0; x += 1.0) {
            float noteId = y * 8.0 + x;
            if (noteId < notesLength) {
                vec4 textDataColor = texture2D(textureData, vec2(x / 8.0, y / 8.0));
                vec4 textRadiusColor = texture2D(textureRadius, vec2(x / 8.0, y / 8.0));
                vec2 center = vec2(textDataColor.r / 255.0 + textDataColor.b, textDataColor.g / 255.0 + textDataColor.a);
                float r = textRadiusColor.r / 255.0 + textRadiusColor.b;
                vec3 circleColor = texture2D(textureColor, vec2(x / 8.0, y / 8.0)).xyz;
                color += drawCircle(pos, vec2(audjustCoords(center)), audjustCoords(vec2(r)).x, circleColor);
            } else {
                break;
            }
        }
    }

    if (checkBackround == 0) {
        color += vec3(1.0);
        lng ++;
    }

    color /= notesLength + lng;
    gl_FragColor = vec4(color * (1.0 + notesLength / 3.0), 1.0);
}

