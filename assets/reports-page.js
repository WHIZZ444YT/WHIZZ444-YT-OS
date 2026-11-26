(() => {
  const filters = document.getElementById('reportFilters');
  if (!filters) return;

  const topic = document.getElementById('reportTopic');
  const publisher = document.getElementById('reportPublisher');
  const result = document.getElementById('reportResult');
  const reports = [...document.querySelectorAll('[data-report-topic]')];

  function updateReports() {
    let visible = 0;
    for (const report of reports) {
      const matches = (!topic.value || report.dataset.reportTopic === topic.value)
        && (!publisher.value || report.dataset.reportPublisher === publisher.value);
      report.hidden = !matches;
      if (matches) visible += 1;
    }
    result.textContent = visible
      ? `${visible} of ${reports.length} sources`
      : 'No sources match these filters. Choose another topic or publisher.';
  }

  filters.addEventListener('change', updateReports);
  filters.hidden = false;
  updateReports();
})();
