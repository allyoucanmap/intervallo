/* copyright 2018, stefano bovio @allyoucanmap. */

<style scoped>
  #am-score-container {
    position:relative;
    width:100%;
    height:100%;
    display:flex;
    font-family: monospace;
  }
  .am-audio-list {
    position: absolute;
    right: 0;
    top: 0;
    width: 256px;
    height: calc(100% - 32px);
    padding: 16px;
    border-left: 1px solid #333;
    overflow-y: auto;
  }
  .am-audio-list-el {
    height: 32px;
    line-height: 32px;
    border-bottom: 1px solid #333;
    display: flex;
  }
  .am-audio-list-el .am-color {
    width: 16px;
    height: 16px;
    margin: 8px;
    cursor: pointer;
  }
  .am-audio-list-el .am-label {
    flex: 1;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .am-color-overlay {
    position: fixed;
    top: 0;
    width: 100%;
    height: 100%;
    background-color: rgba(0, 0, 0, 0.25);
    display: flex;
  }
  .am-color-overlay > * {
    margin: auto;
  }
</style>

<template lang="html">
  <span>
    <div
      id="am-score-container"
      @click="$_am_onClick"
      @mousewheel="$_am_onScroll"
      @mousemove="$_am_onMove"
      @dragend="$_am_dragEnd"
      @dragover="(e) => { e.preventDefault(); }"
      @drop="$_am_drop">
      <am-canvas
        :width="clientRect.width"
        :height="clientRect.height"
        :point="point"
        :frequencies="frequencies"
        :notes="notes"
        :bbox="bbox"
        :audio="audio"
        :res="res"/>
      <svg 
        :width="clientRect.width"
        :height="clientRect.height"
        style="margin:auto;position:absolute;">
        <g v-if="clientRect.width > 32 && clientRect.height > 32">
          <rect
            x="0"
            y="0"
            :width="clientRect.width"
            :height="clientRect.height"
            :fill="'none'"/>
          <rect
            x="8"
            y="8"
            :width="clientRect.width - 16"
            :height="clientRect.height - 16"
            fill="none"
            :stroke="'#333333'"
            :stroke-width="0.5"/>
          <rect
            x="16"
            y="16"
            :width="clientRect.width - 32"
            :height="clientRect.height - 32"
            fill="none"
            :stroke="'#333333'"
            :stroke-width="2"/>
        </g>
        <g>
          <line
            :x1="0"
            :y1="$_am_mapOnBbox(0, 'y')"
            :x2="clientRect.width"
            :y2="$_am_mapOnBbox(0, 'y')"
            :stroke="'#777777'"
            :stroke-width="0.2"/>
        </g>
        <g>
          <line
            :x1="$_am_mapOnBbox(0, 'x')"
            :y1="0"
            :x2="$_am_mapOnBbox(0, 'x')"
            :y2="clientRect.height"
            :stroke="'#777777'"
            :stroke-width="0.2"/>
        </g>
        <g v-if="edit && location && location.features">
          <path
            v-for="feature in location.features"
            :key="feature.am_i"
            :d="feature.d"
            :style="'transform: rotateZ(180deg) scale(' + res + ') translate(' + (center[0] - clientRect.width / 2 / res ) + 'px, ' + -(clientRect.height / 2 / res + center[1]) + 'px);'"
            :fill="'none'"
            :stroke="'#333333'"
            :stroke-width="0.5 / res"/>
        </g>
        <g v-if="edit && !read">
          <g
            v-for="note in notes"
            :key="note.id">
            <circle
              v-if="note.type === 'circle'"
              :cx="$_am_mapOnBbox(note.cx, 'x')"
              :cy="$_am_mapOnBbox(note.cy, 'y')"
              :r="note.r * res"
              :fill="'none'"
              :fill-opacity="0.4"
              :stroke="'#333333'"
              :stroke-dasharray="note.edit ? '10 5' : 'none'"
              :stroke-width="note.edit ? 4 : 1"/>
            <circle
              v-if="note.type === 'circle'"
              :cx="$_am_mapOnBbox(note.cx, 'x')"
              :cy="$_am_mapOnBbox(note.cy, 'y')"
              :r="note.move ? 8 : 4"
              :fill="note.move ? 'transparent' : '#777777'"
              :stroke="note.move ? '#333333' : 'none'"
              :stroke-dasharray="note.move ? '10 5' : 'none'"
              :stroke-width="note.move ? 4 : 1"/>
            <line
              v-if="note.edit"
              :x1="$_am_mapOnBbox(note.cx, 'x')"
              :y1="$_am_mapOnBbox(note.cy, 'y')"
              :x2="point[0]"
              :y2="point[1]"
              :stroke="'#333333'"
              :stroke-dasharray="'10 4 2 4'"
              :stroke-width="2"/>
            <path
              v-if="note.type === 'area'"
              :d="$_am_getD(note.geometry, true)"
              :fill="'none'"
              :stroke="'#777777'"
              :stroke-width="1"/>
          </g>
        </g>
        <g v-if="edit && pointA && pointB && !read">
          <circle
            v-if="editType === 'circle'"
            :cx="$_am_mapOnBbox(pointA[0], 'x')"
            :cy="$_am_mapOnBbox(pointA[1], 'y')"
            :r="$_am_dist(pointA, pointB) * res"
            :fill="'none'"
            :fill-opacity="0.4"
            :stroke="'#333333'"
            :stroke-dasharray="'10 5'"
            :stroke-width="4"/>
          <circle
            v-if="editType === 'circle'"
            :cx="$_am_mapOnBbox(pointA[0], 'x')"
            :cy="$_am_mapOnBbox(pointA[1], 'y')"
            :r="8"
            :fill="'none'"
            :stroke="'#333333'"
            :stroke-dasharray="'5 2'"
            :stroke-width="2"/>
          <line
            v-if="editType === 'circle'"
            :x1="$_am_mapOnBbox(pointA[0], 'x')"
            :y1="$_am_mapOnBbox(pointA[1], 'y')"
            :x2="$_am_mapOnBbox(pointB[0], 'x')"
            :y2="$_am_mapOnBbox(pointB[1], 'y')"
            :stroke="'#333333'"
            :stroke-dasharray="'10 4 2 4'"
            :stroke-width="2"/>
          <path
            v-if="editType === 'area'"
            :d="$_am_getD(geometry)"
            :fill="'none'"
            :stroke="'#777777'"
            :stroke-dasharray="'10 4'"
            :stroke-width="1"/>
          <line
            v-if="editType === 'area'"
            :x1="$_am_mapOnBbox(pointA[0], 'x')"
            :y1="$_am_mapOnBbox(pointA[1], 'y')"
            :x2="$_am_mapOnBbox(pointB[0], 'x')"
            :y2="$_am_mapOnBbox(pointB[1], 'y')"
            :stroke="'#777777'"
            :stroke-dasharray="'10 4'"
            :stroke-width="1"/>
          <rect
            v-if="close && geometry && geometry[0]"
            :x="$_am_mapOnBbox(geometry[0][0], 'x') - 8"
            :y="$_am_mapOnBbox(geometry[0][1], 'y') - 8"
            width="16"
            height="16"
            fill="none"
            :stroke="'#333333'"
            :stroke-width="2"/>
        </g>
        <g>
          <circle
            v-if="!read"
            :cx="36"
            :cy="36"
            :r="12"
            :fill="'none'"
            :fill-opacity="0.4"
            :stroke="'#333333'"
            :stroke-width="1"/>
          <circle
            v-if="!read"
            :cx="36"
            :cy="36"
            :r="2"
            :fill="'none'"
            :stroke="'#333333'"/>
          <rect
            v-if="!read || (read && location)"
            :x="20"
            :y="20"
            :width="32"
            :height="32"
            fill="transparent"
            :stroke="edit && editType === 'circle' ? '#aaff33' : '#333333'"
            :stroke-width="2"
            style="cursor:pointer;"
            @click="e => { e.stopPropagation(); $_am_toggleEdit('circle');}"/>
          <rect
            v-if="!read && notes.length > 0"
            :x="20"
            :y="clientRect.height - 20 - 32"
            :width="32"
            :height="32"
            fill="transparent"
            stroke="#333333"
            stroke-width="2"
            style="cursor:pointer;"
            @click="e => { e.stopPropagation(); $_am_save();}"/>
        </g>
      </svg>
      <div
        class="am-audio-list"
        v-if="edit && !read">
        <div
          v-for="file in audioFiles"
          :key="file"
          :draggable="!read"
          class="am-audio-list-el"
          @dragstart="() => $_am_startDragItem(file)">
          <div
            class="am-label"
            :title="file">{{ file }}</div>
          <div
            v-if="audio[file]"
            key="am-color-box"
            class="am-color"
            @click="e => $_am_editAudioColor(e, file)"
            :style="'background-color:' + (audio[file].colors && audio[file].colors.hex || '#333') + ';'"/>
          <div
            v-else
            key="am-color-box"
            class="am-color"/>
        </div>
      </div>
      
    </div>
    <div
      class="am-color-overlay"
      v-if="selectedAudio && !read"
      @click="e => $_am_closeColorPicker(e)">
      <am-chrome-picker
        :value="audio[selectedAudio] && audio[selectedAudio].colors || {}"
        @input="$_am_updateColorValue"/>
    </div>
  </span>
</template>

<script>

  import {mapValue, lerp} from '../utils/Utils';
  import {range, max, isArray, isEqual, head, isObject} from 'lodash';
  import AmCanvas from './AmCanvas.vue';
  import axios from 'axios';
  import { Chrome } from 'vue-color';
  import {lonToX, latToY, resolution, pseudo} from '../utils/PrjUtils';
  const path = window.$_am_path || '';
  const audioPath = path + '/audio/';
  const audioCtx = new AudioContext();

  const analyzer = audioCtx.createAnalyser();
  analyzer.fftSize = 32;
  const bufferLength = analyzer.frequencyBinCount;
  const dataArray = new Float32Array(bufferLength);

  export default {
    components: {
      AmCanvas,
      AmChromePicker: Chrome
    },
    props: {
      read: {
        type: Boolean,
        default: false
      },
      intervallo: {
        type: Object,
        default: null
      }
    },
    data() {
      return {
        res: 1,
        point: [0, 0],
        frequencies: range(16),
        zoom: 0,
        clientRect: {
          height: 0,
          width: 0
        },
        center: [0, 0],
        bbox: [
          -100,
          -100,
          100,
          100
        ],
        location: null,
        edit: false,
        editType: 'circle',
        notes: [],
        dragPoint: [0, 0],
        pointA: null,
        pointB: null,
        geometry: [],
        delta: [0, 0],
        close: false,
        resolutions: [],
        audio: {},
        audioFiles: [],
        selectedAudio: null,
        move: false,
        tempAudio: null,
        animationFrame: null,
        resizeListener: null
      };
    },
    watch: {
      res(newData) {
        this.$_am_onResize(newData, this.center);
      },
      notes(newData, oldData) {
        if (!isEqual(newData, oldData)) {
          if (!(this.move && this.move.clicked)) {
            this.move = head(newData.filter(note => note.move));
          }
          if (!(this.editRaidus && this.editRaidus.clicked)) {
            this.editRaidus =  head(newData.filter(note => note.edit));
          }
        }
      },
      center(newData) {
        this.$_am_onResize(this.res, newData);
      },
      dragPoint(newData, oldData) {
        if (this.dragPoint[2]) {
          this.delta = [this.delta[0] - (newData[0] - oldData[0]) * 0.7 , this.delta[1] - (newData[1] - oldData[1]) * 0.7 ];
        }
      }
    },
    created() {
      this.resolutions = range(3, 21).map(val => 1 / resolution(0, val));
      if (this.intervallo) {
        this.notes = this.intervallo.notes && [...this.intervallo.notes] || [...this.notes];
        this.center = [...this.intervallo.center] || [...this.center];
        this.delta = [...this.center];
        this.zoom = this.intervallo.zoom || this.zoom;
        this.location = this.intervallo.location && {...this.intervallo.location} || undefined;
        this.res = this.resolutions[this.zoom];
        this.edit = this.intervallo.edit || this.edit;
      } else {
        axios.get(audioPath + '_config.json').then(response => {
          if (response.data && isArray(response.data.audio)) {
            this.audioFiles = ['none', ...response.data.audio.sort()];
            this.center = [...(isArray(response.data.center) && pseudo(response.data.center) || this.center)];
            this.delta = [...this.center];
            this.zoom = response.data.zoom || this.zoom;
            this.res = this.resolutions[this.zoom];
          }
        });
      }
    },
    mounted() {
      this.resizeListener = () => this.$_am_onResize(this.res, this.center);
      addEventListener('resize', this.resizeListener);
      this.$_am_onResize(this.res, this.center);
      this.$_am_loop();
      
    },
    beforeDestroy() {
      if (this.animationFrame) {
        cancelAnimationFrame(this.animationFrame);
      }
      if (this.requestFrame) {
        clearTimeout(this.requestFrame);
      }
      removeEventListener('resize', this.resizeListener);
    },
    methods: {
      $_am_pathSVG(coordinates, close = true, length = 1) {
        let d = '';
        if (length === 1) {
          d = coordinates.reduce((a, p, i) => {
            const x = -lonToX(p[0]);
            const y = latToY(p[1]);
            
            if (i === 0) {
              return a + 'M' + x + ' ' + y + ' ';
            } else if (i === coordinates.length - 1) {
              return a + 'L' + x + ' ' + y + (close ? ' Z' : '');
            } else {
              return a + 'L' + x + ' ' + y + ' ';
            }
          }, '');
        }
        if (length === 2) {
          d = coordinates.reduce((allD, c) => {
            return allD + ' ' + c.reduce((a, p, i) => {
              const x = -lonToX(p[0]);
              const y = latToY(p[1]);
              if (i === 0) {
                return a + 'M' + x + ' ' + y + ' ';
              } else if (i === c.length - 1) {
                return a + 'L' + x + ' ' + y + (close ? ' Z' : '');
              } else {
                return a + 'L' + x + ' ' + y + ' ';
              }
            }, '');
          }, '');
        }

        return d;
      },
      $_am_getPath(feature) {
        switch (feature.geometry.type) {
          case 'Point':
              return '';
          case 'MultiPoint':
              return '';
          case 'LineString':
              return this.$_am_pathSVG(feature.geometry.coordinates, false);
          case 'MultiLineString':
              return feature.geometry.coordinates.reduce((coords, coordinates) => {
                return coords + ' ' + this.$_am_pathSVG(coordinates, false);
              }, '');
          case 'Polygon':
              return this.$_am_pathSVG(feature.geometry.coordinates, true, 2);
          case 'MultiPolygon':
              return feature.geometry.coordinates.reduce((coords, coordinates) => {
                return coords + ' ' + this.$_am_pathSVG(coordinates, true, 2);
              }, '');
          default:
              return '';
        }
      },
      $_am_closeColorPicker(event) {
        if (event.target && event.target.getAttribute('class') === 'am-color-overlay') {
          this.selectedAudio = null;
        }
      },
      $_am_editAudioColor(event, file) {
        if (!this.read) {
          event.stopPropagation();
          this.selectedAudio = file;
        }
      },
      $_am_updateColorValue(colors) {
        this.audio = Object.keys(this.audio).reduce((newAudio, key) => {
          if (key === this.selectedAudio) {
            return {...newAudio, [key]: {...this.audio[key], colors}}
          }
          return {...newAudio, [key]: {...this.audio[key]}}
        }, {});
      },
      $_am_loop() {
        this.draw = () => {
            this.requestFrame = setTimeout(() => {
                this.animationFrame = requestAnimationFrame(this.draw);
            }, 1000 / 60);
            this.$_am_draw();
        };
        this.draw();
      },
      $_am_draw() {
        // this.res = lerp(this.res, this.resolutions[this.zoom] || 1.0, 0.2);

        this.center = [
          lerp(this.center[0], this.delta[0], 0.2),
          lerp(this.center[1], this.delta[1], 0.2)
        ];
        
        analyzer.getFloatFrequencyData(dataArray);
        this.frequencies = [...dataArray].map(dat => dat === -Infinity || dat === Infinity ? -150.0 : dat);
        if (this.point) {
          const newValues = this.notes.reduce((values, note) => {
            const {width, height} = this.clientRect;
            const  point = [
              mapValue(this.point[0], 0, width, this.bbox[0], this.bbox[2]),
              mapValue(this.point[1], 0, height, this.bbox[3], this.bbox[1])
            ];
            const dist = this.$_am_dist([note.cx, note.cy], point);
            if (dist <= note.r && note.audio && this.audio[note.audio]) {
              const value = mapValue(dist, 0.0, note.r, 0.75, 0.0);
              const panValue = mapValue(note.cx - point[0], -note.r, note.r, -1.0, 1.0); 
              return {...values, [note.audio]: {
                gain: values[note.audio] && values[note.audio].gain ? [...values[note.audio].gain, value] : [value],
                pan: values[note.audio] && values[note.audio].pan ? [...values[note.audio].pan, panValue] : [panValue],
              }};
            }
            if (note.audio && !this.audio[note.audio]) {
              this.$_am_getAudio(note.audio);
            }
            return {...values};
          }, []);

          Object.keys(this.audio).forEach(key => {
            if (this.audio[key] && this.audio[key].gainNode) {
              if (newValues[key]) {
                this.audio[key].gainNode.gain.value = max(newValues[key].gain);
                this.audio[key].panner.pan.value = newValues[key].pan.reduce((sum, val) => {
                  return sum + val;
                }, 0.0) / newValues[key].pan.length;
              } else {
                this.audio[key].gainNode.gain.value = 0;
              }
            }
          });
        }
      },
      $_am_onScroll(event) {
        const zoom = event.deltaY < 0 ? this.zoom + 1 : this.zoom - 1;
        
        const newZoom = zoom < 0 ?
          0 :
          zoom > this.resolutions.length - 1 && this.resolutions.length - 1 || zoom;
        this.zoom = newZoom;

        const {left, top, width, height} = this.clientRect;
        
        const point = [
          event.clientX - left,
          event.clientY - top
        ];

        const position = [
          mapValue(event.clientX - left, 0, width, this.bbox[0], this.bbox[2]),
          mapValue(event.clientY - top, 0, height, this.bbox[3], this.bbox[1])
        ];

        const delta = [width / 2 - point[0], - (height / 2 - point[1])];
        const res = this.resolutions[newZoom];
        this.center = [position[0] + delta[0] / res, position[1] + delta[1] / res];
        this.delta = [position[0] + delta[0] / res, position[1] + delta[1] / res];
        this.res = res;
      },
      $_am_onClick(event) {
        if (!this.read) {
          const {left, top, width, height} = this.clientRect;
          const point = [
            mapValue(event.clientX - left, 0, width, this.bbox[0], this.bbox[2]),
            mapValue(event.clientY - top, 0, height, this.bbox[3], this.bbox[1])
          ];

          if (this.move) {
            this.move = this.move.clicked ? null : {...this.move, clicked: true};
          } else if (this.editRaidus) {
            this.editRaidus = this.editRaidus.clicked ? null : {...this.editRaidus, clicked: true};
          } else if (this.edit) {
            this.$_am_drawCircle(point);
            this.$_am_drawArea(point);
          }
        }
      },
      $_am_startDragItem(file) {
        if (!this.read) {
          this.dragAudio = file;
        }
      },
      $_am_readData(file) {
        if (file.type === 'application/json' || file.type === '') {
          const reader = new FileReader();
          reader.onload = () => {
            try {
              const json = isObject(reader.result) ? {...reader.result} : JSON.parse(reader.result);
              if (json && json.type === 'FeatureCollection' && json.features && !this.read) { 
                const features = json && json.features && json.features.map((feature, i) => {
                  return {...feature, d: this.$_am_getPath(feature), am_i: i }
                }).filter(feature => feature.d);

                this.location = {...json, features};
              } else if (json.info === 'intervallo@1.0.0') {
                this.notes = json.notes && [...json.notes] || [...this.notes];
                this.center = [...json.center] || [...this.center];
                this.delta = [...this.center];
                this.zoom = json.zoom || this.zoom;
                this.location = json.location && {...json.location} || undefined;
                this.res = this.resolutions[this.zoom];
                this.audio = {};
                this.tempAudio = {...json.audio};
                this.edit = json.edit || this.edit;
              }
            } catch (e) {
              //
            }
          };
          reader.readAsText(file);
        }
      },
      $_am_drop(event) {
        if (!this.read) {
          event.preventDefault();
          event.preventDefault();
          const dt = event.dataTransfer;
          if (dt.items) {
            [...dt.items].forEach(item => {
              if (item.kind === 'file') {
                this.$_am_readData(item.getAsFile());
              }
            });
          } else {
            [...dt.files].forEach(file => {
              this.$_am_readData(file);
            });
          }
        }
      },
      $_am_dragEnd(event) {
        if (this.dragAudio && !this.read) {
          this.notes = this.notes.map((note) => {
            const {left, top, width, height} = this.clientRect;
            const point = [
              mapValue(event.clientX - left, 0, width, this.bbox[0], this.bbox[2]),
              mapValue(event.clientY - top, 0, height, this.bbox[3], this.bbox[1])
            ];
            const dist = this.$_am_dist([note.cx, note.cy], point);
            if (dist <= note.r) {
              return {...note, audio: this.dragAudio === 'none' ? undefined : this.dragAudio};
            }
            return {...note};
        
          });
        } 
        this.dragAudio = null;
      },
      $_am_onMove(event) {
        const {left, top, width, height} = this.clientRect;
        const point = [
          mapValue(event.clientX - left, 0, width, this.bbox[0], this.bbox[2]),
          mapValue(event.clientY - top, 0, height, this.bbox[3], this.bbox[1])
        ];
        this.point = [event.clientX - left, event.clientY - top];

        if (event.button === 1) {
          this.dragPoint = [...point, true];
        } else {
          this.dragPoint = [...point, false];
        }

        if (this.edit && !this.read) {
          if (this.move && this.move.clicked) {
            
            this.notes = this.notes.map(note => {
              if (note.move) {
                return {...note, cx: point[0], cy: point[1] };
              }
              return {...note};
            });
          } else if (this.editRaidus && this.editRaidus.clicked) {
            this.notes = this.notes.map(note => {
              if (note.edit) {
                return {...note, r: this.$_am_dist([note.cx, note.cy], point) };
              }
              return {...note};
            });
          } else {
            if (this.start) {
              this.pointB = [...point];
              if (this.geometry && this.geometry.length > 2) {
                this.close = this.$_am_dist(point, this.geometry[0]) < 10 / this.res;
              } else {
                this.close = false;
              }
            }
            this.notes = this.notes.map((note) => {
              const dist = this.$_am_dist([note.cx, note.cy], point);
              if (dist <= 16 / this.res) {
                return {...note, move: true, hover: false, edit: false};
              } else if (dist <= note.r && dist >= note.r - 16 / this.res) {
                return {...note, edit: true, hover: false, move: false};
              } else if (dist <= note.r) {
                return {...note, hover: true, move: false, edit: false};
              }
              return {...note, hover: false, move: false, edit: false};
            });
          }
          this.notes = this.notes.filter(note => !((note.hover || note.move || note.edit) && event.button === 2));
        }
      },
      $_am_dist(pointA, pointB) {
        return Math.sqrt(Math.pow(Math.abs(pointA[0] - pointB[0]), 2) + Math.pow(Math.abs(pointA[1] - pointB[1]), 2));
      },
      $_am_onResize(res, center) {
        const container = document.getElementById('am-score-container');
        this.clientRect = container.getBoundingClientRect();
        this.bbox = [
          center[0] - this.clientRect.width / 2 / res,
          center[1] - this.clientRect.height / 2 / res,
          center[0] + this.clientRect.width / 2 / res,
          center[1] + this.clientRect.height / 2 / res
        ];
      },
      $_am_mapOnBbox(value, axis, res) {
        if (this.clientRect.width === 0 || this.clientRect.height === 0) {
          return value;
        }
        if (res) {
          const bbox = [
            this.center[0] - this.clientRect.width / 2 / res,
            this.center[1] - this.clientRect.height / 2 / res,
            this.center[0] + this.clientRect.width / 2 / res,
            this.center[1] + this.clientRect.height / 2 / res
          ];
          if (axis === 'x') {
            return mapValue(value, bbox[0], bbox[2], 0, this.clientRect.width);
          }
          if (axis === 'y') {
            return mapValue(value, bbox[3], bbox[1], 0, this.clientRect.height);
          } 
        }
        if (axis === 'x') {
          return mapValue(value, this.bbox[0], this.bbox[2], 0, this.clientRect.width);
        }
        if (axis === 'y') {
          return mapValue(value,this.bbox[3], this.bbox[1], 0, this.clientRect.height);
        } 
        return value;
      },
      $_am_drawCircle(point) {
        if (this.editType === 'circle') {
          if (!this.start) {
            this.pointA = [...point];
            this.pointB = [...point];
            this.start = true;
          } else {
            this.notes = [...this.notes, {
              id: this.notes[this.notes.length - 1] && this.notes[this.notes.length - 1].id + 1 || 0,
              type: 'circle',
              cx: this.pointA[0],
              cy: this.pointA[1],
              r: this.$_am_dist(this.pointA, this.pointB)
            }];
            this.pointA = null;
            this.pointB = null;
            this.start = false;
            this.close = false;
            this.geometry = [];
          }
        }
      },
      $_am_getD(geometry, z) {
        return geometry.reduce((d, point, i) => {
          const x = this.$_am_mapOnBbox(point[0], 'x');
          const y = this.$_am_mapOnBbox(point[1], 'y');
          if (i === 0) {
            return d + 'M' + x + ' ' + y + ' ';
          }
          if (i === geometry.length - 1) {
            return d + 'L' + x + ' ' + y + (z ? ' Z' : '');
          }
          return d + 'L' + x + ' ' + y + ' ';
        }, '');
      },
      $_am_toggleEdit() {
        /*this.edit = this.editType !== type;
        if (this.edit) {
          this.editType = type;
        } else {
          this.editType = '';
        }*/
        this.edit = !this.edit;
      },
      $_am_getAudio(file) {
        if (!this.audio[file]) {
          this.audio = {...this.audio, [file]: {}};
          axios.get(audioPath + file, { responseType: 'arraybuffer'})
            .then((response) => audioCtx.decodeAudioData(response.data))
            .then( buffer => {
              const source = audioCtx.createBufferSource();
              source.buffer = buffer;
              source.loop = true;
              const panner = audioCtx.createStereoPanner();
              panner.pan.value = 0.0;
              const gainNode = audioCtx.createGain();
              gainNode.gain.value = 0.0;
              source.connect(panner);
              panner.connect(gainNode);
              gainNode.connect(analyzer);
              analyzer.connect(audioCtx.destination);
              source.start();
              this.audio = {
                ...this.audio,
                [file]: {
                  name: file,
                  panner,
                  gainNode,
                  source,
                  colors: this.intervallo && this.intervallo.audio && this.intervallo.audio[file].colors && {...this.intervallo.audio[file].colors}
                    || this.tempAudio && this.tempAudio[file] && this.tempAudio[file].colors && {...this.tempAudio[file].colors}
                    || undefined
                }};
          });
        }
        
      },
      $_am_drawArea(point) {
        if (this.editType === 'area') {
          if (!this.start) {
            this.pointA = [...point];
            this.pointB = [...point];
            this.geometry = [[...point]];
            this.start = true;
          } else {
            if (this.close) {
              this.notes = [...this.notes, {
                id: this.notes[this.notes.length - 1] && this.notes[this.notes.length - 1].id + 1 || 0,
                type: 'area',
                geometry: [...this.geometry]
              }];
              this.pointA = null;
              this.pointB = null;
              this.start = false;
              this.close = false;
              this.geometry = [];
            } else {
              this.pointA = [...point];
              this.geometry = [...this.geometry, [...point]];
            }
          }
        }
      },
      $_am_save() {
        const dataString = 'data:text/json;charset=utf-8,' + encodeURIComponent(JSON.stringify({
          info: 'intervallo@1.0.0',
          notes: this.notes.map(note => ({
            ...note,
            hover: undefined,
            move: undefined,
            edit: undefined
          })),
          edit: this.edit,
          center: [...this.center],
          audio: Object.keys(this.audio).reduce((aud, key) => ({
            ...aud,
            [key]: {
              colors: this.audio[key].colors && {...this.audio[key].colors} || undefined,
              name: this.audio[key].name || key
            }
          }), {}),
          zoom: this.zoom,
          location: this.location && {...this.location} || undefined
        }));
        const download = document.createElement('a');
        download.setAttribute('href', dataString);
        download.setAttribute('download', 'intervallo.json');
        download.click();
      }
    }
  }
</script>

