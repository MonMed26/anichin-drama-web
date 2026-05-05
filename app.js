// DramaKilat — Anichin API short drama frontend
// Pure vanilla JS, hash-based routing.

const API_BASE = 'https://api.anichin.bio';
const API_KEY = 'TRIAL-ANICHIN-2026';

/**
 * Source registry. `playable: false` means the source returns custom URL
 * schemes (like dramabox-hls://) that browsers can't play directly — so we
 * surface a friendly message instead of pretending it works.
 */
const SOURCES = [
  { id: 'reelshort',  label: 'ReelShort',  sample: '699d1eefa3a7262cff05534b', playable: true  },
  { id: 'shortmax',   label: 'ShortMax',   sample: '18854',                    playable: true  },
  { id: 'dramanova',  label: 'DramaNova',  sample: '102062',                   playable: true  },
  { id: 'goodshort',  label: 'GoodShort',  sample: '31001188126',              playable: true  },
  { id: 'netshort',   label: 'NetShort',   sample: '2034157133506805762',      playable: true  },
  { id: 'flickreels', label: 'FlickReels', sample: '5672',                     playable: true  },
  { id: 'freereels',  label: 'FreeReels',  sample: '51bAUXzvfP',               playable: true  },
  { id: 'dramabite',  label: 'DramaBite',  sample: '15384',                    playable: true  },
  { id: 'starshort',  label: 'StarShort',  sample: 'j0NM',                     playable: true  },
  { id: 'stardusttv', label: 'StardustTV', sample: '146',                      playable: true  },
  { id: 'idrama',     label: 'iDrama',     sample: '160000641712',             playable: true  },
  { id: 'moboreels',  label: 'MoboReels',  sample: '41896322',                 playable: true  },
  { id: 'dramawave',  label: 'DramaWave',  sample: 'LeMYdgoXZM',               playable: true  },
  { id: 'melolo',     label: 'Melolo',     sample: '7522723499182394385',      playable: true  },
  // dramabox returns dramabox-hls:// custom protocol → not playable in browsers.
  { id: 'dramabox',   label: 'DramaBox',   sample: '42000007806',              playable: false },
];

const DEFAULT_SOURCE = 'reelshort';
const STORAGE_KEY = 'dramakilat:source';

const state = {
  source: localStorage.getItem(STORAGE_KEY) || DEFAULT_SOURCE,
  hls: null, // active hls.js instance, kept so we can destroy on navigate
};

// ---------- API client ----------

async function api(path, params = {}) {
  const url = new URL(API_BASE + path);
  Object.entries(params).forEach(([k, v]) => {
    if (v !== undefined && v !== null && v !== '') url.searchParams.set(k, v);
  });
  const res = await fetch(url, {
    headers: {
      'X-API-Key': API_KEY,
      // Some clients on the API side reject requests without a UA, but
      // browsers won't let us set User-Agent — that's fine, real browser UA is auto-sent.
      Accept: 'application/json',
    },
  });
  if (!res.ok) {
    const text = await res.text().catch(() => '');
    throw new Error(`API ${res.status}: ${text || res.statusText}`);
  }
  const data = await res.json();
  if (data && data.code && data.code !== 200) {
    throw new Error(data.error || data.msg || `API error ${data.code}`);
  }
  return data;
}

const apiTrending = (source)        => api(`/${source}/trending`);
const apiForYou   = (source, page)  => api(`/${source}/foryou`, { page });
const apiSearch   = (source, query) => api(`/${source}/search`, { query });
const apiDetail   = (source, id)    => api(`/${source}/detail`, { id });
const apiEpisode  = (source, id, ep)=> api(`/${source}/episode`, { id, ep });

// ---------- Helpers ----------

function el(tag, attrs = {}, ...children) {
  const node = document.createElement(tag);
  for (const [k, v] of Object.entries(attrs)) {
    if (k === 'class') node.className = v;
    else if (k === 'html') node.innerHTML = v;
    else if (k.startsWith('on') && typeof v === 'function') node.addEventListener(k.slice(2), v);
    else if (v === false || v === null || v === undefined) continue;
    else node.setAttribute(k, v);
  }
  for (const c of children.flat()) {
    if (c == null || c === false) continue;
    node.append(c.nodeType ? c : document.createTextNode(String(c)));
  }
  return node;
}

function getSourceMeta(id) {
  return SOURCES.find((s) => s.id === id) || SOURCES[0];
}

function setSource(id) {
  state.source = id;
  localStorage.setItem(STORAGE_KEY, id);
  document.querySelectorAll('#sourceSelect, #sourceSelectMobile').forEach((sel) => {
    if (sel.value !== id) sel.value = id;
  });
}

function clearApp() {
  destroyHls();
  document.getElementById('app').innerHTML = '';
}

function destroyHls() {
  if (state.hls) {
    try { state.hls.destroy(); } catch {}
    state.hls = null;
  }
}

function showLoading() {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const grid = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4' });
  for (let i = 0; i < 12; i++) {
    grid.append(el('div', { class: 'aspect-[2/3] skeleton' }));
  }
  app.append(grid);
}

function showError(err, ctx = '') {
  const app = document.getElementById('app');
  app.innerHTML = '';
  const msg = (err && err.message) || String(err);
  app.append(
    el('div', { class: 'rounded-xl bg-panel border border-red-500/30 p-6 text-center' },
      el('div', { class: 'text-3xl mb-2' }, '😵'),
      el('h3', { class: 'font-semibold text-lg' }, 'Gagal memuat data'),
      el('p', { class: 'text-sm text-mute mt-1' }, ctx),
      el('p', { class: 'text-xs text-red-300/80 mt-3 break-all' }, msg),
      el('button', {
        class: 'mt-4 pill',
        onclick: () => location.reload(),
      }, '↻ Coba lagi'),
    )
  );
}

function buildCard(item, source) {
  const tpl = document.getElementById('tpl-card');
  const node = tpl.content.firstElementChild.cloneNode(true);
  const id = item.id || item.dramaId;
  node.href = `#/drama/${source}/${encodeURIComponent(id)}`;
  const poster = item.cover || item.posterImg || item.coverImg || '';
  const img = node.querySelector('.poster');
  img.src = poster;
  img.alt = item.title || 'Drama';
  img.onerror = () => {
    img.style.display = 'none';
    img.parentElement.classList.add('flex', 'items-center', 'justify-center', 'text-mute', 'text-3xl');
    img.parentElement.append(document.createTextNode('🎬'));
  };
  node.querySelector('.title').textContent = item.title || 'Tanpa judul';
  const eps = item.totalEpisodes || item.episodes;
  const meta = [];
  if (eps) meta.push(`${eps} episode`);
  if (item.isCompleted === '1' || item.isCompleted === true) meta.push('Tamat');
  node.querySelector('.meta').textContent = meta.join(' • ');
  node.querySelector('.src-badge').textContent = getSourceMeta(source).label;
  if (eps) {
    const epBadge = node.querySelector('.ep-badge');
    epBadge.textContent = `${eps} EP`;
    epBadge.classList.remove('hidden');
  }
  return node;
}

function renderGrid(items, source) {
  const grid = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4' });
  items.forEach((item) => grid.append(buildCard(item, source)));
  return grid;
}

function renderEmpty(text) {
  return el('div', { class: 'text-center py-16 text-mute' },
    el('div', { class: 'text-5xl mb-2' }, '🍿'),
    el('p', {}, text),
  );
}

// ---------- Pages ----------

async function pageHome() {
  clearApp();
  const app = document.getElementById('app');
  const source = state.source;

  app.append(
    el('section', { class: 'hero-gradient rounded-2xl px-5 sm:px-8 py-8 sm:py-10 mb-6' },
      el('h1', { class: 'text-2xl sm:text-4xl font-extrabold' },
        'Nonton drama pendek, ',
        el('span', { class: 'bg-gradient-to-r from-accent to-accent2 bg-clip-text text-transparent' }, 'kilat & gratis'),
      ),
      el('p', { class: 'text-sm sm:text-base text-mute mt-2 max-w-xl' },
        `Streaming dari 14 platform short drama populer (ReelShort, ShortMax, DramaNova, dll). Sumber aktif: `,
        el('span', { class: 'text-white font-semibold' }, getSourceMeta(source).label),
        '.'
      ),
    ),
  );

  const trendingSection = el('section', { class: 'mb-8' },
    el('div', { class: 'flex items-end justify-between mb-4' },
      el('h2', { class: 'text-xl sm:text-2xl font-bold' }, '🔥 Trending'),
      el('a', { class: 'text-sm text-mute hover:text-white', href: '#/foryou' }, 'For You →'),
    ),
  );
  app.append(trendingSection);
  const trendingPlaceholder = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4' });
  for (let i = 0; i < 12; i++) trendingPlaceholder.append(el('div', { class: 'aspect-[2/3] skeleton' }));
  trendingSection.append(trendingPlaceholder);

  try {
    const data = await apiTrending(source);
    const items = (data && data.items) || [];
    trendingPlaceholder.replaceWith(items.length ? renderGrid(items, source) : renderEmpty(`Tidak ada drama trending dari ${getSourceMeta(source).label}.`));
  } catch (e) {
    trendingPlaceholder.replaceWith(
      el('div', { class: 'rounded-xl bg-panel border border-red-500/30 p-5 text-sm text-red-300' },
        `Gagal memuat trending dari ${getSourceMeta(source).label}: ${e.message}`)
    );
  }
}

async function pageForYou() {
  clearApp();
  const app = document.getElementById('app');
  const source = state.source;

  app.append(el('h2', { class: 'text-xl sm:text-2xl font-bold mb-4' }, '✨ For You — ', getSourceMeta(source).label));
  showLoadingInto(app);

  try {
    const data = await apiForYou(source, 1);
    const items = (data && data.items) || [];
    app.lastElementChild.remove();
    app.append(items.length ? renderGrid(items, source) : renderEmpty('Tidak ada rekomendasi.'));
  } catch (e) {
    showError(e, 'Gagal memuat For You.');
  }
}

function showLoadingInto(parent) {
  const grid = el('div', { class: 'grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-6 gap-3 sm:gap-4' });
  for (let i = 0; i < 12; i++) grid.append(el('div', { class: 'aspect-[2/3] skeleton' }));
  parent.append(grid);
}

async function pageSearch(query) {
  clearApp();
  const app = document.getElementById('app');
  const source = state.source;
  const q = (query || '').trim();

  app.append(
    el('div', { class: 'mb-5' },
      el('h2', { class: 'text-xl sm:text-2xl font-bold' }, q ? `Pencarian: "${q}"` : 'Pencarian'),
      el('p', { class: 'text-sm text-mute mt-1' }, `Sumber: ${getSourceMeta(source).label}`),
    )
  );

  if (!q) {
    app.append(renderEmpty('Ketik kata kunci di bilah pencarian di atas.'));
    return;
  }

  showLoadingInto(app);
  try {
    const data = await apiSearch(source, q);
    const items = (data && data.items) || [];
    app.lastElementChild.remove();
    app.append(items.length ? renderGrid(items, source) : renderEmpty(`Tidak ada hasil untuk "${q}".`));
  } catch (e) {
    showError(e, 'Pencarian gagal.');
  }
}

async function pageDetail(source, id) {
  clearApp();
  const app = document.getElementById('app');
  const sourceMeta = getSourceMeta(source);

  app.append(el('div', { class: 'h-64 skeleton mb-6' }));

  try {
    const data = await apiDetail(source, id);
    const drama = (data && data.data) || {};
    const episodes = drama.episodes || [];
    app.innerHTML = '';

    const poster = drama.cover || drama.posterImg || '';
    const totalEps = drama.totalEpisodes || episodes.length;
    const completed = drama.isCompleted === '1' || drama.isCompleted === true;

    const firstPlayable = episodes.find((e) => !e.locked) || episodes[0];
    const watchHref = firstPlayable
      ? `#/watch/${source}/${encodeURIComponent(id)}/${firstPlayable.episodeNumber || firstPlayable.number || 1}`
      : null;

    app.append(
      el('section', { class: 'rounded-2xl overflow-hidden bg-panel border border-white/5 mb-6' },
        el('div', { class: 'grid grid-cols-1 md:grid-cols-[260px_1fr] gap-0' },
          el('div', { class: 'bg-panel2 aspect-[2/3] md:aspect-auto md:h-full overflow-hidden' },
            poster
              ? el('img', { src: poster, alt: drama.title || '', class: 'w-full h-full object-cover', loading: 'lazy', onerror: function () { this.style.display = 'none'; } })
              : el('div', { class: 'w-full h-full flex items-center justify-center text-6xl text-mute' }, '🎬'),
          ),
          el('div', { class: 'p-5 sm:p-7' },
            el('div', { class: 'flex flex-wrap gap-2 mb-2' },
              el('span', { class: 'pill !cursor-default !bg-accent/20 !border-accent/40 !text-accent' }, sourceMeta.label),
              totalEps ? el('span', { class: 'pill !cursor-default' }, `${totalEps} episode`) : null,
              completed ? el('span', { class: 'pill !cursor-default !bg-emerald-500/20 !border-emerald-500/40 !text-emerald-300' }, 'Tamat') : null,
              !sourceMeta.playable ? el('span', { class: 'pill !cursor-default !bg-yellow-500/20 !border-yellow-500/40 !text-yellow-300' }, '⚠ Tidak didukung di browser') : null,
            ),
            el('h1', { class: 'text-2xl sm:text-3xl font-extrabold leading-tight' }, drama.title || 'Tanpa judul'),
            el('p', { class: 'text-sm text-mute mt-3 line-clamp-3' }, drama.description || drama.synopsis || 'Tidak ada sinopsis.'),
            watchHref
              ? el('div', { class: 'mt-5 flex flex-wrap gap-3' },
                  el('a', { class: 'inline-flex items-center gap-2 bg-gradient-to-r from-accent to-accent2 text-white font-semibold px-5 py-2.5 rounded-full hover:opacity-90 transition', href: watchHref },
                    el('span', {}, '▶'), 'Tonton sekarang'),
                )
              : null,
            !sourceMeta.playable
              ? el('p', { class: 'text-xs text-yellow-300/80 mt-3' }, `${sourceMeta.label} mengembalikan URL video dengan protokol custom yang tidak bisa diputar di browser. Pilih sumber lain seperti ReelShort atau ShortMax dari header.`)
              : null,
          ),
        ),
      ),
    );

    if (episodes.length) {
      const epSection = el('section', {},
        el('h2', { class: 'text-lg sm:text-xl font-bold mb-3' }, 'Daftar Episode'),
        el('div', { class: 'grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2' },
          ...episodes.map((ep) => {
            const num = ep.episodeNumber || ep.number || 1;
            const locked = ep.locked === true || ep.locked === 'true';
            if (locked) {
              return el('div', { class: 'ep-btn locked', title: 'Episode terkunci di sumber asli' },
                el('span', {}, '🔒 ' + num));
            }
            return el('a', {
              class: 'ep-btn',
              href: `#/watch/${source}/${encodeURIComponent(id)}/${num}`,
            }, String(num));
          }),
        ),
      );
      app.append(epSection);
    } else {
      app.append(renderEmpty('Tidak ada episode.'));
    }
  } catch (e) {
    showError(e, `Gagal memuat detail drama dari ${sourceMeta.label}.`);
  }
}

async function pageWatch(source, id, ep) {
  clearApp();
  const app = document.getElementById('app');
  const sourceMeta = getSourceMeta(source);
  const epNum = parseInt(ep, 10) || 1;

  // Layout shell first so user sees feedback
  const titleEl = el('h1', { class: 'text-lg sm:text-2xl font-bold' }, 'Memuat episode…');
  const subtitleEl = el('p', { class: 'text-sm text-mute mt-1' }, `${sourceMeta.label} • Episode ${epNum}`);
  const playerWrap = el('div', { class: 'player-wrapper bg-panel2 mt-4 flex items-center justify-center' },
    el('div', { class: 'spinner' })
  );
  const controlsRow = el('div', { class: 'flex flex-wrap gap-2 mt-4' });
  const epListWrap = el('div', { class: 'mt-6' });
  const backLink = el('a', { class: 'text-sm text-mute hover:text-white', href: `#/drama/${source}/${encodeURIComponent(id)}` }, '← Kembali ke detail');

  app.append(
    el('div', { class: 'mb-3' }, backLink),
    titleEl,
    subtitleEl,
    playerWrap,
    controlsRow,
    epListWrap,
  );

  if (!sourceMeta.playable) {
    playerWrap.innerHTML = '';
    playerWrap.append(
      el('div', { class: 'text-center px-6' },
        el('div', { class: 'text-4xl mb-2' }, '⚠'),
        el('p', { class: 'font-semibold' }, `${sourceMeta.label} tidak didukung di browser`),
        el('p', { class: 'text-sm text-mute mt-1' }, 'Sumber ini mengembalikan URL video dengan protokol custom (mis. dramabox-hls://) yang tidak bisa diputar langsung. Coba pilih sumber lain dari header.'),
      )
    );
    return;
  }

  // Fetch detail (for episode list & title) + episode (for video URL) in parallel
  const [detailRes, episodeRes] = await Promise.allSettled([
    apiDetail(source, id),
    apiEpisode(source, id, epNum),
  ]);

  const drama = detailRes.status === 'fulfilled' ? (detailRes.value && detailRes.value.data) || {} : {};
  const episodes = drama.episodes || [];

  if (drama.title) titleEl.textContent = drama.title;
  subtitleEl.textContent = `${sourceMeta.label} • Episode ${epNum}${drama.totalEpisodes ? ` / ${drama.totalEpisodes}` : ''}`;

  if (episodeRes.status === 'rejected') {
    playerWrap.innerHTML = '';
    playerWrap.append(
      el('div', { class: 'text-center px-6' },
        el('div', { class: 'text-4xl mb-2' }, '😵'),
        el('p', { class: 'font-semibold' }, 'Gagal memuat video'),
        el('p', { class: 'text-sm text-mute mt-1 break-all' }, episodeRes.reason && episodeRes.reason.message),
      )
    );
  } else {
    const epData = episodeRes.value || {};
    if (epData.locked) {
      playerWrap.innerHTML = '';
      playerWrap.append(
        el('div', { class: 'text-center px-6' },
          el('div', { class: 'text-4xl mb-2' }, '🔒'),
          el('p', { class: 'font-semibold' }, 'Episode terkunci'),
          el('p', { class: 'text-sm text-mute mt-1' }, 'Episode ini hanya tersedia untuk pengguna premium di platform sumber.'),
        )
      );
    } else {
      mountPlayer(playerWrap, controlsRow, epData);
    }
  }

  // Prev / Next + episode list
  const prevEp = epNum > 1 ? epNum - 1 : null;
  const nextEpTotal = drama.totalEpisodes || episodes.length || 0;
  const nextEp = nextEpTotal && epNum < nextEpTotal ? epNum + 1 : null;

  const navRow = el('div', { class: 'flex items-center justify-between gap-3 mt-6' },
    prevEp
      ? el('a', { class: 'pill', href: `#/watch/${source}/${encodeURIComponent(id)}/${prevEp}` }, '← Episode ', String(prevEp))
      : el('span', { class: 'pill opacity-40 cursor-not-allowed' }, '← Episode'),
    el('a', { class: 'pill', href: `#/drama/${source}/${encodeURIComponent(id)}` }, '☰ Daftar episode'),
    nextEp
      ? el('a', { class: 'pill', href: `#/watch/${source}/${encodeURIComponent(id)}/${nextEp}` }, 'Episode ', String(nextEp), ' →')
      : el('span', { class: 'pill opacity-40 cursor-not-allowed' }, 'Episode →'),
  );
  epListWrap.append(navRow);

  if (episodes.length) {
    epListWrap.append(
      el('h3', { class: 'mt-6 mb-3 font-semibold' }, 'Semua Episode'),
      el('div', { class: 'grid grid-cols-5 sm:grid-cols-8 md:grid-cols-10 gap-2' },
        ...episodes.map((e) => {
          const n = e.episodeNumber || e.number || 1;
          const locked = e.locked === true || e.locked === 'true';
          if (locked) {
            return el('div', { class: 'ep-btn locked', title: 'Episode terkunci' }, '🔒 ' + n);
          }
          const cls = 'ep-btn' + (n === epNum ? ' active' : '');
          return el('a', {
            class: cls,
            href: `#/watch/${source}/${encodeURIComponent(id)}/${n}`,
          }, String(n));
        }),
      ),
    );
  }
}

function mountPlayer(playerWrap, controlsRow, epData) {
  playerWrap.innerHTML = '';
  controlsRow.innerHTML = '';

  const qualityList = Array.isArray(epData.qualityList) && epData.qualityList.length
    ? epData.qualityList
    : (epData.videoUrl ? [{ label: 'auto', url: epData.videoUrl }] : []);

  if (!qualityList.length || !qualityList[0].url) {
    playerWrap.append(
      el('div', { class: 'text-center px-6' },
        el('div', { class: 'text-4xl mb-2' }, '😶'),
        el('p', { class: 'font-semibold' }, 'Tidak ada URL video'),
        el('p', { class: 'text-sm text-mute mt-1' }, 'API tidak mengembalikan URL video untuk episode ini.'),
      )
    );
    return;
  }

  const video = el('video', {
    controls: '',
    playsinline: '',
    autoplay: '',
    crossorigin: 'anonymous',
  });
  playerWrap.append(video);

  // Subtitle tracks (best-effort — many sources omit these)
  const subtitles = Array.isArray(epData.subtitles) ? epData.subtitles : [];
  subtitles.forEach((s, i) => {
    if (!s || !s.url) return;
    const track = document.createElement('track');
    track.kind = 'subtitles';
    track.src = s.url;
    track.srclang = s.lang || s.language || s.code || `sub${i}`;
    track.label = s.label || s.name || track.srclang;
    if (i === 0) track.default = true;
    video.append(track);
  });

  let currentIndex = qualityList.findIndex((q) => q.isDefault);
  if (currentIndex < 0) currentIndex = 0;

  function loadQuality(idx) {
    destroyHls();
    const q = qualityList[idx];
    if (!q || !q.url) return;
    currentIndex = idx;
    const url = q.url;
    const isHls = /\.m3u8(\?|$)/i.test(url);
    const wasPlaying = !video.paused;
    const prevTime = video.currentTime || 0;

    if (isHls) {
      if (video.canPlayType('application/vnd.apple.mpegurl')) {
        video.src = url;
      } else if (window.Hls && window.Hls.isSupported()) {
        const hls = new window.Hls({ enableWorker: true });
        state.hls = hls;
        hls.loadSource(url);
        hls.attachMedia(video);
        hls.on(window.Hls.Events.ERROR, (_e, data) => {
          if (data && data.fatal) {
            console.error('hls.js fatal error', data);
            playerWrap.append(
              el('div', { class: 'absolute inset-0 flex items-center justify-center bg-black/70 text-center text-sm p-4' },
                'Gagal stream HLS. Coba quality lain atau sumber berbeda.'));
          }
        });
      } else {
        video.src = url;
      }
    } else {
      video.src = url;
    }

    video.addEventListener('loadedmetadata', () => {
      if (prevTime && prevTime < (video.duration || Infinity)) {
        try { video.currentTime = prevTime; } catch {}
      }
      if (wasPlaying) video.play().catch(() => {});
    }, { once: true });

    // Update active button
    controlsRow.querySelectorAll('[data-quality]').forEach((btn) => {
      btn.classList.toggle('active', Number(btn.dataset.quality) === idx);
    });
  }

  // Quality pills
  if (qualityList.length > 1) {
    controlsRow.append(el('span', { class: 'text-xs text-mute self-center mr-1' }, 'Kualitas:'));
    qualityList.forEach((q, idx) => {
      controlsRow.append(
        el('button', {
          class: 'pill' + (idx === currentIndex ? ' active' : ''),
          'data-quality': idx,
          onclick: () => loadQuality(idx),
        }, q.label || `Q${idx + 1}`)
      );
    });
  }

  loadQuality(currentIndex);
}

// ---------- Router ----------

function parseHash() {
  const raw = location.hash.replace(/^#/, '') || '/';
  const [pathPart, queryPart] = raw.split('?');
  const segs = pathPart.split('/').filter(Boolean).map(decodeURIComponent);
  const params = new URLSearchParams(queryPart || '');
  return { segs, params };
}

async function route() {
  const { segs, params } = parseHash();
  destroyHls();
  window.scrollTo({ top: 0, behavior: 'instant' in document.documentElement.style ? 'instant' : 'auto' });

  try {
    if (segs.length === 0) return pageHome();
    if (segs[0] === 'foryou') return pageForYou();
    if (segs[0] === 'search') return pageSearch(params.get('q') || '');
    if (segs[0] === 'drama' && segs.length >= 3) return pageDetail(segs[1], segs[2]);
    if (segs[0] === 'watch' && segs.length >= 4) return pageWatch(segs[1], segs[2], segs[3]);
    return pageHome();
  } catch (e) {
    showError(e, 'Routing gagal.');
  }
}

// ---------- Boot ----------

function populateSourceSelectors() {
  const opts = SOURCES.map((s) => {
    const o = document.createElement('option');
    o.value = s.id;
    o.textContent = s.label + (s.playable ? '' : ' (tidak didukung)');
    return o;
  });
  ['sourceSelect', 'sourceSelectMobile'].forEach((id) => {
    const sel = document.getElementById(id);
    if (!sel) return;
    sel.innerHTML = '';
    opts.forEach((o) => sel.append(o.cloneNode(true)));
    sel.value = state.source;
    sel.addEventListener('change', () => {
      setSource(sel.value);
      // Re-route current page so data refreshes for new source where applicable.
      const { segs } = parseHash();
      // For drama/watch routes, switching sources is not meaningful (different IDs),
      // so navigate home instead.
      if (segs[0] === 'drama' || segs[0] === 'watch') location.hash = '#/';
      else route();
    });
  });
}

function bindSearch() {
  const form = document.getElementById('searchForm');
  const input = document.getElementById('searchInput');
  form.addEventListener('submit', (e) => {
    e.preventDefault();
    const q = input.value.trim();
    if (q) location.hash = `#/search?q=${encodeURIComponent(q)}`;
  });
}

window.addEventListener('hashchange', route);
window.addEventListener('DOMContentLoaded', () => {
  populateSourceSelectors();
  bindSearch();
  route();
});
