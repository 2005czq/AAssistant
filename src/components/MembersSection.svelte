<script lang="ts">
  import { t } from '../lib/i18n';
  import { getTextWidth } from '../lib/utils';
  import type { Lang } from '../lib/types';

  export let lang: Lang;
  export let members: string[] = [];
  export let onAddMember: (name: string) => void;
  export let onRemoveMember: (name: string) => void;
  export let onRenameMember: (oldName: string, newName: string) => void;

  let newMember = '';

  function handleAddMember() {
    const trimmed = newMember.trim();
    if (!trimmed) return;
    onAddMember(trimmed);
    newMember = '';
  }

  function handleMemberInput(event: Event, member: string) {
    const input = event.currentTarget as HTMLInputElement;
    const currentLen = input.value.length;
    const originalLen = member.length;
    if (currentLen > originalLen) {
      input.value = member;
      return;
    }
    input.style.width = `${getTextWidth(input.value || 'M')}px`;

    const newName = input.value.trim();
    if (newName && newName !== member && !members.includes(newName)) {
      onRenameMember(member, newName);
    }
  }

  function handleMemberBlur(event: Event, member: string) {
    const input = event.currentTarget as HTMLInputElement;
    if (!input.value.trim()) {
      onRemoveMember(member);
    }
  }
</script>

<section id="section-members" class="notebook-section">
  <div class="section-header">
    <h2>{t(lang, 'members_title')}</h2>
  </div>
  <div
    class="member-list-container"
    id="member-list-container"
    class:error-circle={members.length === 0}
  >
    {#each members as member, idx (idx)}
      <div class="member-chip">
        <input
          type="text"
          class="member-name-input"
          value={member}
          style={`width: ${getTextWidth(member)}px`}
          on:input={(event) => handleMemberInput(event, member)}
          on:blur={(event) => handleMemberBlur(event, member)}
        />
        <span
          class="delete-member"
          role="button"
          tabindex="0"
          on:click={() => onRemoveMember(member)}
          on:keydown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault();
              onRemoveMember(member);
            }
          }}
        >
          ×
        </span>
      </div>
    {/each}

    <input
      type="text"
      id="add-member-input"
      class="member-chip"
      placeholder={t(lang, 'placeholder_new_member')}
      bind:value={newMember}
      on:keydown={(event) => {
        if (event.key === 'Enter') {
          handleAddMember();
        }
      }}
      on:blur={() => handleAddMember()}
    />
  </div>
</section>
