import './app.css';
import App from './App.svelte';
import { aassistant, initializeLedger } from './lib/api';

const target = document.getElementById('app');
if (!target) throw new Error('App target element not found');

initializeLedger();
new App({ target });
Object.defineProperty(window, 'aassistant', { value: aassistant, configurable: true });
