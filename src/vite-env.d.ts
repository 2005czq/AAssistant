/// <reference types="vite/client" />
import type { aassistant } from './lib/api';

declare global {
  interface Window {
    readonly aassistant: typeof aassistant;
  }
}
