<script setup>
import { onMounted, reactive, watch } from "vue";
import TimetableItem from "./components/TimetableItem.vue";
import CustomLoader from "@/components/CustomLoader.vue";
import axios from "axios";
import { useDebounceFn } from "@vueuse/core";

const state = reactive({
  stops: [],
  foundStops: [],
  ct: "",
  timerId: null,
  loading: true,
  q: "",
});

const findStops = async (e) => {
  const q = e.target.value;
  if (q) {
    const response = await axios.get(
      "http://127.0.0.1:8000/timetable-api/stops"
    );
    state.foundStops = response.data.st.filter((stop) => {
      return (
        stop.nm.toLowerCase().includes(q.toLowerCase()) ||
        stop.nr.toString().includes(q)
      );
    }, 200);
  } else {
    state.foundStops = [];
  }
};

const findStopsDebounce = useDebounceFn((e) => findStops(e));

const checkStop = (stop, nr) => {
  return stop.nr === nr;
};

const saveStops = (stops) => {
  localStorage.setItem(
    "stops",
    JSON.stringify(
      Array.from(stops, (stop) => {
        return stop.nr;
      })
    )
  );
};

const refreshStops = async () => {
  if (state.stops) {
    const response = await axios.get(
      "http://127.0.0.1:8000/timetable-api/stops"
    );
    const stopNrs = Array.from(state.stops, (stop) => stop.nr);
    stopNrs.forEach((nr) => {
      const currentStop = state.stops.find((stop) => checkStop(stop, nr));
      if (currentStop) {
        const currentStopIndex = state.stops.indexOf(currentStop);
        const newStop = response.data.st.find((stop) => checkStop(stop, nr));
        state.stops[currentStopIndex] = newStop;
        state.ct = response.data.ct;
      }
    });
  } else {
    clearInterval(state.timerId);
  }
};

watch(state.stops, (newValue) => {
  saveStops(newValue);
  if (!state.timerId) {
    state.timerId = setInterval(refreshStops, 30000);
  }
});

const addStop = (nr) => {
  if (!state.stops.find((stop) => checkStop(stop, nr))) {
    state.stops.push(state.foundStops.find((stop) => checkStop(stop, nr)));
    state.foundStops = [];
    state.q = "";
  }
};

const removeStop = (nr) => {
  const stop = state.stops.find((stop) => checkStop(stop, nr));
  if (stop) {
    const stopIndex = state.stops.indexOf(stop);
    state.stops.splice(stopIndex, 1);
  }
};

onMounted(async () => {
  let stops = localStorage.getItem("stops");
  if (stops) {
    stops = JSON.parse(stops);
    const response = await axios.get(
      "http://127.0.0.1:8000/timetable-api/stops"
    );
    stops.forEach((stopNr) => {
      if (!state.stops.find((stop) => checkStop(stop, stopNr))) {
        state.stops.push(
          response.data.st.find((stop) => checkStop(stop, stopNr))
        );
      }
    });
    state.ct = response.data.ct;
    state.loading = false;
  }
});
</script>

<template>
  <header>
    <div class="search-wrapper">
      <input
        type="search"
        name=""
        id=""
        v-model="state.q"
        @input="findStopsDebounce"
        @keyup.enter="findStops"
        class="search-stops"
        placeholder="Nazwa przystanku"
      />
      <ol v-if="state.foundStops.length" class="search-results">
        <li
          v-for="stop in state.foundStops"
          :key="stop.nr"
          @click="addStop(stop.nr)"
        >
          {{ stop.nm }} ({{ stop.nr }})
        </li>
      </ol>
    </div>
    <p class="ct" v-if="state.stops.length">{{ state.ct }}</p>
  </header>

  <CustomLoader v-if="state.loading" />

  <main>
    <TimetableItem
      v-for="stop in state.stops"
      :key="stop.nr"
      :stop="stop"
      @remove-stop="removeStop"
    />
  </main>
</template>

<style lang="scss" scoped>
.ct {
  font-size: 2.75rem;
  display: flex;
  justify-content: center;
  font-family: "Orbitron", sans-serif;
  color: hsla(160, 100%, 37%, 1);
}
.search-stops {
  outline: none;
  border: 0;
  border-bottom: 2px solid var(--color-border);
  background-color: var(--color-background-soft);
  color: var(--color-text);
  height: 2rem;
  width: 100%;
  padding: 0.5rem;

  &:focus {
    border-color: hsla(160, 100%, 37%, 1);
  }
}
.search-stops:not(:focus) + .search-results:not(:hover) {
  display: none;
}

.search-results {
  position: absolute;
  z-index: 100;
  list-style-type: none;
  background-color: var(--color-background-mute);
  padding: 0.2rem 0.5rem;
  width: 100%;

  li {
    color: var(--color-heading);
    margin-block: 0.2rem;
  }
}

header {
  line-height: 1.5;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
  }
}
</style>
