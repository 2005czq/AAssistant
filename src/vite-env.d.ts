/// <reference types="vite/client" />
import type { agentApi } from './lib/api';

declare global {
  interface Window {
    readonly aassistant: typeof agentApi;
  }
}
