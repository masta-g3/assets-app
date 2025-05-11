import { mount } from 'svelte';
import './app.css';
import App from './App.svelte';

// Import Chart.js and the annotation plugin
import { Chart } from 'chart.js/auto';
import AnnotationPlugin from 'chartjs-plugin-annotation';

// Register the plugin globally
Chart.register(AnnotationPlugin);

const app = mount(App, {
  target: document.getElementById('app')!,
});

export default app;