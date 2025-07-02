<template>
  <div class="row p-0 m-0 vh-100">
    <div class="col-3 p-0 h-100">
      <SidebarComponent />
    </div>
    <div class="col-9 p-0">
      <!-- <CpmViews /> -->
    </div>
  </div>
</template>

<script>
import SidebarComponent from './components/SidebarComponent.vue';
// import CpmViews from './views/CpmViews.vue';

export default {
  name: 'App',
  components: {
    SidebarComponent,
    // CpmViews
  }
}
</script>

<style></style>
