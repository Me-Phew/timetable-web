<script setup>
import { onMounted, reactive, watch, computed } from "vue";
import TimetableItem from "./components/TimetableItem.vue";
import CustomLoader from "@/components/CustomLoader.vue";
import axios from "axios";
import { useDebounceFn, useThrottleFn, usePermission } from "@vueuse/core";
import { getToken, onMessage } from "firebase/messaging";
import messaging from '@/firebase.js';

const state = reactive({
  stops: [],
  foundStops: [],
  ct: "",
  timerId: null,
  loading: true,
  refreshing: false,
  q: "",
  trackedStopNum: null,
  trackedBusNum: null,
  showNotificationMessage: false,
  notificationsState: null,
  serviceWorkerSupported: null,
  pushMessagingSupported: null,
  fetchError: false,
  fcmToken: null,
  notificationsStatus: 'ok',
});

const getStops = async () => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}stops`
    );
    return response.data;
  } catch (error) {
    state.loading = false;
    state.fetchError = true;
  }
};

const findStops = async (e) => {
  const q = e.target.value;
  if (q) {
    const data = await getStops();
    state.foundStops = data.st.filter((stop) => {
      return (
        stop && (stop.nm.toLowerCase().includes(q.toLowerCase()) ||
          stop.nr.toString().includes(q))
      );
    }, 200);
  } else {
    state.foundStops = [];
  }
};

const findStopsDebounce = useDebounceFn((e) => findStops(e));

const checkStop = (stop, nr) => {
  return stop && (parseInt(stop.nr) === parseInt(nr));
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

const loadStops = async () => {
  state.refreshing = true;

  let stops = localStorage.getItem("stops");
  if (stops) {
    stops = JSON.parse(stops);
    if (stops.length) {
      const data = await getStops();
      if (data && data.ct && data.st.length) {
        stops.forEach((stopNr) => {
          if (!state.stops.find((stop) => checkStop(stop, stopNr))) {
            state.stops.push(data.st.find((stop) => checkStop(stop, stopNr)));
          }
        });
        state.ct = data.ct;
        state.fetchError = false;
      }
    }
  }
  state.loading = false;
  state.refreshing = false;
}

const loadStopsThrottled = useThrottleFn(loadStops, 2000);

const loadActiveTrackingSession = async (fcmToken) => {
  try {
    const response = await axios.get(
      `${import.meta.env.VITE_API_URL}tracking-service/active-session/${fcmToken}`,
    );

    const { data } = response;

    state.trackedStopNum = parseInt(data.stop_number);
    state.trackedBusNum = parseInt(data.bus_number);

  } catch (error) {
    if (!(error.response && error.response.status === 404 && error.response.data && error.response.data.detail === "Did not find an active tracking session associated to provided token")) {
      throw error;
    }
  }
}


onMounted(async () => {
  state.serviceWorkerSupported = 'serviceWorker' in navigator;
  state.pushMessagingSupported = 'PushManager' in window;
  state.showNotificationMessage = JSON.parse(localStorage.getItem('showNotificationMessage'));

  await loadStops();

  if (state.serviceWorkerSupported && state.pushMessagingSupported) {
    try {
      navigator.serviceWorker.ready.then(async (registration) => {
        if (!(registration instanceof ServiceWorkerRegistration)) {
          console.log(`${registration} did not pass`);
          throw new Error('Service worker was not registered');
        } else {
          console.log(`${registration} passed`);
        }

        const currentToken = await getToken(messaging, {
          vapidKey: "BIfMAYaSmkalPqzNUQlRRhfIhqryMV79098ZzXjcdFBlAyxa1DSjzzvP_KkdHvf1V20U2DRo7eMQ-C6JmIx5UTg",
          serviceWorkerRegistration: registration,
        });
        if (currentToken) {
          state.notificationsState = 'success';
          state.fcmToken = currentToken;

          onMessage(messaging, () => {
            refreshStops();
          });

          await loadActiveTrackingSession(currentToken);
        } else {
          console.error('An error occurred while retrieving token.', 'The getToken function did not return a token');
          state.notificationsState = 'error';
        }
      });
    } catch (err) {
      console.error('An error occurred while retrieving token.', err);
      state.notificationsState = 'error';
    }
  }
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

  if (!stop) return null;


  const trackedStopBuses = stop.sd;

  const line = trackedStopBuses.find((bus) => {
    return parseInt(bus.li) === state.trackedBusNum;
  });

  if (!line) return null;

  const departure = line.de;

  if (departure.includes(":")) {
    const hours = parseInt(departure.split(":")[0]);
    const minutes = parseInt(departure.split(":")[1]);

    const now = new Date();
    const departureTime = new Date().setHours(hours, minutes);

    return getMinDiff(departureTime, now);
  } else {
    return parseInt(departure.split("min")[0]);
  }
});

watch(trackedBusEta, async (newValue) => {
  if (!newValue) {
    state.trackedStopNum = null;
    state.trackedBusNum = null;
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
});
</script>

<template>
  <div class="message-box notifications-enabled"
    v-if="notificationsPermission === 'granted' && state.showNotificationMessage && state.notificationsState === 'success'">
    <i class="ph-x" @click="hideNotificationsMessage"></i>
    <p>Powiadomienia włączone</p>
    <i class="ph-bell-simple-ringing-fill"></i>
  </div>
  <div class="message-box notifications-disabled" v-else-if="notificationsPermission != 'granted'">
    <i class="ph-bell-simple-slash-fill"></i>
    <p>Powiadomienia wyłączone</p>
    <i class="ph-warning-octagon-fill"></i>
  </div>
  <div class="message-box notifications-error" v-else-if="state.notificationsState === 'error'">
    <i class="ph-bell-simple-slash-fill"></i>
    <p>Powiadomienia wyłączone - wystąpił błąd</p>
    <i class="ph-warning-octagon-fill"></i>
  </div>
  <div class="message-box notifications-error" v-else-if="!state.serviceWorkerSupported">
    <i class="ph-bell-simple-slash-fill"></i>
    <p>Powiadomienia wyłączone - service worker nie jest obsługiwany w tej przeglądarce</p>
    <i class="ph-warning-octagon-fill"></i>
  </div>
  <div class="message-box notifications-error" v-else-if="!state.pushMessagingSupported">
    <i class="ph-bell-simple-slash-fill"></i>
    <p>Powiadomienia wyłączone - Powiadomienia push nie są obsługiwane w tej przeglądarce</p>
    <i class="ph-warning-octagon-fill"></i>
  </div>
  <header>
    <div class="search-wrapper">
      <input type="search" v-model="state.q" @input="findStopsDebounce" @keyup.enter="findStops"
        class="search-stops" placeholder="Nazwa przystanku" :disabled="state.fetchError" />
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
    <div class="eta-wrapper">
      <p class="eta" v-if="trackedBusEta">
        ETA:&nbsp;<span :class="{ 'move-animation': trackedBusEta === '>>' }">{{
          trackedBusEta
        }}</span>&nbsp;<span v-if="trackedBusEta !== '>>'">MIN</span>
      </p>
      <i class="ph-bell-ringing-light" v-if="state.notificationsStatus === 'ok' && trackedBusEta"></i>
      <i class="ph-bell-slash-light" v-else-if="trackedBusEta"></i>
    </div>
  </header>

  <CustomLoader v-if="state.loading" />

  <main>
    <div class="no-stops" v-if="!state.stops.length && !state.loading && !state.fetchError">
      <i class="ph-placeholder-light"></i>
      <p>Brak przystanków</p>
    </div>
    <div class="stops-wrapper" v-if="!state.fetchError">
      <TimetableItem v-for="stop in state.stops" :key="stop.nr" :stop="stop" @remove-stop="removeStop"
        v-model:tracked-stop-num="state.trackedStopNum" v-model:tracked-bus-num="state.trackedBusNum"
        v-model:notifications-status="state.notificationsStatus" :fcm-token="state.fcmToken" />
    </div>
    <div v-if="state.fetchError" class="fetch-error">
      <i class="ph-circle-wavy-warning-light"></i>
      <p>Wystąpił błąd przy pobieraniu danych</p>
      <i class="ph-arrow-clockwise-light" @click="loadStopsThrottled"
        :class="state.refreshing ? 'refreshing' : ''"></i>
    </div>
  </main>
</template>

<style lang="scss" scoped>
.stops-wrapper {
  @media only screen and (min-width: 1300px) {
    display: grid;
    grid-template-columns: repeat(3, 1fr);
  }
}

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

.notifications-disabled,
.notifications-error {
  background-color: #46212A;
  color: #D03A52;
}

.no-stops,
.fetch-error {
  margin-top: 1rem;
  font-size: 1.5rem;

  .ph-placeholder-light {
    font-size: 5rem;
    display: flex;
    align-items: center;
    justify-content: center;
  }
}

.fetch-error {
  display: flex;
  align-items: center;
  gap: 1rem;
  color: crimson;

  i {
    font-size: 2rem;
  }
}

.ct,
.fetch-error {
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

.ct {
  font-size: 2rem;
  display: flex;
  flex-direction: column;
  justify-content: center;
  align-items: center;
  width: 250px;
}

.eta span {
  font-family: "Orbitron", sans-serif;
}

.eta-wrapper {
  display: flex;
  flex-direction: column;
  align-items: center;

  i {
    font-size: 2rem;
    background-color: var(--color-background-soft);
    padding: .5rem;
    border-radius: .375rem;

    &.ph-bell-ringing-light {
      color: hsl(160, 100%, 37%);
    }

    &.ph-bell-slash-light {
      color: red;
    }
  }
}

.eta {
  font-size: 2.75rem;
  display: flex;
  justify-content: center;
  color: hsla(160, 100%, 37%, 1);

  @keyframes move-animation {
    0% {
      transform: translateX(-25%);
    }

    50% {
      transform: translateX(25%);
    }

    100% {
      transform: translateX(-25%);
    }
  }

  .move-animation {
    padding: 0 1rem;
    animation: move-animation 2s infinite;
  }
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
    cursor: pointer;

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
