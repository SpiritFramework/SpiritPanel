(function () {
  try {
    var pref = localStorage.getItem('spirit-theme') || 'dark';
    var resolved = pref;
    if (pref === 'system') {
      resolved =
        window.matchMedia && window.matchMedia('(prefers-color-scheme: light)').matches ? 'light' : 'dark';
    }
    document.documentElement.dataset.theme = resolved;
  } catch (e) {
    document.documentElement.dataset.theme = 'dark';
  }
})();
