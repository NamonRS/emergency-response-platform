// Medical lists have three states: null = not documented, [] = documented as none, or entries.
export function listToForm(value) {
  if (value === null || value === undefined) return { mode: 'unknown', text: '' };
  if (value.length === 0) return { mode: 'none', text: '' };
  return { mode: 'list', text: value.join('\n') };
}

export function formToList(state) {
  if (state.mode === 'unknown') return null;
  if (state.mode === 'none') return [];
  return state.text
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean);
}