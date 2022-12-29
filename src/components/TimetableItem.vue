<script setup>
import { computed } from "vue";

const props = defineProps({
  stop: Object,
  trackedStopNum: String,
  trackedBusIndex: Number,
});

const emit = defineEmits([
  "removeStop",
  "update:trackedStopNum",
  "update:trackedBusIndex",
]);

const isCurrentlyTracked = computed(() => {
  return props.trackedStopNum === props.stop.nr;
});

const updateTracking = (index) => {
  if (isCurrentlyTracked.value && props.trackedBusIndex === index) {
    emit("update:trackedStopNum", null);
    emit("update:trackedBusIndex", null);
  } else {
    emit("update:trackedStopNum", props.stop.nr);
    emit("update:trackedBusIndex", index);
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
    <table>
      <thead>
        <th>Linia</th>
        <th>Kierunek</th>
        <th>Odjazd</th>
      </thead>
      <tbody>
        <tr v-for="(line, index) in stop.sd" :key="line.li"
          :class="{ tracked: isCurrentlyTracked && index === trackedBusIndex }"
          @click="updateTracking(index)">
          <td class="line">{{ line.li }}</td>
          <td class="destination">{{ line.di }}</td>
          <td class="departure" v-if="line.de" :class="{ 'move-animation': line.de === '>>' }">
            <span>{{ line.de }}</span>
          </td>
          <td v-else>-</td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<style lang="scss" scoped>
.wrapper {
  background-color: var(--color-background-soft);
  padding: 1rem;
  border-radius: 0.375rem;
  margin: 0.5rem;

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
