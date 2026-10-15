(() => {
  'use strict';
  document.documentElement.classList.add('js-enabled');
  const menu = document.querySelector('.menu-toggle');
  const navigation = document.querySelector('#site-nav');
  if (menu && navigation) {
    menu.hidden = false;
    const closeMenu = () => { menu.setAttribute('aria-expanded', 'false'); navigation.classList.remove('is-open'); };
    menu.addEventListener('click', () => {
      const open = menu.getAttribute('aria-expanded') !== 'true';
      menu.setAttribute('aria-expanded', String(open)); navigation.classList.toggle('is-open', open);
    });
    navigation.addEventListener('click', (event) => { if (event.target.closest('a')) closeMenu(); });
    document.addEventListener('keydown', (event) => {
      if (event.key === 'Escape' && menu.getAttribute('aria-expanded') === 'true') { closeMenu(); menu.focus(); }
    });
  }
  // 搜索和标签取交集；输入仅作文本匹配，避免将 URL 或搜索词插入 HTML。
  const normalize = (text) => text.normalize('NFKC').toLocaleLowerCase().trim();
  document.querySelectorAll('[data-record-browser]').forEach((browser) => {
    const controls = browser.querySelector('.record-controls');
    const input = browser.querySelector('[data-record-search]');
    const buttons = [...browser.querySelectorAll('[data-filter]')];
    const records = [...browser.querySelectorAll('[data-record]')].map((element) => ({
      element, text: normalize(element.dataset.search || ''), tags: (element.dataset.tags || '').split('|')
    }));
    const count = browser.querySelector('[data-result-count]');
    const empty = browser.querySelector('[data-empty-state]');
    const params = new URLSearchParams(location.search);
    let active = params.get('tag') || 'all';
    if (!buttons.some((button) => button.dataset.filter === active)) active = 'all';
    input.value = params.get('q') || ''; controls.hidden = false;
    const apply = (updateUrl = true) => {
      const words = normalize(input.value).split(/\s+/u).filter(Boolean);
      let visible = 0;
      records.forEach((record) => {
        const match = (active === 'all' || record.tags.includes(active)) && words.every((word) => record.text.includes(word));
        record.element.hidden = !match; if (match) visible++;
      });
      buttons.forEach((button) => button.setAttribute('aria-pressed', String(button.dataset.filter === active)));
      count.textContent = `显示 ${visible} / ${records.length} 条记录`; empty.hidden = visible > 0;
      if (updateUrl) {
        const url = new URL(location.href);
        if (input.value.trim()) url.searchParams.set('q', input.value.trim()); else url.searchParams.delete('q');
        if (active !== 'all') url.searchParams.set('tag', active); else url.searchParams.delete('tag');
        if (location.protocol !== 'file:') history.replaceState(null, '', url);
      }
    };
    input.addEventListener('input', () => apply());
    buttons.forEach((button) => button.addEventListener('click', () => { active = button.dataset.filter; apply(); }));
    browser.querySelector('[data-reset]').addEventListener('click', () => { input.value = ''; active = 'all'; apply(); input.focus(); });
    document.addEventListener('keydown', (event) => {
      const editing = /INPUT|TEXTAREA|SELECT/.test(document.activeElement?.tagName || '') || document.activeElement?.isContentEditable;
      if (event.key === '/' && !editing && !event.ctrlKey && !event.metaKey && !event.altKey) { event.preventDefault(); input.focus(); }
    });
    apply(false);
  });
  if (navigator.clipboard?.writeText) {
    document.querySelectorAll('.prose .highlighter-rouge').forEach((block) => {
      const code = block.querySelector('pre code'); if (!code) return;
      const button = document.createElement('button'); button.type = 'button'; button.className = 'copy-code';
      button.textContent = '复制'; button.setAttribute('aria-label', '复制代码');
      button.addEventListener('click', async () => {
        try { await navigator.clipboard.writeText(code.textContent); button.textContent = '已复制'; }
        catch { button.textContent = '请手动复制'; }
        window.setTimeout(() => { button.textContent = '复制'; }, 1800);
      });
      block.append(button);
    });
  }
})();

