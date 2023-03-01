<script setup>
import axios from "axios";
import { computed } from "vue";

const props = defineProps({
  stop: Object,
  trackedStopNum: Number,
  trackedBusNum: Number,
  fcmToken: String,
});

const emit = defineEmits([
  "remove-stop",
  "update:tracked-bus-num",
  "update:tracked-stop-num",
  "update:notifications-status",
]);

const stopIsCurrentlyTracked = computed(() => {
  return parseInt(props.trackedStopNum) === parseInt(props.stop.nr);
});

const updateTracking = async (busNum, busIsCurrentlyTracked) => {
  if (stopIsCurrentlyTracked.value && busIsCurrentlyTracked) {
    emit("update:tracked-stop-num", null);
    emit("update:tracked-bus-num", null);

    if (props.fcmToken) {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}tracking-service/cancel-tracking`,
          {
            "fcm_token": props.fcmToken,
            "tracking_info": {
              "stop_number": props.stop.nr,
              "bus_number": busNum,
            }
          }
        );

        if (response.status === 200) {
          emit('update:notifications-status', 'ok');
        } else {
          emit('update:notifications-status', 'fail');
        }
      } catch (error) {
        emit('update:notifications-status', 'fail');
        throw error;
      }
    }
  } else {
    emit("update:tracked-stop-num", parseInt(props.stop.nr));
    emit("update:tracked-bus-num", busNum);

    if (props.fcmToken) {
      try {
        const response = await axios.post(
          `${import.meta.env.VITE_API_URL}tracking-service/request-tracking`,
          {
            "fcm_token": props.fcmToken,
            "tracking_info": {
              "stop_number": props.stop.nr,
              "bus_number": busNum,
            }
          }
        );

        if (response.status === 200) {
          emit('update:notifications-status', 'ok');
        } else {
          emit('update:notifications-status', 'fail');
        }
      } catch (error) {
        emit('update:notifications-status', 'fail');
        throw error;
      }
    }
  }
};
</script>

<template>
  <div class="wrapper">
    <div class="header">
      <p>
        <span class="stop-name">{{ stop.nm }}</span> ({{ stop.nr }})
      </p>
      <i class="ph-x" @click="$emit('removeStop', stop.nr)"></i>
    </div>
    <table v-if="stop.sd">
      <thead>
        <th>Linia</th>
        <th>Kierunek</th>
        <th>Odjazd</th>
      </thead>
      <tbody>
        <tr v-for="(line, index) in stop.sd" :key="index"
          :class="{ tracked: stopIsCurrentlyTracked && parseInt(line.li) === props.trackedBusNum }"
          @click="updateTracking(parseInt(line.li), parseInt(line.li) === props.trackedBusNum)">
          <td class="line">{{ line.li }}</td>
          <td class="destination">{{ line.di }}</td>
          <td class="departure" v-if="line.de" :class="{ 'move-animation': line.de === '>>' }">
            <span>{{ line.de }}</span>
          </td>
          <td class="departure" v-else>?</td>
        </tr>
      </tbody>
    </table>
    <div class="no-buses" v-else>
      <p>Brak autobusów</p>
    </div>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  background-color: var(--color-background-soft);
  padding: 1rem;
  border-radius: 0.375rem;
  margin: 0.5rem;

  .no-buses {
    display: flex;
    flex-direction: column;
    align-items: center;
    padding: 1rem;

    p {
      font-size: 1.2rem;
      font-weight: 500;
    }
  }

  .header {
    display: grid;
    grid-template-columns: auto 2fr;
    align-items: center;

    .stop-name {
      text-transform: uppercase;
      font-weight: bold;
      color: hsla(160, 100%, 37%, 1);
    }

    i {
      justify-self: flex-end;
      font-size: 1.5rem;
      color: red;
      cursor: pointer;
    }
  }

  table {
    width: 100%;

    th {
      background-color: var(--color-background-mute);
      color: var(--color-heading);
      text-align: left;
      font-weight: 900;
    }

    th,
    td {
      border: 2px solid var(--color-border);
      padding: 0.375rem;
    }

    tr {
      cursor: pointer;
    }

    tr.tracked td {
      color: hsla(160, 100%, 37%, 1);
    }
  }

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

  .line,
  .departure {
    text-align: center;
  }

  .departure.move-animation span {
    display: inline-block;
    width: 100%;
    animation: move-animation 2s infinite;
  }
}
</style>
