/* copyright 2018, stefano bovio @allyoucanmap. */

<template lang="html">
  <canvas
    :width="width"
    :height="height"
    class="am-gl-canvas"
    style="position:absolute; top: 0; left: 0;"/>
</template>

<script>

  import {createModel, createProgram, destroyShaders, startShader, stopShader, deleteModel, loadUniform, bindBufferTexture} from '../utils/GLUtils';
  import {range, isEqual} from 'lodash';
  import {mapValue, inside} from '../utils/Utils';

  const vert = require('raw-loader!./shader.vert');
  const frag = require('raw-loader!./shader.frag');
  export default {
    props: {
      width: {
        type: Number,
        default: 256
      },
      height: {
        type: Number,
        default: 256
      },
      point: {
        type: Array,
        default: () => [0, 0]
      },
      frequencies: {
        type: Array,
        default: () => range(16)
      },
      notes: {
        type: Array,
        default: () => []
      },
      bbox: {
        type: Array,
        default: () => []
      },
      res: {
        type: Number,
        default: 1
      },
      audio: {
        type: Object,
        default: () => {}
      }
    },
    data() {
      return {
        gl: null,
        draw: () => {},
        requestFrame: null,
        time: 0,
        shaders: [],
        frameBuffers: [],
        textureData: null,
        textureColor: null,
        textureRadius: null,
        dataSide: 0,
        attributes: {
          positions: {
            pos: 0,
            dim: 3
          },
          textureCoordinates: {
            pos: 1,
            dim: 2
          },
          index: {}
        },
        uniforms: {
          width: 'f',
          height: 'f',
          time: 'f',
          point: 'vec2',
          frequencies: 'fv',
          textureData: 'i',
          textureRadius: 'i',
          textureColor: 'i',
          notesLength: 'f',
          animationFrame: null
        },
      };
    },
    watch: {
      width(newData) {
        this.gl.viewport(0, 0, newData, this.height);
      },
      height(newData) {
        this.gl.viewport(0, 0, this.width, newData);
      },
      audio(newData, oldData) {
        this.$_am_createTexture(newData, oldData, this.notes);
      },
      bbox(newData, oldData) {
        this.$_am_createTexture(newData, oldData, this.notes);
      },
      notes(newData, oldData) {
        this.$_am_createTexture(newData, oldData, newData);
      }
    },
    mounted() {
      this.gl = this.$el.getContext('webgl') || this.$el.getContext('experimental-webgl') || null;
      if (this.gl) {

        this.quad = createModel(this.gl, {
            index: true,
            positions: true,
            textureCoordinates: true
          }, {
            index: [0, 1, 3, 3, 1, 2],
            positions: [-1.0, 1.0, 0.0, -1.0, -1.0, 0.0, 1.0, -1.0, 0.0, 1.0, 1.0, 0.0],
            textureCoordinates: [0, 1, 0, 0, 1, 0, 1, 1]
          }
        );

        this.shader = createProgram({
            gl: this.gl,
            vertex: vert,
            fragment: frag,
            attributes: this.attributes,
            uniforms: this.uniforms
        });

        this.gl.viewport(0, 0, this.width, this.height);
        this.gl.enable(this.gl.CULL_FACE);
        this.gl.cullFace(this.gl.BACK);
        this.gl.enable(this.gl.DEPTH_TEST);
        this.gl.depthFunc(this.gl.LEQUAL);
        this.gl.blendFunc(this.gl.ONE, this.gl.ONE_MINUS_SRC_ALPHA);

        this.$_am_loop();
      }
    },
    beforeDestroy() {
      if (this.gl) {
        destroyShaders({
          gl: this.gl,
          vertexId: this.shader.vertexId,
          fragmentId: this.shader.fragmentId,
          programId: this.shader.programId
        });
        deleteModel(this.gl, this.quad);
      }
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.requestFrame) {
        clearTimeout(this.requestFrame);
      }
    },
    methods: {
      $_am_createTexture(newData, oldData, allNotes) {

        const notes = allNotes.filter(note => inside(
          [note.cx, note.cy],
          [
            [this.bbox[0], this.bbox[1]],
            [this.bbox[0], this.bbox[3]],
            [this.bbox[2], this.bbox[3]],
            [this.bbox[2], this.bbox[1]]
          ]
        ));

        if (!isEqual(newData, oldData)) {
          if (this.textureData) {
            const tmpDTexture = this.textureData;
            this.textureData = null;
            this.gl.deleteTexture(tmpDTexture);
            const tmpRTexture = this.textureRadius;
            this.textureRadius = null;
            this.gl.deleteTexture(tmpRTexture);
            const tmpCTexture = this.textureColor;
            this.textureColor = null;
            this.gl.deleteTexture(tmpCTexture);
          }

          this.dataSide = 8.0;

          const bufferCData = range(this.dataSide * this.dataSide).reduce((pixels, i) => {
            if (notes[i]) {
              const coords = this.$_am_decodeCoordsToPixel([notes[i].cx, notes[i].cy]);
              return [
                ...pixels,
                Math.round(coords.r * 255),
                Math.round(coords.g * 255),
                Math.round(coords.b * 255),
                Math.round(coords.a * 255)
              ];
            }
            return [...pixels, 0.0, 0.0, 0.0, 0.0];
          }, []);

          this.textureData = bindBufferTexture(this.gl, bufferCData, this.dataSide, this.dataSide);

          const bufferRData = range(this.dataSide * this.dataSide).reduce((pixels, i) => {
            if (notes[i]) {
              const coords = this.$_am_decodeCoordsToPixel([notes[i].r / this.width * this.res, 0], false);
              return [
                ...pixels,
                Math.round(coords.r * 255),
                Math.round(coords.g * 255),
                Math.round(coords.b * 255),
                Math.round(coords.a * 255)
              ];
            }
            return [...pixels, 0.0, 0.0, 0.0, 0.0];
          }, []);
          this.textureRadius = bindBufferTexture(this.gl, bufferRData, this.dataSide, this.dataSide);

          const bufferColData = range(this.dataSide * this.dataSide).reduce((pixels, i) => {
            if (notes[i]) {
              const color = notes[i] && notes[i].audio && this.audio[notes[i].audio] && this.audio[notes[i].audio].colors && this.audio[notes[i].audio].colors.rgba
              || {r: 0.0, g: 0.0, b: 0.0, a: 255.0};
              return [
                ...pixels,
                color.r,
                color.g,
                color.b,
                color.a
              ];
            }
            return [...pixels, 0.0, 0.0, 0.0, 0.0];
          }, []);
          this.textureColor = bindBufferTexture(this.gl, bufferColData, this.dataSide, this.dataSide);
        }
      },
      $_am_decodeCoordsToPixel(coordinates, transform = true) {
        const coords = transform ? this.$_am_mapCoordsForPixel(coordinates) : coordinates;
        const r = coords[0] * 255 - Math.floor(coords[0] * 255);
        const g = coords[1] * 255 - Math.floor(coords[1] * 255);
        const b = Math.floor(coords[0] * 255) / 255;
        const a = Math.floor(coords[1] * 255) / 255;
        return {r, g, b, a};
      },
      $_am_draw() {
        this.gl.clearColor(0.0, 0.0, 0.0, 0.0);
        this.gl.clear(this.gl.COLOR_BUFFER_BIT | this.gl.DEPTH_BUFFER_BIT);

        if (this.textureData && this.textureRadius && this.textureColor) {
          startShader(this.gl, this.shader.programId);
          this.$_am_render();
          stopShader(this.gl);
        }

        this.time = this.time + 0.05;
      },
      $_am_loop() {
        this.draw = () => {
            this.requestFrame = setTimeout(() => {
                this.animationFrame = requestAnimationFrame(this.draw);
            }, 1000 / 30);
            this.$_am_draw();
        };
        this.draw();
      },
      $_am_mapCoordsForPixel(coords) {
        return [
          mapValue(coords[0], this.bbox[0], this.bbox[2], 0, 1),
          mapValue(coords[1], this.bbox[1], this.bbox[3], 0, 1)
        ];
      },
      $_am_mapViewForPixel(coords) {
        return [
          mapValue(coords[0], 0, this.width, 0, 1),
          mapValue(coords[1], 0, this.height, 1, 0)
        ];
      },
      $_am_render() {
        this.gl.bindBuffer(this.gl.ELEMENT_ARRAY_BUFFER, this.quad.index.buffer);

        this.gl.enableVertexAttribArray(this.attributes.positions.pos);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad.positions.buffer);
        this.gl.vertexAttribPointer(this.attributes.positions.pos, this.attributes.positions.dim, this.gl.FLOAT, false, 0, 0);

        this.gl.enableVertexAttribArray(this.attributes.textureCoordinates.pos);
        this.gl.bindBuffer(this.gl.ARRAY_BUFFER, this.quad.textureCoordinates.buffer);
        this.gl.vertexAttribPointer(this.attributes.textureCoordinates.pos, this.attributes.textureCoordinates.dim, this.gl.FLOAT, false, 0, 0);

        this.gl.activeTexture(this.gl.TEXTURE0);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureData);

        loadUniform({
          gl: this.gl,
          type: 'i',
          name: 'textureData',
          locations: this.shader.locations,
          value: 0
        });

        this.gl.activeTexture(this.gl.TEXTURE1);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureRadius);

        loadUniform({
          gl: this.gl,
          type: 'i',
          name: 'textureRadius',
          locations: this.shader.locations,
          value: 1
        });

        this.gl.activeTexture(this.gl.TEXTURE2);
        this.gl.bindTexture(this.gl.TEXTURE_2D, this.textureColor);

        loadUniform({
          gl: this.gl,
          type: 'i',
          name: 'textureColor',
          locations: this.shader.locations,
          value: 2
        });

        loadUniform({
          gl: this.gl,
          type: 'f',
          name: 'notesLength',
          locations: this.shader.locations,
          value: this.notes.length
        });

        loadUniform({
          gl: this.gl,
          type: 'fv',
          name: 'frequencies',
          locations: this.shader.locations,
          value: this.frequencies
        });


        loadUniform({
            gl: this.gl,
            type: 'f',
            name: 'width',
            locations: this.shader.locations,
            value: this.width
        });

        loadUniform({
            gl: this.gl,
            type: 'f',
            name: 'height',
            locations: this.shader.locations,
            value: this.height
        });

        loadUniform({
            gl: this.gl,
            type: 'vec2',
            name: 'point',
            locations: this.shader.locations,
            value: this.$_am_mapViewForPixel(this.point)
        });

        loadUniform({
            gl: this.gl,
            type: 'f',
            name: 'time',
            locations: this.shader.locations,
            value: this.time
        });

        this.gl.drawElements(this.gl.TRIANGLES, this.quad.index.coords.length, this.gl.UNSIGNED_SHORT, 0);

        this.gl.disableVertexAttribArray(this.attributes.positions.pos);
        this.gl.disableVertexAttribArray(this.attributes.textureCoordinates.pos);
      }
    }
  }
</script>
