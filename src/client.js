/* copyright 2018, stefano bovio @allyoucanmap. */

import Vue from 'vue';
import AmIntervallo from './layouts/AmIntervallo.vue';

const app = new Vue({
  el: '#app',
  components: {
    AmIntervallo
  },
  template: '<am-intervallo></am-intervallo>'
});

export default app;
