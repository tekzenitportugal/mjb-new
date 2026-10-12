/* Progressive enhancement only: all page content is in the HTML. */
(() => {
  const siteRoot = new URL("../", document.currentScript.src);
  const header = document.querySelector('.site-header');
  if (header) {
    let pending = false;
    const updateProgress = () => {
      const pageHeight = Math.max(document.documentElement.scrollHeight, document.body.scrollHeight);
      const distance = Math.max(0, pageHeight - window.innerHeight);
      const ratio = distance ? Math.max(0, Math.min(1, window.scrollY / distance)) : 0;
      const start = 43 / 257;
      header.style.setProperty('--scroll-progress', String(start + (1 - start) * ratio));
    };
    window.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { updateProgress(); pending = false; });
    }, { passive: true });
    window.addEventListener('resize', updateProgress);
    window.addEventListener('load', updateProgress);
    if (document.fonts) document.fonts.ready.then(updateProgress);
    updateProgress();
  }

  const menu = document.querySelector('.nav-drawer');
  const toggle = document.querySelector('.menu-toggle');
  if (menu && toggle) {
    const icon = toggle.querySelector('img');
    const name = document.querySelector('.page-name');
    const links = [...menu.querySelectorAll('[data-menu-label]')];
    const groups = [...menu.querySelectorAll('.menu-group')];
    const setGroup = selected => groups.forEach(group => {
      const open = group === selected;
      const submenu = group.querySelector('.menu-submenu');
      const rows = [...submenu.children];
      const height = rows.reduce((total, row) => total + row.getBoundingClientRect().height, 0) + Math.max(0, rows.length - 1) * 12 + 36;
      submenu.style.setProperty('--submenu-height', `${height}px`);
      submenu.inert = !open;
      group.classList.toggle('is-open', open);
      group.querySelector('.menu-primary').setAttribute('aria-expanded', String(open));
    });
    setGroup(null);
    const setOpen = open => {
      toggle.setAttribute('aria-expanded', String(open));
      toggle.setAttribute('aria-label', open ? 'Close navigation' : 'Open navigation');
      icon.src = new URL(open ? 'assets/icons/minus.svg' : 'assets/icons/menu-dashes.svg', siteRoot).href;
      document.body.classList.toggle('menu-open', open);
      if (!open) setGroup(null);
    };
    window.addEventListener('resize', () => setGroup(groups.find(group => group.classList.contains('is-open'))));
    if (document.fonts) document.fonts.ready.then(() => setGroup(groups.find(group => group.classList.contains('is-open'))));
    const syncSelection = () => {
      const normalizePage = url => {
        let page = decodeURIComponent(url.pathname).split('/').filter(Boolean).pop() || 'index.html';
        if (!page.includes('.')) page += '.html';
        return page;
      };
      const current = new URL(location.href);
      const candidates = links.map(link => ({ link, url: new URL(link.getAttribute('href'), location.href) }));
      const match = candidates.find(({url}) => url.origin === current.origin && normalizePage(url) === normalizePage(current) && url.hash === current.hash)
        || candidates.find(({url}) => url.origin === current.origin && normalizePage(url) === normalizePage(current));
      const selected = match?.link;
      links.forEach(link => {
        const active = link === selected;
        link.classList.toggle('is-selected', active);
        if (active) link.setAttribute('aria-current', 'page');
        else link.removeAttribute('aria-current');
      });
      if (selected && name) name.textContent = selected.dataset.menuLabel || selected.textContent.trim();
    };
    const close = () => { if (menu.open) menu.close(); };
    const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
    // show() moves focus to the first link (Home), which draws the green keyboard focus ring.
    // Only keep that for keyboard users; mouse and hover opens drop the focus again.
    const openMenu = (pointer = false) => {
      if (menu.open) return;
      menu.show(); setOpen(true);
      if (pointer && menu.contains(document.activeElement)) document.activeElement.blur();
    };
    toggle.addEventListener('click', event => {
      // With a mouse the menu is already open from hover, so a click must not shut it.
      if (menu.open && !canHover.matches) close();
      else openMenu(event.detail > 0);
    });
    // Desktop: open on hover over the header pill, close after a short delay (600ms) once the pointer leaves both, so moving between items does not shut it.
    let hoverTimer;
    const hoverIn = () => { if (!canHover.matches) return; clearTimeout(hoverTimer); openMenu(true); };
    const hoverOut = () => { if (!canHover.matches) return; clearTimeout(hoverTimer); hoverTimer = setTimeout(close, 600); };
    [header, menu].forEach(el => { el?.addEventListener('mouseenter', hoverIn); el?.addEventListener('mouseleave', hoverOut); });
    menu.addEventListener('close', () => { setOpen(false); });
    document.addEventListener('keydown', event => {
      if (event.key === 'Escape' && menu.open) { close(); toggle.focus(); }
    });
    document.addEventListener('click', event => {
      if (menu.open && !menu.contains(event.target) && !toggle.contains(event.target)) close();
    });
    groups.forEach(group => {
      const parent = group.querySelector('.menu-primary');
      group.addEventListener('mouseenter', () => setGroup(group));
      group.addEventListener('focusin', () => setGroup(group));
      group.addEventListener('mouseleave', () => { if (!group.contains(document.activeElement)) setGroup(null); });
      group.addEventListener('focusout', event => { if (!group.contains(event.relatedTarget)) setGroup(null); });
      // Touch: first tap opens the submenu, a second tap on the already-open parent follows its link.
      let wasOpen = false;
      parent.addEventListener('pointerdown', () => { wasOpen = group.classList.contains('is-open'); });
      parent.addEventListener('click', event => {
        if (window.matchMedia('(hover: none)').matches && !wasOpen) {
          event.preventDefault(); setGroup(group);
        }
        wasOpen = false;
      });
      parent.addEventListener('keydown', event => {
        if (event.key === 'ArrowRight' || event.key === 'ArrowDown') {
          event.preventDefault(); setGroup(group); group.querySelector('.menu-submenu a')?.focus();
        }
        if (event.key === 'ArrowLeft') { event.preventDefault(); setGroup(null); }
      });
    });
    menu.querySelectorAll('.menu-item:not(.menu-group)').forEach(item => {
      item.addEventListener('mouseenter', () => setGroup(null));
      item.addEventListener('focusin', () => setGroup(null));
    });
    links.forEach(link => link.addEventListener('click', event => {
      if (event.defaultPrevented || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
      links.forEach(item => item.classList.toggle('is-selected', item === link));
      if (name) name.textContent = link.dataset.menuLabel;
      close();
    }));
    syncSelection();
    window.addEventListener('hashchange', syncSelection);
  }

  const materials = document.querySelector('[data-materials]');
  if (materials) {
    const tabs = [...materials.querySelectorAll('[role=tab]')];
    const panels = tabs.map(tab => document.getElementById(tab.getAttribute('aria-controls')));
    const previews = tabs.map(tab => materials.querySelector(`[data-material-preview="${tab.dataset.material}"]`));
    const calm = window.matchMedia('(prefers-reduced-motion: reduce)');
    tabs.forEach(tab => tab.setAttribute('aria-expanded', tab.getAttribute('aria-selected')));
    // Previews stay in the DOM and cross-fade (see .material-preview in CSS); panels fade out, swap, fade in.
    previews.forEach(preview => { if (preview) preview.hidden = false; });
    previews.forEach((preview, i) => preview?.classList.toggle('is-active', tabs[i].getAttribute('aria-selected') === 'true'));
    let timer;
    const select = (tab, focus = false, animate = true) => {
      clearTimeout(timer);
      panels.forEach(panel => panel.classList.remove('is-fading'));
      const target = panels[tabs.indexOf(tab)];
      const current = panels.find(panel => !panel.hidden);
      tabs.forEach((other, i) => {
        const active = other === tab;
        other.setAttribute('aria-selected', String(active));
        other.setAttribute('aria-expanded', String(active));
        other.tabIndex = active ? 0 : -1;
        previews[i]?.classList.toggle('is-active', active);
      });
      const show = () => {
        panels.forEach(panel => { panel.hidden = panel !== target; });
        if (animate && !calm.matches) {
          target.classList.add('is-fading');
          requestAnimationFrame(() => requestAnimationFrame(() => target.classList.remove('is-fading')));
        }
      };
      if (animate && !calm.matches && current && current !== target) {
        current.classList.add('is-fading');
        timer = setTimeout(show, 220);
      } else show();
      if (focus) tab.focus();
    };
    tabs.forEach((tab, index) => {
      tab.addEventListener('click', () => {
        // Narrow screens show the tabs as an accordion: tapping the open item closes it.
        if (window.matchMedia('(max-width: 767px)').matches && tab.getAttribute('aria-selected') === 'true') {
          const open = tab.getAttribute('aria-expanded') !== 'false';
          tab.setAttribute('aria-expanded', String(!open));
          panels[index].hidden = open;
        } else select(tab);
      });
      tab.addEventListener('keydown', event => {
        let target;
        if (event.key === 'ArrowRight') target = (index + 1) % tabs.length;
        if (event.key === 'ArrowLeft') target = (index + tabs.length - 1) % tabs.length;
        if (event.key === 'Home') target = 0;
        if (event.key === 'End') target = tabs.length - 1;
        if (target !== undefined) { event.preventDefault(); select(tabs[target], true); }
      });
    });
    const syncHash = () => {
      const tab = tabs.find(t => '#' + t.dataset.material === location.hash);
      if (tab) {
        select(tab, false, false);
        materials.scrollIntoView({ block: 'center' });
      }
    };
    syncHash();
    window.addEventListener('hashchange', syncHash);
  }

  // Open the relevant native accordion when an industry card links to it.
  const syncIndustry = () => {
    const target = document.getElementById(location.hash.slice(1));
    if (target?.matches('details')) {
      document.querySelectorAll('details.acc-item, details.industry-detail-item').forEach(item => { if ((item.dataset.group || item.name) === (target.dataset.group || target.name)) item.open = item === target; });
      target.scrollIntoView({ block: 'start' });
    }
  };
  syncIndustry();
  window.addEventListener('hashchange', syncIndustry);

  // About: the journey lines fill with scroll progress; milestones light up as the fill reaches them.
  const journeyLists = [...document.querySelectorAll('.page-about .timeline')];
  if (journeyLists.length) {
    const phone = window.matchMedia('(max-width: 767px)');
    journeyLists.forEach(list => list.querySelectorAll('img[data-icon]').forEach(icon => { new Image().src = icon.dataset.icon + '-on.svg'; }));
    const setIcon = (li, on) => {
      const icon = li.querySelector('img[data-icon]');
      if (icon) icon.src = icon.dataset.icon + (on ? '-on.svg' : '-off.svg');
    };
    const apply = fills => {
      let current = null;
      journeyLists.forEach((list, n) => {
        list.style.setProperty('--fill', fills[n].fill + 'px');
        [...list.children].forEach(li => {
          const reached = fills[n].pos(li) <= fills[n].fill + 0.5;
          if (li.classList.contains('is-reached') !== reached) setIcon(li, reached);
          li.classList.toggle('is-reached', reached);
          li.classList.remove('is-current');
          if (reached) current = li;
        });
      });
      current?.classList.add('is-current');
    };
    // Phone: the milestones are a horizontal, swipe-per-year strip; the current/reached state follows the scroll position.
    const track = document.querySelector(".page-about .timeline-track");
    const items = track ? [...track.querySelectorAll(".timeline > li")] : [];
    const syncTrack = () => {
      if (!phone.matches || !items.length) return;
      const origin = track.getBoundingClientRect().left + parseFloat(getComputedStyle(track).paddingLeft);
      let cur = 0;
      items.forEach((li, i) => { if (Math.abs(li.getBoundingClientRect().left - origin) < Math.abs(items[cur].getBoundingClientRect().left - origin)) cur = i; });
      items.forEach((li, i) => {
        const reached = i <= cur;
        if (li.classList.contains("is-reached") !== reached) setIcon(li, reached);
        li.classList.toggle("is-reached", reached);
        li.classList.toggle("is-current", i === cur);
      });
    };
    track?.addEventListener("scroll", () => requestAnimationFrame(syncTrack), { passive: true });
    // Desktop: the section pins (sticky) for PIN px of scrolling while the lines fill, then releases.
    const journey = document.querySelector('.page-about .journey');
    const pinBox = journey?.querySelector(':scope > .container');
    const PIN = 1400;
    let pinTop = 0;
    let pinStart = 0;
    const layoutPin = () => {
      const pinned = !phone.matches && !!pinBox;
      journey?.classList.toggle('is-pinned', pinned);
      if (!pinned) return;
      const header = document.querySelector('.site-header');
      const headerBottom = Math.max(header ? header.getBoundingClientRect().bottom : 0, 0);
      const h = pinBox.offsetHeight;
      pinTop = Math.min(Math.max(headerBottom, (window.innerHeight - h) / 2), window.innerHeight - h);
      pinStart = parseFloat(getComputedStyle(journey).paddingTop);
      journey.style.setProperty('--pin-top', pinTop + 'px');
      journey.style.setProperty('--pin-distance', PIN + 'px');
    };
    const update = () => {
      if (phone.matches) { syncTrack(); return; }
      const anchor = window.innerHeight * 0.75;
      let fills;
      if (phone.matches) {
        fills = journeyLists.map(list => {
          const rect = list.getBoundingClientRect();
          const fill = Math.min(Math.max(anchor - rect.top, 0), rect.height);
          return { fill, pos: li => li.offsetTop + 8 };
        });
      } else {
        const [first, second] = journeyLists;
        const secondRect = second.getBoundingClientRect();
        const len1 = first.offsetWidth - 6;
        const len2 = second.offsetWidth + secondRect.left;
        // One scroll progress drives both rows in sequence: row 2 starts the moment row 1 is full.
        // Progress runs from the moment the section pins (0) to the moment it releases (1).
        const s = Math.min(Math.max((pinTop - (journey.getBoundingClientRect().top + pinStart)) / PIN, 0), 1);
        const t1 = Math.min(s * 2, 1);
        const t2 = Math.min(Math.max(s * 2 - 1, 0), 1);
        fills = [
          { fill: t1 * len1, pos: li => li.offsetLeft - 6 },
          { fill: t2 * len2, pos: li => li.offsetLeft + secondRect.left }
        ];
      }
      target = fills;
      if (!easing) { easing = true; requestAnimationFrame(ease); }
    };
    // The drawn fill eases toward the scroll-derived target so the line grows smoothly instead of stepping.
    let target = null;
    let shown = null;
    let easing = false;
    const ease = () => {
      if (!shown) shown = target.map(item => ({ ...item, fill: 0 }));
      let settled = true;
      shown = target.map((item, n) => {
        const gap = item.fill - shown[n].fill;
        const next = Math.abs(gap) < 0.5 ? item.fill : shown[n].fill + gap * 0.14;
        if (next !== item.fill) settled = false;
        return { ...item, fill: next };
      });
      apply(shown);
      if (settled) easing = false;
      else requestAnimationFrame(ease);
    };
    let queued = false;
    const onScroll = () => {
      if (queued) return;
      queued = true;
      requestAnimationFrame(() => { queued = false; update(); });
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    const onResize = () => { layoutPin(); onScroll(); };
    window.addEventListener('resize', onResize);
    window.addEventListener('load', onResize);
    layoutPin();
    update();
  }

  // Smooth open/close for native accordions: animate the body's height, keep [open] until the close finishes.
  const accReduce = window.matchMedia('(prefers-reduced-motion: reduce)');
  const accTiming = { duration: 450, easing: 'cubic-bezier(.4, 0, .2, 1)' };
  const accItems = '.acc-item, .industry-detail-item';
  const animateAcc = (item, opening) => {
    const body = item.querySelector(':scope > :not(summary)');
    if (!body || accReduce.matches) { item.open = opening; return; }
    item.getAnimations({ subtree: true }).forEach(a => a.cancel());
    item.classList.add('is-animating');
    item.classList.toggle('is-closing', !opening);
    if (opening) item.open = true;
    const pad = parseFloat(getComputedStyle(body).paddingBottom) || 0;
    const full = body.offsetHeight;
    const frames = opening
      ? { height: ['0px', full + 'px'], paddingBottom: ['0px', pad + 'px'], opacity: [0, 1] }
      : { height: [full + 'px', '0px'], paddingBottom: [pad + 'px', '0px'], opacity: [1, 0] };
    const done = () => {
      if (!opening) item.open = false;
      item.classList.remove('is-animating', 'is-closing');
    };
    const anim = body.animate(frames, accTiming);
    anim.onfinish = done;
    anim.oncancel = () => item.classList.remove('is-animating');
  };
  // Native name-grouping would close siblings instantly; handle exclusivity ourselves.
  document.querySelectorAll('details' + accItems.replace(/, /g, ', details')).forEach(item => {
    item.dataset.group = item.getAttribute('name') || '';
    item.removeAttribute('name');
    item.querySelector(':scope > summary')?.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      event.preventDefault();
      const opening = !item.open || item.classList.contains('is-closing');
      if (opening && item.dataset.group) {
        document.querySelectorAll('details[open][data-group="' + item.dataset.group + '"]').forEach(other => {
          if (other !== item) animateAcc(other, false);
        });
      }
      animateAcc(item, opening);
    });
  });

  const industryCards = [...document.querySelectorAll('.trusted-card, .page-materials .industry-tile, .page-industries .industry-tile')];
  const activateIndustry = card => industryCards.forEach(item => {
    const active = item === card;
    item.classList.toggle('is-expanded', active);
    item.querySelector('.industry-activate')?.setAttribute('aria-expanded', String(active));
  });
  industryCards.forEach(card => {
    card.addEventListener('click', event => {
      if (event.target.closest('a')) return;
      activateIndustry(card);
    });
  });
  // The first card starts expanded; another opens on hover, tap or selection.
  if (industryCards.length) activateIndustry(industryCards[0]);

  const locationCards = [...document.querySelectorAll('.location-card')];
  const activateLocation = card => locationCards.forEach(item => item.classList.toggle('is-active', item === card));
  locationCards.forEach(card => {
    card.addEventListener('click', () => activateLocation(card));
    card.addEventListener('keydown', event => {
      if (event.target === card && (event.key === 'Enter' || event.key === ' ')) {
        event.preventDefault();
        activateLocation(card);
      }
    });
  });

  const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
  document.querySelectorAll('[data-carousel]').forEach(track => {
    const controls = document.querySelector(`[data-carousel-controls="${track.dataset.carousel}"]`);
    let buttons = controls ? [...controls.querySelectorAll('[data-slide]')] : [];
    let slides = [...track.children];
    track.addEventListener('carousel:refresh', () => {
      slides = [...track.children];
      track.scrollLeft = 0;
      buildStops();
      update();
    });
    // Facility dots follow the viewport: each dot jumps one screenful, and the last dot always
    // lands on the final card, so no card is unreachable on narrower screens.
    const buildStops = () => {
      if (!controls || track.dataset.carousel !== 'locations') return;
      const step = slides.length > 1 ? slides[1].offsetLeft - slides[0].offsetLeft : 1;
      const visible = Math.max(1, Math.floor((track.clientWidth + (step - slides[0].offsetWidth)) / step));
      const stops = [];
      for (let i = 0; i < slides.length - visible; i += visible) stops.push(i);
      stops.push(Math.max(0, slides.length - visible));
      controls.replaceChildren(...stops.map((slide, i) => {
        const button = document.createElement('button');
        button.type = 'button';
        button.dataset.slide = String(slide);
        button.setAttribute('aria-label', `Facilities, page ${i + 1}`);
        button.setAttribute('aria-pressed', 'false');
        button.addEventListener('click', () => track.scrollTo({ left: position(slide), behavior: reducedMotion.matches ? 'instant' : 'smooth' }));
        return button;
      }));
      buttons = [...controls.querySelectorAll('[data-slide]')];
    };
    const position = index => {
      const slide = slides[index];
      if (!slide) return 0;
      const center = track.dataset.carousel === 'reviews';
      return Math.max(0, Math.min(track.scrollWidth - track.clientWidth, slide.getBoundingClientRect().left - track.getBoundingClientRect().left + track.scrollLeft - (center ? (track.clientWidth - slide.clientWidth) / 2 : 0)));
    };
    buttons.forEach(button => button.addEventListener('click', () => {
      track.scrollTo({ left: position(Number(button.dataset.slide)), behavior: reducedMotion.matches ? 'instant' : 'smooth' });
    }));
    let pending = false;
    const update = () => {
      let closest = 0, distance = Infinity;
      buttons.forEach((button, index) => {
        const value = Math.abs(position(Number(button.dataset.slide)) - track.scrollLeft);
        if (value < distance) { closest = index; distance = value; }
      });
      buttons.forEach((button, index) => button.setAttribute('aria-pressed', String(index === closest)));
      if (track.dataset.carousel === 'reviews') slides.forEach((slide, index) => slide.classList.toggle('is-active', index === Number(buttons[closest]?.dataset.slide ?? 1)));
    };
    track.addEventListener('scroll', () => {
      if (pending) return;
      pending = true;
      requestAnimationFrame(() => { update(); pending = false; });
    }, { passive: true });
    if (track.dataset.carousel === 'reviews') {
      const init = () => { track.scrollLeft = position(1); update(); };
      if (document.fonts) document.fonts.ready.then(init); else init();
    } else { buildStops(); update(); }
    window.addEventListener('resize', () => { buildStops(); update(); });
    window.addEventListener('load', () => { buildStops(); update(); });
  });
})();

// A static-site inquiry handoff: visitors review and send the email themselves.
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const picker = form.querySelector('input[type="file"]');
  const dropzone = form.querySelector('[data-dropzone]');
  const list = form.querySelector('.contact-file-list');
  const status = form.querySelector('.contact-form-status');
  let files = [];
  const renderFiles = () => {
    list.replaceChildren();
    files.forEach((file, index) => {
      const item = document.createElement('li');
      const name = document.createElement('span');
      name.textContent = `${file.name} (${(file.size / 1024 / 1024).toFixed(1)} MB)`;
      const remove = document.createElement('button');
      remove.type = 'button'; remove.textContent = 'Remove';
      remove.setAttribute('aria-label', `Remove ${file.name}`);
      remove.addEventListener('click', () => { files.splice(index, 1); renderFiles(); });
      item.append(name, remove); list.append(item);
    });
  };
  const addFiles = incoming => {
    const errors = [];
    for (const file of incoming) {
      if (!/\.(pdf|dwg|jpe?g|png)$/i.test(file.name)) { errors.push(`${file.name}: choose PDF, DWG, JPG or PNG.`); continue; }
      if (file.size > 20 * 1024 * 1024) { errors.push(`${file.name}: the limit is 20 MB.`); continue; }
      if (!files.some(existing => existing.name === file.name && existing.size === file.size && existing.lastModified === file.lastModified)) files.push(file);
    }
    status.textContent = errors.join(' '); renderFiles();
  };
  picker.addEventListener('change', () => { addFiles(picker.files); picker.value = ''; });
  ['dragenter', 'dragover'].forEach(type => dropzone.addEventListener(type, event => { event.preventDefault(); dropzone.classList.add('is-dragging'); }));
  dropzone.addEventListener('dragleave', event => { if (!dropzone.contains(event.relatedTarget)) dropzone.classList.remove('is-dragging'); });
  dropzone.addEventListener('drop', event => { event.preventDefault(); dropzone.classList.remove('is-dragging'); addFiles(event.dataTransfer.files); });
  form.addEventListener('submit', event => {
    event.preventDefault();
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const body = ['Name: ' + data.get('name'), 'Company: ' + data.get('company'), 'Email: ' + data.get('email'), 'Phone: ' + (data.get('phone') || 'Not provided'), '', data.get('message')];
    if (files.length) body.push('', 'Files to attach manually:', ...files.map(file => file.name));
    status.textContent = 'Your email draft is opening. Review it and attach your files before sending. Nothing has been sent yet.';
    window.location.href = 'mailto:info@mjbwood.com?subject=' + encodeURIComponent('Website inquiry — ' + data.get('company')) + '&body=' + encodeURIComponent(body.join('\n'));
  });
})();


// Grow the message and reserve space beneath the fixed-height hero.
(() => {
  const form = document.querySelector('.contact-form');
  if (!form) return;
  const textarea = form.querySelector('textarea');
  const hero = document.querySelector('.contact-hero');
  const routing = document.querySelector('.contact-routing');
  const updateSpacing = () => {
    const spill = Math.max(0, form.getBoundingClientRect().bottom - hero.getBoundingClientRect().bottom);
    const base = window.innerWidth < 768 ? 140 : 260;
    routing.style.setProperty('--contact-routing-space', `${Math.max(base, spill + 140)}px`);
  };
  const update = () => {
    textarea.style.height = 'auto';
    textarea.style.height = `${textarea.scrollHeight + 1}px`;
    const fields = [...form.querySelectorAll('[required]')];
    const ready = fields.every(field => field.type === 'checkbox' ? field.checked : field.value.trim() !== '' && field.validity.valid);
    form.classList.toggle('is-ready', ready);
    updateSpacing();
  };
  form.addEventListener('input', update);
  form.addEventListener('change', update);
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  window.addEventListener('pageshow', update);
  if (document.fonts) document.fonts.ready.then(update);
  if ('ResizeObserver' in window) new ResizeObserver(updateSpacing).observe(form);
  update();
})();

// What we do: the green line grows with scroll and the step nearest the viewport centre
// becomes active, which cross-fades the sticky photo on the right (see .process-timeline in CSS).
(() => {
  const timeline = document.querySelector('[data-timeline]');
  if (!timeline) return;
  const line = timeline.querySelector('.process-line');
  const steps = [...timeline.querySelectorAll('.process')];
  const photos = [...timeline.querySelectorAll('.process-photo')];
  const desktop = window.matchMedia('(min-width: 768px)');
  const update = () => {
    timeline.classList.toggle('is-live', desktop.matches);
    if (!desktop.matches) {
      // Mobile: the steps scroll sideways, and the green line fills along them with the scroll.
      line.style.height = '';
      // Slide i is fully lit when it is snapped in view: the line ends 32px inside that slide's right edge.
      const nums = timeline.querySelectorAll('.step-num');
      const pitch = nums.length > 1 ? nums[1].offsetLeft - nums[0].offsetLeft : nums[0]?.offsetWidth ?? 0;
      const index = pitch > 0 ? Math.min(nums.length - 1, timeline.scrollLeft / pitch) : 0;
      line.style.width = `${Math.max(0, (index + 1) * pitch - 32)}px`;
      return;
    }
    line.style.width = '';
    const middle = window.innerHeight / 2;
    const centers = steps.map(step => {
      const box = step.querySelector('.process-copy').getBoundingClientRect();
      return box.top + box.height / 2;
    });
    const active = centers.reduce((best, center, i) => Math.abs(center - middle) < Math.abs(centers[best] - middle) ? i : best, 0);
    steps.forEach((step, i) => step.classList.toggle('is-active', i === active));
    photos.forEach((photo, i) => photo.classList.toggle('is-active', i === active));
    const top = timeline.getBoundingClientRect().top;
    line.style.height = `${Math.max(0, Math.min(middle - top, centers[centers.length - 1] - top))}px`;
  };
  let pending = false;
  const schedule = () => {
    if (pending) return;
    pending = true;
    requestAnimationFrame(() => { pending = false; update(); });
  };
  window.addEventListener('scroll', schedule, { passive: true });
  timeline.addEventListener('scroll', schedule, { passive: true });
  window.addEventListener('resize', schedule);
  window.addEventListener('load', update);
  if (document.fonts) document.fonts.ready.then(update);
  update();
})();

// Waabi-style motion: the header tucks away while scrolling down and returns on scroll-up,
// and content eases in as it enters the viewport. Both are skipped for reduced motion.
(() => {
  if (matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  if (!('IntersectionObserver' in window)) return;
  const text = 'main h2, main .eyebrow, main .lede, main .hero-copy > *, main .section-head .link-arrow, main .split-copy > *';
  const cards = 'main .location-rail, main .review-window, main .mat-card, main .grade, main .trusted-rail, main .stat-row, main .process, main .industry-tile';
  const images = 'main .material-preview, main .map-art, main .forest-image, main .split-photo, main .process-media';
  const io = new IntersectionObserver(entries => entries.forEach(entry => {
    if (!entry.isIntersecting) return;
    entry.target.classList.add('in-view');
    io.unobserve(entry.target);
  }), { threshold: 0.12, rootMargin: '0px 0px -6% 0px' });
  const watch = (selector, cls) => document.querySelectorAll(selector).forEach(el => {
    if (el.closest('.acc-body, .community-carousel') || el.classList.contains('reveal') || el.classList.contains('reveal-img')) return;
    // Stagger siblings that enter together (cards in a row, hero copy lines).
    const index = [...el.parentElement.children].indexOf(el);
    el.style.setProperty('--reveal-delay', `${Math.min(index, 5) * 0.08}s`);
    el.classList.add(cls);
    io.observe(el);
  });
  watch(text, 'reveal');
  watch(cards, 'reveal');
  watch(images, 'reveal-img');
})();

// Facilities: the United States / Mexico switch swaps the card rail in place.
(() => {
  const siteRoot = new URL('../', document.currentScript.src);
  const switcher = document.querySelector('.location-switch');
  const rail = document.querySelector('.location-rail');
  if (!switcher || !rail) return;
  const tabs = [...switcher.querySelectorAll('a')];
  if (tabs.length < 2) return;
  const photos = ['group5', 'group4', 'group3', 'group6', 'group7'];
  const mexico = [
    ['Delicias, MX', '(634) 474-54-34', '+526344745434', 'Libramiento Delicias Meoqui S/N KM 140, Nuevo Terrazas, Chihuahua C.P. 33020', null, 'MX-CHH'],
    ['Mérida, MX', '(999) 424-07-79', '+529994240779', 'Tablaje Catastral No. 6233 Bodega #11, Parque Industrial del Sureste, Umán, Yucatán C.P. 97390', 'merida.webp', 'MX-YUC'],
    ['Mexico City', '+52 844 438 7100', '+528444387100', 'Av. Poniente 140 #859, Col. Industrial Vallejo, Azcapotzalco, Ciudad de México 02300', 'mexico-city.webp', 'MX-DIF'],
    ['Ocotlán, MX', '(392) 668-03-35', '+523926680335', 'Calle el Naranjo #49, Col. el Porvenir, Ocotlán, Jalisco C.P. 47882', 'ocotlan.webp', 'MX-JAL'],
    ['Puebla, MX', '+52 222 179 7490', '+522221797490', 'San Lorenzo Almecatla 300 Lote 6 Bodega 8, Parque Industrial JINT, Puebla 72710', 'puebla.webp', 'MX-PUE'],
    ['Saltillo, MX', '(844) 438-71-00', '+528444387100', 'Prolongación Juan Escutia #500, Col. Río Bravo, Saltillo, Coahuila C.P. 25220', 'saltillo.webp', 'MX-COA'],
    ['Tijuana, MX', '(55) 5587-34-00', '+525555873400', 'Av. Recursos Hidráulicos #3 Parcela #189, Ejido Santiago Teyahualco, Tultepec, Estado de México C.P. 54980', 'tijuana.webp', 'MX-BCN']
  ];
  const activate = card => [...rail.children].forEach(item => item.classList.toggle('is-active', item === card));
  const build = ([city, phone, tel, address, photo, state], index) => {
    const card = document.createElement('article');
    card.className = 'location-card';
    card.dataset.state = state;
    card.tabIndex = 0;
    card.setAttribute('aria-label', `${city} facility`);
    const img = document.createElement('img');
    img.className = 'location-photo';
    img.src = new URL(photo ? `assets/locations/${photo}` : `assets/${photos[index % photos.length]}.png`, siteRoot).href;
    img.alt = city; img.loading = 'lazy'; img.decoding = 'async';
    const copy = document.createElement('div');
    copy.className = 'location-copy';
    const h3 = document.createElement('h3'); h3.textContent = city;
    const tags = document.createElement('div'); tags.className = 'location-tags';
    const contact = document.createElement('div'); contact.className = 'location-contact';
    const link = document.createElement('a'); link.href = `tel:${tel}`; link.textContent = phone;
    const addr = document.createElement('address'); addr.textContent = address;
    contact.append(link, addr);
    copy.append(h3, tags, contact);
    card.append(img, copy);
    card.addEventListener('click', () => activate(card));
    card.addEventListener('keydown', event => {
      if (event.target === card && (event.key === 'Enter' || event.key === ' ')) { event.preventDefault(); activate(card); }
    });
    return card;
  };
  const usCards = [...rail.children];
  const views = { us: usCards, mexico: mexico.map(build) };
  const labels = { us: 'US facilities', mexico: 'Mexico facilities' };
  const map = document.querySelector('.map-art');
  const show = region => {
    tabs.forEach((tab, i) => tab.classList.toggle('active', (i === 0) === (region === 'us')));
    rail.replaceChildren(...views[region]);
    activate(views[region][0]);
    rail.setAttribute('aria-label', labels[region]);
    if (map?.querySelector('.map-mx')) map.dataset.region = region;
    rail.dispatchEvent(new Event('carousel:refresh'));
  };
  tabs.forEach((tab, i) => tab.addEventListener('click', event => {
    event.preventDefault();
    show(i === 0 ? 'us' : 'mexico');
  }));
})();

// Map: no state is highlighted by default; the card being hovered, focused or clicked darkens its state.
(() => {
  const rail = document.querySelector('.location-rail');
  const states = [...document.querySelectorAll('.map-states path')];
  if (!rail || !states.length) return;
  let hovered = null, picked = null;
  const sync = () => {
    const card = hovered || picked;
    const code = card?.dataset.state;
    states.forEach(path => path.classList.toggle('is-hot', path.dataset.state === code));
  };
  const cardOf = event => event.target.closest?.('.location-card');
  rail.addEventListener('mouseover', event => { hovered = cardOf(event); sync(); });
  rail.addEventListener('mouseleave', () => { hovered = null; sync(); });
  rail.addEventListener('focusin', event => { hovered = cardOf(event); sync(); });
  rail.addEventListener('focusout', () => { hovered = null; sync(); });
  rail.addEventListener('click', event => { picked = cardOf(event) || picked; sync(); });
  rail.addEventListener('carousel:refresh', () => { hovered = picked = null; sync(); });
  sync();
})();

// Industries: while a card expands, keep it fully on screen frame by frame so the rail scrolls in step
// with the growth (rather than expanding first and sliding afterwards).
(() => {
  document.querySelectorAll(".trusted-rail").forEach(rail => {
    rail.addEventListener("change", event => {
      const card = event.target.closest(".trusted-card");
      if (!card) return;
      const reduced = matchMedia("(prefers-reduced-motion: reduce)").matches;
      const end = performance.now() + (reduced ? 0 : 520);
      const follow = () => {
        const edge = card.getBoundingClientRect();
        const view = rail.getBoundingClientRect();
        const visibleRight = Math.min(view.right, document.documentElement.clientWidth);
        if (edge.right > visibleRight - 20) rail.scrollLeft += edge.right - visibleRight + 20;
        else if (edge.left < view.left) rail.scrollLeft += edge.left - view.left;
        if (performance.now() < end) requestAnimationFrame(follow);
      };
      follow();
    });
  });
})();

// Industries: with a mouse, a card opens on hover (a short delay avoids flicker while the pointer
// passes over cards); touch and keyboard still select by tap or arrow keys.
(() => {
  const canHover = window.matchMedia('(hover: hover) and (pointer: fine)');
  document.querySelectorAll('.trusted-card').forEach(card => {
    const radio = card.querySelector('.trusted-select');
    const trigger = card.querySelector('.trusted-trigger');
    if (!radio || !trigger) return;
    let timer;
    card.addEventListener('mouseenter', () => {
      if (!canHover.matches || radio.checked) return;
      // Select without clicking the label: that would focus the hidden radio and scroll the page to it.
      timer = setTimeout(() => {
        radio.checked = true;
        radio.dispatchEvent(new Event('change', { bubbles: true }));
        card.click();
      }, 90);
    });
    card.addEventListener('mouseleave', () => clearTimeout(timer));
  });
})();

// Home materials carousel: round prev/next buttons (visible only while the cards scroll sideways).
(() => {
  const track = document.querySelector('.home-materials .material-cards');
  const buttons = [...document.querySelectorAll('[data-materials-nav]')];
  if (!track || !buttons.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    const max = track.scrollWidth - track.clientWidth - 1;
    buttons.forEach(button => { button.disabled = Number(button.dataset.materialsNav) < 0 ? track.scrollLeft <= 1 : track.scrollLeft >= max; });
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const card = track.querySelector('.mat-card');
    const step = card ? card.getBoundingClientRect().width + 12 : track.clientWidth;
    track.scrollBy({ left: step * Number(button.dataset.materialsNav), behavior: reduced.matches ? 'instant' : 'smooth' });
  }));
  track.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
})();

// Home industries carousel: round prev/next buttons next to "View all Industries" scroll the card rail.
(() => {
  const rail = document.querySelector('.trusted-rail');
  const buttons = [...document.querySelectorAll('[data-trusted-nav]')];
  if (!rail || !buttons.length) return;
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const update = () => {
    const max = rail.scrollWidth - rail.clientWidth - 1;
    buttons.forEach(button => { button.disabled = Number(button.dataset.trustedNav) < 0 ? rail.scrollLeft <= 1 : rail.scrollLeft >= max; });
  };
  buttons.forEach(button => button.addEventListener('click', () => {
    const card = rail.querySelector('.trusted-card:not(.is-expanded)') || rail.querySelector('.trusted-card');
    const step = card ? card.getBoundingClientRect().width + 24 : rail.clientWidth;
    rail.scrollBy({ left: step * Number(button.dataset.trustedNav), behavior: reduced.matches ? 'instant' : 'smooth' });
  }));
  rail.addEventListener('scroll', () => requestAnimationFrame(update), { passive: true });
  rail.addEventListener('transitionend', update);
  window.addEventListener('resize', update);
  window.addEventListener('load', update);
  update();
})();

// Coors family story: the progress bars switch the slide (arrow keys too); it advances itself while idle.
(() => {
  const story = document.querySelector('.coors-story');
  if (!story) return;
  const slides = [...story.querySelectorAll('.coors-slide')];
  const tabs = [...story.querySelectorAll('.coors-progress button')];
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  let index = 0, timer, paused = false;
  const show = next => {
    index = (next + slides.length) % slides.length;
    slides.forEach((slide, i) => {
      slide.classList.toggle('is-active', i === index);
      slide.inert = i !== index;
    });
    tabs.forEach((tab, i) => {
      tab.classList.toggle('is-active', i === index);
      tab.setAttribute('aria-selected', String(i === index));
      tab.tabIndex = i === index ? 0 : -1;
    });
  };
  const schedule = () => {
    clearTimeout(timer);
    if (reduced.matches || paused) return;
    timer = setTimeout(() => { show(index + 1); schedule(); }, 9000);
  };
  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => { show(i); schedule(); });
    tab.addEventListener('keydown', event => {
      const step = { ArrowRight: 1, ArrowDown: 1, ArrowLeft: -1, ArrowUp: -1 }[event.key];
      if (!step) return;
      event.preventDefault();
      show(index + step); tabs[index].focus(); schedule();
    });
  });
  story.addEventListener('mouseenter', () => { paused = true; clearTimeout(timer); });
  story.addEventListener('mouseleave', () => { paused = false; schedule(); });
  story.addEventListener('focusin', () => { paused = true; clearTimeout(timer); });
  story.addEventListener('focusout', () => { paused = false; schedule(); });
  show(0);
  schedule();
})();

// In-page anchors (#id) scroll to their target without adding the hash to the URL. A link to
// another page's anchor opens that page without the hash, then scrolls to the section once loaded.
(() => {
  const KEY = 'mjb-scroll-target';
  const reduced = window.matchMedia('(prefers-reduced-motion: reduce)');
  const samePage = url => url.origin === location.origin && url.pathname.replace(/index.html$/, '') === location.pathname.replace(/index.html$/, '');
  const scrollToId = (id, smooth) => {
    const target = id && document.getElementById(decodeURIComponent(id));
    if (!target) return false;
    const behavior = smooth && !reduced.matches ? 'smooth' : 'auto';
    if (target.classList.contains('is-pinned')) {
      // A pinned section (About journey) holds its content centred once it sticks; land exactly where the pin
      // begins so the timeline is centred on screen with nothing filled yet.
      const style = getComputedStyle(target);
      const pinTop = parseFloat(style.getPropertyValue('--pin-top')) || 0;
      const top = target.getBoundingClientRect().top + window.scrollY + (parseFloat(style.paddingTop) || 0) - pinTop;
      window.scrollTo({ top: Math.max(top, 0), behavior });
    } else {
      target.scrollIntoView({ behavior, block: 'start' });
    }
    if (!target.matches('a, button, input, select, textarea, [tabindex]')) target.setAttribute('tabindex', '-1');
    target.focus({ preventScroll: true });
    return true;
  };
  document.addEventListener('click', event => {
    if (event.defaultPrevented || event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey) return;
    const link = event.target.closest?.('a[href]');
    if (!link || (link.target && link.target !== '_self') || link.hasAttribute('download')) return;
    const href = link.getAttribute('href');
    if (!href || !href.includes('#') || /^(mailto|tel):/i.test(href)) return;
    let url;
    try { url = new URL(href, location.href); } catch { return; }
    const id = url.hash.slice(1);
    if (url.origin !== location.origin) return;
    if (!id) { if (href === '#') event.preventDefault(); return; }
    event.preventDefault();
    if (samePage(url)) {
      scrollToId(id, true);
    } else {
      try { sessionStorage.setItem(KEY, id); } catch { /* storage blocked: fall back to the plain hash */ location.href = url.href; return; }
      location.href = url.origin + url.pathname + url.search;
    }
  });
  const arrive = () => {
    let id = location.hash.slice(1);
    try { id = sessionStorage.getItem(KEY) || id; sessionStorage.removeItem(KEY); } catch { /* ignore */ }
    if (!id) return;
    const go = () => { if (scrollToId(id, false) && location.hash) history.replaceState(null, '', location.pathname + location.search); };
    go();
    window.addEventListener('load', () => { go(); if (document.fonts) document.fonts.ready.then(go); }, { once: true });
  };
  arrive();
})();

// Footer copyright year.
document.querySelectorAll('[data-year]').forEach(el => { el.textContent = new Date().getFullYear(); });

// Industry cards (narrow screens): when a scroll settles, the card most in view opens, so swiping to the next card expands it.
(() => {
  const narrow = window.matchMedia("(max-width: 767px)");
  document.querySelectorAll(".trusted-rail").forEach(rail => {
  const radios = [...rail.querySelectorAll('.trusted-select')];
  let timer;
  let busyUntil = 0;
  rail.addEventListener('change', () => { busyUntil = performance.now() + 800; });
  rail.addEventListener('scroll', () => {
    if (!narrow.matches) return;
    clearTimeout(timer);
    timer = setTimeout(() => {
      if (performance.now() < busyUntil) return;
      const view = rail.getBoundingClientRect();
      const visible = radios.map(radio => {
        const box = radio.closest('.trusted-card').getBoundingClientRect();
        return Math.max(0, Math.min(box.right, view.right) - Math.max(box.left, view.left));
      });
      const best = visible.indexOf(Math.max(...visible));
      if (best > -1 && !radios[best].checked) {
        radios[best].checked = true;
        radios[best].dispatchEvent(new Event('change', { bubbles: true }));
      }
    }, 90);
  }, { passive: true });
  });
})();

// About community carousel: controls, keyboard navigation, and swipe synchronization.
(() => {
 const carousel=document.querySelector('.community-carousel');
 if(!carousel)return;
 const track=carousel.querySelector('.community-track');
 const buttons=[...carousel.querySelectorAll('[data-community-slide]')];
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 let current=0,queued=false;
 const select=index=>track.scrollTo({left:track.clientWidth*index,behavior:reduced.matches?'instant':'smooth'});
 buttons.forEach((button,index)=>button.addEventListener('click',()=>select(index)));
 track.addEventListener('keydown',event=>{
  if(event.target!==track)return;
  if(event.key==='ArrowRight'||event.key==='ArrowLeft'){event.preventDefault();select(Math.max(0,Math.min(buttons.length-1,current+(event.key==='ArrowRight'?1:-1))));}
 });
 track.addEventListener('scroll',()=>{
  if(queued)return;queued=true;
  requestAnimationFrame(()=>{queued=false;current=Math.round(track.scrollLeft/track.clientWidth);buttons.forEach((button,index)=>button.setAttribute('aria-pressed',String(index===current)));});
 },{passive:true});
 window.addEventListener('resize',()=>track.scrollTo({left:track.clientWidth*current,behavior:'instant'}));
})();
