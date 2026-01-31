<script lang="ts">
  import type { Lang, Theme } from '../lib/types';
  import { t } from '../lib/i18n';

  export let lang: Lang;
  export let theme: Theme;
  export let isEditMode: boolean;
  export let onToggleLang: () => void;
  export let onToggleTheme: () => void;
  export let onDemo: () => void;
  export let onClear: () => void;
  export let onToggleEdit: () => void;
  export let onGithub: () => void;

  $: langText = lang === 'en' ? '中' : 'En';
</script>

<header>
  <div class="header-left">
    <h1>AAssistant</h1>
    <button id="github-btn" class="btn-icon" aria-label="GitHub" on:click={onGithub}>
      <i class="fab fa-github"></i>
    </button>
    <button id="lang-toggle" class="btn-icon" aria-label="Switch Language" on:click={onToggleLang}>
      <span class="lang-text">{langText}</span>
    </button>
    <button id="theme-toggle" class="btn-icon" aria-label="Toggle Theme" on:click={onToggleTheme}>
      <svg class="icon-moon" class:hidden={theme === 'dark'} viewBox="0 0 24 24">
        <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z" />
      </svg>
      <svg class="icon-sun" class:hidden={theme !== 'dark'} viewBox="0 0 24 24">
        <circle cx="12" cy="12" r="5" />
        <line x1="12" y1="1" x2="12" y2="3" />
        <line x1="12" y1="21" x2="12" y2="23" />
        <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" />
        <line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
        <line x1="1" y1="12" x2="3" y2="12" />
        <line x1="21" y1="12" x2="23" y2="12" />
        <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" />
        <line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
      </svg>
    </button>
  </div>
  <div class="header-right">
    <button id="demo-btn" on:click={onDemo}>{t(lang, 'demo')}</button>
    <button id="edit-btn" on:click={onToggleEdit}>{isEditMode ? t(lang, 'done') : t(lang, 'edit')}</button>
    <button id="clear-btn" class="btn-danger" on:click={onClear}>{t(lang, 'clear')}</button>
  </div>
</header>
