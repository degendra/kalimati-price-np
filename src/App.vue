<script setup lang="ts">
import Home from './components/Home.vue'
</script>

<template>
  <header>
    <h1>Kalimati Market Prices</h1>
  </header>

  <main>
    <Home />
  </main>
</template>

<style>
header {
  background: #f8f9fa;
  padding: 1rem;
  text-align: center;
  box-shadow: 0 2px 4px rgba(0,0,0,0.1);
}

h1 {
  margin: 0;
  font-size: 1.5rem;
  color: #333;
}
</style>
