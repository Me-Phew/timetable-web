<script setup>
defineProps({
  stop: Object,
});
</script>

<template>
  <div class="wrapper">
    <p>{{ stop.nm }} ({{ stop.nr }})</p>
    <table>
      <thead>
        <th>Linia</th>
        <th>Kierunek</th>
        <th>Odjazd</th>
      </thead>
      <tbody>
        <tr v-for="line in stop.sd" :key="line.li">
          <td>{{ line.li }}</td>
          <td>{{ line.di }}</td>
          <td>{{ line.de }}</td>
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

  th {
    color: hsla(160, 100%, 37%, 1);
  }
}
</style>
