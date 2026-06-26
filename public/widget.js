// VouchRank embeddable reviews widget — standalone, dependency-free.
// Usage: <script src=".../widget.js" data-location="<id>" data-api="<widget-reviews-url>"
//                data-theme="dark|light" data-layout="grid|carousel" [data-target="elId"] async></script>
// Renders a location's public reviews into an auto-created container after the
// script tag (or into #data-target if provided). Never throws into the host page.
(function () {
  'use strict';

  var SELF = document.currentScript;
  if (!SELF) return;

  var locationId = SELF.getAttribute('data-location');
  var api = SELF.getAttribute('data-api');
  var theme = SELF.getAttribute('data-theme') === 'light' ? 'light' : 'dark';
  var layout = SELF.getAttribute('data-layout') === 'carousel' ? 'carousel' : 'grid';

  if (!locationId || !api) {
    console.warn('[vouchrank] widget.js: data-location and data-api are required.');
    return;
  }

  var target = null;
  var targetId = SELF.getAttribute('data-target');
  if (targetId) target = document.getElementById(targetId);
  if (!target) {
    target = document.createElement('div');
    SELF.parentNode.insertBefore(target, SELF.nextSibling);
  }
  if (target.getAttribute('data-vr-rendered') === '1') return;

  var P = theme === 'light'
    ? { bg: '#f9fafb', card: '#ffffff', border: '#e5e7eb', text: '#374151', strong: '#111827', muted: '#6b7280' }
    : { bg: '#0c0d12', card: 'rgba(17,18,27,0.9)', border: 'rgba(255,255,255,0.06)', text: '#e5e7eb', strong: '#ffffff', muted: '#9ca3af' };

  function esc(s) {
    return String(s == null ? '' : s).replace(/[&<>"']/g, function (c) {
      return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c];
    });
  }

  function stars(n) {
    var out = '';
    var v = Number(n) || 0;
    for (var i = 0; i < 5; i++) {
      var on = i < v;
      out += '<svg width="12" height="12" viewBox="0 0 24 24" style="vertical-align:middle" fill="' +
        (on ? '#fbbf24' : 'none') + '" stroke="' + (on ? '#fbbf24' : P.muted) +
        '" stroke-width="2"><polygon points="12 2 15 9 22 9 16 14 18 22 12 17 6 22 8 14 2 9 9 9"/></svg>';
    }
    return out;
  }

  function fmtDate(iso) {
    if (!iso) return '';
    try { return new Date(iso).toLocaleDateString(); } catch { return ''; }
  }

  function initials(r) {
    if (r.avatar) return r.avatar;
    return r.author ? r.author.slice(0, 2).toUpperCase() : '?';
  }

  function card(r, accent) {
    var badge = r.source ? '<span style="font-size:9px;font-weight:600;padding:2px 6px;border-radius:20px;border:1px solid ' +
      P.border + ';color:' + P.muted + ';text-transform:capitalize">' + esc(r.source) + '</span>' : '';
    var video = r.videoUrl ? '<div style="margin-top:6px;font-size:10px;color:' + accent + '">🎥 Video testimonial</div>' : '';
    return '<div style="flex:0 0 280px;max-width:340px;background:' + P.card + ';border:1px solid ' + P.border +
      ';border-radius:12px;padding:16px;color:' + P.text + ';box-sizing:border-box">' +
        '<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:8px">' +
          '<div style="display:flex;align-items:center;gap:8px">' +
            '<div style="width:32px;height:32px;border-radius:50%;background:' + accent +
            ';color:#fff;display:flex;align-items:center;justify-content:center;font-size:12px;font-weight:600">' +
              esc(initials(r)) + '</div>' +
            '<div><div style="font-size:13px;font-weight:600;color:' + P.strong + '">' + esc(r.author || 'Customer') + '</div>' +
              '<div style="font-size:9px;color:' + P.muted + '">' + esc(fmtDate(r.created_at)) + '</div></div>' +
          '</div>' + badge +
        '</div>' +
        '<div style="margin-bottom:6px">' + stars(r.rating) + '</div>' +
        '<p style="font-size:12px;line-height:1.5;margin:0;font-style:italic">' + esc(r.text || '') + '</p>' + video +
      '</div>';
  }

  function render(data) {
    var loc = data.location || {};
    // Escape the accent: it lands in inline style="…" attributes, so an
    // unescaped value could break out and inject markup. esc() neutralizes quotes.
    var accent = esc((loc.colors && loc.colors.primary) || '#8b5cf6');
    var reviews = data.reviews || [];
    var wrap = layout === 'carousel'
      ? 'display:flex;gap:16px;overflow-x:auto;padding:4px 0'
      : 'display:flex;flex-wrap:wrap;gap:16px';
    var inner = reviews.length
      ? reviews.map(function (r) { return card(r, accent); }).join('')
      : '<div style="font-size:12px;color:' + P.muted + '">No reviews yet.</div>';
    target.innerHTML = '<div class="vr-widget" style="background:' + P.bg +
      ';border-radius:12px;padding:20px;font-family:system-ui,-apple-system,sans-serif">' +
      '<div style="' + wrap + '">' + inner + '</div></div>';
    target.setAttribute('data-vr-rendered', '1');
  }

  var url = api + (api.indexOf('?') === -1 ? '?' : '&') + 'location=' + encodeURIComponent(locationId);
  fetch(url, { method: 'GET' })
    .then(function (res) { if (!res.ok) throw new Error('HTTP ' + res.status); return res.json(); })
    .then(render)
    .catch(function (err) { console.warn('[vouchrank] widget.js: could not load reviews —', err && err.message); });
})();
