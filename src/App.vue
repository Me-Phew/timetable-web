<script setup>
import { onMounted, reactive } from "vue";
import TimetableItem from "./components/TimetableItem.vue";
import axios from "axios";
import { useDebounceFn } from "@vueuse/core";

const state = reactive({
  stops: [],
  foundStops: [],
});

const findStops = async (e) => {
  const q = e.target.value;
  const response = await axios.get("http://127.0.0.1:8000/timetable-api/stops");
  state.foundStops = response.data.st.filter((stop) => {
    return stop.nm.toLowerCase().includes(q.toLowerCase());
  }, 200);
};

const findStopsDebounce = useDebounceFn((e) => findStops(e));

const checkShop = (stop, nr) => {
  return stop.nr === nr;
};

const addStop = (nr) => {
  if (!state.stops.find((stop) => checkShop(stop, nr))) {
    state.stops.push(state.foundStops.find((stop) => checkShop(stop, nr)));
  }
};
</script>

<template>
  <header>
    <input
      type="search"
      name=""
      id=""
      @input="findStopsDebounce"
      @keyup.enter="findStops"
      class="search-stops"
    />
    <ol v-if="state.foundStops" class="found-stops">
      <li
        v-for="stop in state.foundStops"
        :key="stop.nr"
        @click="addStop(stop.nr)"
      >
        {{ stop.nm }} ({{ stop.nr }})
      </li>
    </ol>
  </header>

  <main>
    <TimetableItem v-for="stop in state.stops" :key="stop.nr" :stop="stop" />
  </main>
</template>

<style scoped>
.search-stops {
  outline: none;
  border: 0;
  border-bottom: 2px solid var(--color-border);
}
.search-stops:not(:focus) + .found-stops:not(:hover) {
  display: none;
}

header {
  line-height: 1.5;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }
}
</style>
