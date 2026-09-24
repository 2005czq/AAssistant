<script lang="ts">
  import Button from './Button.svelte';
  import Moon from 'lucide-svelte/icons/moon';
  import Sun from 'lucide-svelte/icons/sun';
  import Bot from 'lucide-svelte/icons/bot';
  import BookOpen from 'lucide-svelte/icons/book-open';
  import CirclePlay from 'lucide-svelte/icons/circle-play';
  import CirclePause from 'lucide-svelte/icons/circle-pause';
  import type { Lang, Theme } from '../lib/types';
  import { t } from '../lib/i18n';
  import { GITHUB_URL } from '../lib/constants';

  export let lang: Lang;
  export let theme: Theme;
  export let animations: boolean;
  export let onToggleLang: () => void;
  export let onToggleTheme: () => void;
  export let onToggleAnimations: () => void;
  export let onDemo: () => void;
</script>

<header class="workspace-header">
    <div class="brand">
      <h1><a href={GITHUB_URL} target="_blank" rel="noopener noreferrer">AAssistant</a></h1>
      <p>{t(lang, 'brand_tagline')}</p>
    </div>
    <div class="app-controls">
      <Button id="agent-guide-btn" class="btn-icon" aria-label={t(lang, 'agent_guide')} title={t(lang, 'agent_guide')}
        on:click={() => window.open('./SKILL.md', '_blank', 'noopener,noreferrer')}><Bot size={20} aria-hidden="true" /></Button>
      <Button id="lang-toggle" class="btn-icon" aria-label={t(lang, 'switch_language')} title={t(lang, 'switch_language')} on:click={onToggleLang}>
        <span>{lang === 'en' ? '中' : 'En'}</span>
      </Button>
      <Button id="theme-toggle" class="btn-icon" aria-label={t(lang, 'toggle_theme')} title={t(lang, 'toggle_theme')} on:click={onToggleTheme}>
        {#if theme === 'dark'}<Sun aria-hidden="true" />{:else}<Moon aria-hidden="true" />{/if}
      </Button>
      <Button id="animation-toggle" class="btn-icon" aria-label={t(lang, animations ? 'disable_animations' : 'enable_animations')}
        title={t(lang, animations ? 'disable_animations' : 'enable_animations')} aria-pressed={animations}
        on:click={onToggleAnimations}>
        {#if animations}<CirclePause size={20} aria-hidden="true" />{:else}<CirclePlay size={20} aria-hidden="true" />{/if}
      </Button>
    </div>
  <div class="header-actions" role="group" aria-label={t(lang, 'ledger_tools')}>
    <Button id="demo-btn" on:click={onDemo}><BookOpen size={18} aria-hidden="true" />{t(lang, 'demo')}</Button>
  </div>
</header>
