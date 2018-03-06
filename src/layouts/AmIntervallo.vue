/* copyright 2018, stefano bovio @allyoucanmap. */

<style>
body {
  margin: 0;
}
.am-container {
  position: absolute;
  width: 100%;
  height: 100%;
}
</style>

<template lang="html">
  <div
    id="intervallo"
    class="am-container"
    oncontextmenu="return false;">
    <am-score
      v-if="start"
      :read="read"
      :intervallo="read ? json : null"/>
  </div>
</template>

<script>
  import components from "../utils/requires/getComponents.js";
  import axios from "axios";
  import {isObject} from "lodash";
  const path = window.$_am_path || '';
  export default {
    components,
    data() {
      return {
        start: false,
        read: false
      };
    },
    created() {
      this.$_am_load();
    },
    methods: {
      $_am_load() {
        axios
          .get(path + "/intervallo.json")
          .then(response => {
            try {
              const json = isObject(response.data) ? {...response.data} : JSON.parse(response.data);
              if (json.info === 'intervallo@1.0.0') {
                this.read = true;
                this.start = true;
                this.json = {...json};
              } else {
                this.start = true;
              }
            } catch (e) {
              this.start = true;
            }
          })
          .catch(() => {
            this.start = true;
          });
      }
    }
  };
</script>
