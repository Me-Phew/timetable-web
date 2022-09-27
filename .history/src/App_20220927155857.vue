<script setup>
import { onMounted, ref } from "vue";
import Timetable from "./components/Timetable.vue";
import axios from "axios";

const stops = ref(null);

onMounted(async () => {
  stops.value = await axios.get('https://www.mpk.nowysacz.pl/jsonStops/stops.json');
})
</script>

<template>
  <header>
    {{ stops }}
  </header>

  <main>
    <Timetable />
  </main>
</template>

<style scoped>
header {
  line-height: 1.5;
}

.logo {
  display: block;
  margin: 0 auto 2rem;
}

@media (min-width: 1024px) {
  header {
    display: flex;
    place-items: center;
    padding-right: calc(var(--section-gap) / 2);
  }

  .logo {
    margin: 0 2rem 0 0;
  }

  header .wrapper {
    display: flex;
    place-items: flex-start;
    flex-wrap: wrap;
  }
}
</style>
