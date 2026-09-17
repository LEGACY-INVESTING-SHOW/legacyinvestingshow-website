/*! tool methodology */
(function () {
  var dataEl = document.getElementById('tool-methodology-data');
  if (!dataEl) return;
  var payload;
  try { payload = JSON.parse(dataEl.textContent || '{}'); } catch (error) { return; }
  if (!payload || !payload.html) return;

  function ensure() {
    if (document.getElementById("tool-methodology")) return;
    var main = document.querySelector('main');
    if (!main) return;
    var tmp = document.createElement('div');
    tmp.innerHTML = payload.html;
    var section = tmp.firstElementChild;
    if (!section) return;
    var related = main.querySelector('section[aria-labelledby="related-heading"]');
    if (related && related.parentNode) {
      related.parentNode.insertBefore(section, related);
      return;
    }
    var host = main.firstElementChild && main.firstElementChild.tagName === 'DIV' ? main.firstElementChild : main;
    host.appendChild(section);
  }

  ensure();
  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', ensure);
  }
  var queued = null;
  var observer = new MutationObserver(function () {
    if (queued) return;
    queued = setTimeout(function () {
      queued = null;
      ensure();
    }, 80);
  });
  observer.observe(document.documentElement, { childList: true, subtree: true });
})();
