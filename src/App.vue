<script setup>
import { onMounted, reactive, watch, computed } from "vue";
import TimetableItem from "./components/TimetableItem.vue";
import CustomLoader from "@/components/CustomLoader.vue";
import axios from "axios";
import { useDebounceFn, useThrottleFn, useWebNotification, usePermission } from "@vueuse/core";

const state = reactive({
  stops: [],
  foundStops: [],
  ct: "",
  timerId: null,
  loading: true,
  refreshing: false,
  q: "",
  trackedStopNum: null,
  showNotificationMessage: false,
  serviceWorkerReady: false,
});

const getStops = async () => {
  try {
    const response = await axios.get(
      "https://dripsiaga.pl/timetable-api/stops"
    );
    return response.data;
  } catch (error) {
    state.loading = false;
    throw error;
  }
};

const findStops = async (e) => {
  const q = e.target.value;
  if (q) {
    const data = await getStops();
    state.foundStops = data.st.filter((stop) => {
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
  state.refreshing = true;
  if (state.stops) {
    const data = await getStops();
    const stopNrs = Array.from(state.stops, (stop) => stop.nr);
    stopNrs.forEach((nr) => {
      const currentStop = state.stops.find((stop) => checkStop(stop, nr));
      if (currentStop) {
        const currentStopIndex = state.stops.indexOf(currentStop);
        const newStop = data.st.find((stop) => checkStop(stop, nr));
        state.stops[currentStopIndex] = newStop;
        state.ct = data.ct;
      }
    });
  } else {
    clearInterval(state.timerId);
  }

  if (state.serviceWorkerReady) {
    console.log('Sending STOPS_SYNC event: ', JSON.parse(JSON.stringify(state.stops)));
    navigator.serviceWorker.controller.postMessage({
      type: 'STOPS_SYNC',
      stops: JSON.parse(JSON.stringify(state.stops)),
    });
  } else {
    console.log('Skipping STOPS_SYNC event: servie worker is not ready yet');
  }
  state.refreshing = false;
};

const refreshStopsThrottled = useThrottleFn(refreshStops, 2000);

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
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.ready.then(() => {
      state.serviceWorkerReady = true;
    });
    console.log('SYNC events enabled: service worker is ready');
  } else {
    console.log('Disabling all SYNC events: service worker is not supported in this browser');
    state.serviceWorkerUnsupported
  }

  state.showNotificationMessage = JSON.parse(localStorage.getItem('showNotificationMessage'));
  let stops = localStorage.getItem("stops");
  if (stops) {
    stops = JSON.parse(stops);
    if (stops.length) {
      const data = await getStops();
      stops.forEach((stopNr) => {
        if (!state.stops.find((stop) => checkStop(stop, stopNr))) {
          state.stops.push(data.st.find((stop) => checkStop(stop, stopNr)));
        }
      });
      state.ct = data.ct;
    }
  }
  state.loading = false;
});

const getMinDiff = (startDate, endDate) => {
  const msInMinute = 60 * 1000;

  return Math.round(Math.abs(endDate - startDate) / msInMinute);
};

const trackedBusEta = computed(() => {
  if (!state.stops || !state.trackedStopNum) return null;

  const stop = state.stops.find((stop) =>
    checkStop(stop, state.trackedStopNum)
  );

  const trackedBus = stop.sd;

  const line = trackedBus[state.trackedBusIndex];

  const departure = line.de;

  if (departure.includes(":")) {
    const hours = parseInt(departure.split(":")[0]);
    const minutes = parseInt(departure.split(":")[1]);

    const now = new Date();
    const departureTime = new Date().setHours(hours, minutes);

    return getMinDiff(departureTime, now);
  } else {
    return departure.split("min")[0];
  }
});

const showNotification = (title) => {
  const {
    isSupported,
    // notification,
    show,
    // close,
    // onClick,
    // onShow,
    // onError,
    // onClose,
  } = useWebNotification({
    title,
    dir: "auto",
    lang: "en",
    renotify: true,
    tag: "eta_alert",
  });

  if (isSupported.value) show();
};

watch(trackedBusEta, (newValue) => {
  if (newValue) {
    if (
      (newValue < 30 && newValue % 10 === 0) ||
      (newValue <= 15 && newValue % 5 === 0)
    ) {
      showNotification(`ETA: ${newValue} MIN`);
    }
  }
});

const hideNotificationsMessage = () => {
  state.showNotificationMessage = false;
  localStorage.setItem('showNotificationMessage', JSON.stringify(state.showNotificationMessage));
}

const notificationsPermission = usePermission('notifications');

watch(notificationsPermission, (newValue) => {
  if (newValue === 'prompt') {
    Notification.requestPermission();
  }
  if (newValue !== 'granted') {
    state.showNotificationMessage = true;
    localStorage.setItem('showNotificationMessage', JSON.stringify(state.showNotificationMessage));
  }
})
</script>

<template>
  <div class="message-box notifications-enabled"
    v-if="notificationsPermission === 'granted' && state.showNotificationMessage">
    <i class="ph-x" @click="hideNotificationsMessage"></i>
    <p>Powiadomienia włączone</p>
    <i class="ph-bell-simple-ringing-fill"></i>
  </div>
  <div class="message-box notifications-disabled" v-else-if="notificationsPermission != 'granted'">
    <i class="ph-bell-simple-slash-fill"></i>
    <p>Powiadomienia wyłączone</p>
    <i class="ph-warning-octagon-fill"></i>
  </div>
  <header>
    <div class="search-wrapper">
      <input type="search" v-model="state.q" @input="findStopsDebounce" @keyup.enter="findStops"
        class="search-stops" placeholder="Nazwa przystanku" />
      <ol v-if="state.foundStops.length" class="search-results">
        <li v-for="stop in state.foundStops" :key="stop.nr" @click="addStop(stop.nr)"
          :class="state.stops.find((s) => checkStop(s, stop.nr)) ? 'added' : 'not-added'">
          {{ stop.nm }} ({{ stop.nr }})
        </li>
      </ol>
    </div>
    <p class="ct" v-if="state.stops.length">
      <span>{{ state.ct }}</span>
      <i class="ph-arrow-clockwise-light" @click="refreshStopsThrottled"
        :class="state.refreshing ? 'refreshing' : ''"></i>
    </p>
    <p class="eta" v-if="trackedBusEta">
      ETA:&nbsp;<span>{{ trackedBusEta }}</span>&nbsp;MIN
    </p>
  </header>

  <CustomLoader v-if="state.loading" />

  <main>
    <div class="no-stops" v-if="!state.stops.length && !state.loading">
      <i class="ph-placeholder-light"></i>
      <p>Brak przystanków</p>
    </div>
    <TimetableItem v-for="stop in state.stops" :key="stop.nr" :stop="stop"
      v-model:trackedStopNum="state.trackedStopNum" v-model:trackedBusIndex="state.trackedBusIndex"
      @remove-stop="removeStop" />
  </main>
</template>

<style lang="scss" scoped>
.message-box {
  display: flex;
  flex-direction: row;
  gap: 1rem;
  align-items: center;
  justify-content: space-around;
  border: 1px solid;
  border-radius: .375rem;
  padding: 1rem 2rem;
  font-size: clamp(.8rem, 4vw, 1.2rem);

  i {
    font-size: clamp(1rem, 8vw, 2rem);
  }

  .ph-x {
    cursor: pointer;
  }
}

.notifications-enabled {
  background-color: #1D3734;
  color: #2A947D;

}

.notifications-disabled {
  background-color: #46212A;
  color: #D03A52;
}

.no-stops {
  margin-top: 1rem;
  font-size: 1.5rem;

  .ph-placeholder-light {
    font-size: 5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.ct {
  font-size: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 250px;

  span {
    font-size: 2.75rem;
    font-family: "Orbitron", sans-serif;
    color: hsla(160, 100%, 37%, 1);
  }

  @keyframes spin {
    from {
      transform: rotate(0deg);
    }

    to {
      transform: rotate(360deg);
    }
  }

  i {
    cursor: pointer;

    &.refreshing {
      animation: spin infinite 500ms linear;
    }
  }
}

.eta span {
  font-family: "Orbitron", sans-serif;
}

.eta {
  font-size: 2.75rem;
  display: flex;
  justify-content: center;
  color: hsla(160, 100%, 37%, 1);
}

.search-wrapper {
  max-width: 300px;
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

.search-stops:not(:focus)+.search-results:not(:hover) {
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

    &.added {
      color: hsla(160, 100%, 37%, 1);
    }
  }
}

header {
  line-height: 1.5;
  width: 100%;
  display: flex;
  flex-direction: column;
  place-items: center;
}
</style>
