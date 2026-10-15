/* Research notebook: measured comparisons and a deterministic DDPM marginal demo. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else { root.GudNotebook = api; api.mount(root.document, root); }
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const WIDTH = 64, HEIGHT = 40, STEPS = 1000;
  const clamp = (value, low, high) => Math.min(high, Math.max(low, value));
  const alphaBars = [1];
  for (let t = 1; t <= STEPS; t++) alphaBars[t] = alphaBars[t - 1] * (1 - (0.0001 + 0.0199 * (t - 1) / (STEPS - 1)));
  function coefficients(time) {
    const t = clamp(Math.round(Number(time) || 0), 0, STEPS);
    const alphaBar = alphaBars[t];
    return {t, alphaBar, signal: Math.sqrt(alphaBar), noise: Math.sqrt(1 - alphaBar), snr: t === 0 ? Infinity : alphaBar / (1 - alphaBar)};
  }
  function gaussian(seed) {
    let state = seed >>> 0, spare = null;
    const uniform = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return (state + 1) / 4294967297; };
    return () => {
      if (spare !== null) { const result = spare; spare = null; return result; }
      const r = Math.sqrt(-2 * Math.log(uniform())), angle = 2 * Math.PI * uniform();
      spare = r * Math.sin(angle); return r * Math.cos(angle);
    };
  }
  function makeFrame(time, seed = 455) {
    const c = coefficients(time), random = gaussian(seed);
    const source = new Float64Array(WIDTH * HEIGHT), noise = new Float64Array(source.length), mixed = new Float64Array(source.length);
    for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH; x++) {
      const i = y * WIDTH + x, nx = (x - 31.5) / 21, ny = (y - 19.5) / 15;
      const circle = nx * nx + ny * ny < 1;
      const cut = x > 31 && y < 18, bridge = x > 29 && x < 51 && y > 18 && y < 23;
      const ring = circle && (nx * nx + ny * ny > 0.42) && !cut;
      source[i] = ring || bridge ? 0.86 : -0.72 + 0.16 * Math.sin(x / 4) * Math.cos(y / 3);
      noise[i] = random();
      mixed[i] = c.signal * source[i] + c.noise * noise[i];
    }
    return {source, noise, mixed, coefficients: c};
  }
  function gray(value) { return clamp(Math.round((value + 1) * 127.5), 0, 255); }
  function plateSVG(time = 500, seed = 455) {
    const frame = makeFrame(time, seed);
    const titles = ['合成靶标 x₀', '固定高斯噪声 ε', '前向加噪 xₜ'];
    const arrays = [frame.source, frame.noise, frame.mixed];
    let markup = '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 660 172" role="img"><title>DDPM 前向加噪数学演示，t=' + time + '，非模型输出</title><rect width="660" height="172" fill="#f3f1e9"/>';
    arrays.forEach((values, k) => {
      const offset = k * 224;
      markup += '<text x="' + offset + '" y="14" font-family="Arial, sans-serif" font-size="10" fill="#242522">' + titles[k] + '</text><g transform="translate(' + offset + ',28) scale(3.3)" shape-rendering="crispEdges">';
      for (let y = 0; y < HEIGHT; y++) for (let x = 0; x < WIDTH;) {
        const g = gray(values[y * WIDTH + x]), start = x;
        while (++x < WIDTH && gray(values[y * WIDTH + x]) === g) {}
        markup += '<rect x="' + start + '" y="' + y + '" width="' + (x - start) + '" height="1" fill="rgb(' + g + ',' + g + ',' + g + ')"/>';
      }
      markup += '</g>';
    });
    return markup + '</svg>\n';
  }
  function selection(data, key) {
    const variant = data.variants.find(v => v.key === key) || data.variants.find(v => v.key === data.initial) || data.variants[0];
    return {variant, rows: variant.values.map((value, index) => ({value, width: clamp(value / data.max * 100, 0, 100), label: data.labels[index].name})), context: variant.label + ' · ' + data.unit};
  }
  function mountExperiments(doc) {
    doc.querySelectorAll('[data-experiment]').forEach(figure => {
      try {
        const data = JSON.parse(figure.querySelector('[data-experiment-data]').textContent);
        if (!(data.max > 0) || !data.variants.length || data.variants.some(v => v.values.length !== data.labels.length || v.values.some(x => !Number.isFinite(x)))) return;
        const control = figure.querySelector('[data-experiment-variant]');
        const rows = [...figure.querySelectorAll('[data-bar-row]')];
        if (rows.length !== data.labels.length) return;
        const update = () => {
          const state = selection(data, control.value);
          rows.forEach((row, i) => {
            row.querySelector('[data-bar-fill]').style.width = state.rows[i].width + '%';
            row.querySelector('[data-bar-value]').textContent = state.rows[i].value.toFixed(6);
            const delta = row.querySelector('[data-bar-delta]');
            if (delta) {
              const relative = state.variant.values[0] === 0 ? null : (state.rows[i].value / state.variant.values[0] - 1) * 100;
              delta.textContent = i === 0 ? '参照' : relative === null ? '—' : (relative > 0 ? '+' : '') + relative.toFixed(2) + '%';
            }
          });
          figure.querySelector('[data-plot-context]').textContent = state.context;
          figure.querySelector('[data-plot-insight]').textContent = state.variant.blurb;
        };
        control.addEventListener('change', update);
        update(); figure.querySelector('.experiment-controls').hidden = false;
      } catch { /* Static measured plot and complete tables remain readable. */ }
    });
  }
  function mountDiffusion(doc) {
    doc.querySelectorAll('[data-diffusion-lab]').forEach(figure => {
      const canvases = [...figure.querySelectorAll('canvas')];
      if (canvases.length !== 3) return;
      let contexts;
      try { contexts = canvases.map(canvas => canvas.getContext('2d')); } catch { return; }
      if (contexts.some(context => !context)) return;
      const slider = figure.querySelector('[data-diffusion-time]');
      const seedText = figure.querySelector('[data-noise-seed]');
      let seed = 455;
      const paint = () => {
        const frame = makeFrame(slider.value, seed), c = frame.coefficients;
        [frame.source, frame.noise, frame.mixed].forEach((values, k) => {
          const pixels = contexts[k].createImageData(WIDTH, HEIGHT);
          for (let i = 0; i < values.length; i++) {
            const value = gray(values[i]);
            pixels.data[i * 4] = value; pixels.data[i * 4 + 1] = value; pixels.data[i * 4 + 2] = value; pixels.data[i * 4 + 3] = 255;
          }
          contexts[k].putImageData(pixels, 0, 0);
        });
        figure.querySelector('[data-time-label]').textContent = c.t;
        figure.querySelector('[data-signal-value]').textContent = c.signal.toFixed(4);
        figure.querySelector('[data-noise-value]').textContent = c.noise.toFixed(4);
        figure.querySelector('[data-snr-value]').textContent = c.snr === Infinity ? '∞' : c.snr.toFixed(4);
        seedText.textContent = seed;
      };
      slider.addEventListener('input', paint);
      figure.querySelector('[data-next-noise]').addEventListener('click', () => { seed += 137; paint(); });
      figure.querySelector('[data-reset-noise]').addEventListener('click', () => { slider.value = 500; seed = 455; paint(); });
      paint();
      figure.querySelector('[data-diffusion-fallback]').hidden = true;
      figure.querySelector('[data-diffusion-canvases]').hidden = false;
      figure.querySelector('.diffusion-controls').hidden = false;
    });
  }
  function mountReading(doc, win) {
    const article = doc.querySelector('[data-research-article]');
    if (!article) return;
    article.querySelectorAll('.prose > table').forEach(table => {
      const wrapper = doc.createElement('div');
      wrapper.className = 'table-scroll'; wrapper.tabIndex = 0;
      wrapper.setAttribute('role', 'region'); wrapper.setAttribute('aria-label', '可横向滚动的数据表');
      table.before(wrapper); wrapper.append(table);
    });
    const toc = article.querySelector('[data-note-toc]');
    const links = article.querySelector('[data-toc-links]');
    const headings = [...article.querySelectorAll('.prose > h2, .prose > h3')];
    if (toc && links && headings.length) {
      headings.forEach((heading, index) => {
        if (!heading.id) heading.id = 'section-' + (index + 1);
        const link = doc.createElement('a');
        link.href = '#' + heading.id; link.textContent = heading.textContent;
        if (heading.tagName === 'H3') link.className = 'toc-sub';
        links.append(link);
      });
      toc.hidden = false;
    }
    const progress = article.querySelector('[data-reading-progress]');
    const label = article.querySelector('[data-reading-label]');
    if (!progress) return;
    let queued = false;
    const update = () => {
      queued = false;
      const rect = article.getBoundingClientRect();
      const available = rect.height - win.innerHeight + 110;
      const value = available <= 0 ? 100 : clamp((110 - rect.top) / available * 100, 0, 100);
      progress.value = value;
      label.textContent = Math.round(value) + '%';
    };
    const schedule = () => { if (!queued) { queued = true; win.requestAnimationFrame(update); } };
    win.addEventListener('scroll', schedule, {passive: true});
    win.addEventListener('resize', schedule);
    progress.closest('.reading-meter').hidden = false; update();
  }
  function mount(doc, win) {
    mountExperiments(doc); mountDiffusion(doc); mountReading(doc, win);
  }
  return {WIDTH, HEIGHT, STEPS, coefficients, makeFrame, gray, plateSVG, selection, mountExperiments, mountDiffusion, mountReading, mount};
});

