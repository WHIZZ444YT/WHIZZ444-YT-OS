(() => {
  const root = document.getElementById('personal-reminders');
  if (!root) return;
  const key = 'ictfos.personalEvents.v1';
  const form = root.querySelector('form');
  const list = root.querySelector('ul');
  const status = root.querySelector('[role=status]');
  const read = () => {
    const rows = JSON.parse(localStorage.getItem(key) || '[]');
    if (!Array.isArray(rows)) throw new Error('Existing reminders could not be read.');
    return rows;
  };
  const write = rows => localStorage.setItem(key, JSON.stringify(rows));

  function render() {
    list.replaceChildren(...read().map(row => {
      const li = document.createElement('li');
      li.textContent = [row.event, row.scheduledLocalDate || row.date, row.time, (row.markets || []).join(', ')]
        .filter(Boolean).join(' · ') + ' ';
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = 'Remove';
      remove.setAttribute('aria-label', 'Remove ' + row.event);
      remove.onclick = () => {
        try {
          write(read().filter(item => item.id !== row.id));
          render();
          status.textContent = 'Reminder removed.';
          (list.querySelector('button') || form.elements.event).focus();
        } catch { status.textContent = 'Could not update device storage.'; }
      };
      li.append(remove);
      return li;
    }));
    if (!list.children.length) list.textContent = 'No personal reminders saved.';
  }

  form.addEventListener('submit', event => {
    event.preventDefault();
    const values = new FormData(form);
    const name = String(values.get('event')).trim();
    if (!name) { status.textContent = 'Enter a reminder name.'; return; }
    const date = values.get('date'), time = values.get('time'), market = values.get('market');
    try {
      const source = values.get('source') ? new URL(values.get('source')) : null;
      if (source && !['https:', 'http:'].includes(source.protocol)) throw new Error('Use an HTTP or HTTPS source URL.');
      const rows = read();
      rows.push({ id: crypto.randomUUID(), event: name, date, time: time ? time + ' ET' : 'Time not set',
        scheduledLocalDate: date, scheduledLocalTime: time || null, timezone: 'America/New_York',
        markets: market ? [market.toUpperCase()] : [], source: source?.href || '', status: 'personal' });
      write(rows);
      form.reset();
      render();
      status.textContent = 'Reminder saved on this device.';
    } catch (error) { status.textContent = 'Could not save. ' + error.message; }
  });
  try { render(); form.hidden = false; } catch { status.textContent = 'Device reminders could not be read.'; }
})();
