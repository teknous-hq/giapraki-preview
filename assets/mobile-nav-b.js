/* B-clean mobile nav — hamburger drawer
 * Reads existing <ul> nav links + coral CTA from .site-header.
 * Builds drawer + backdrop + burger.
 * Open: tap burger. Close: tap link / backdrop / ESC / × / scroll.
 */
(function () {
  'use strict';

  const MOBILE_MAX = 700;
  let burger, drawer, backdrop, isOpen = false;
  let scrollCloseAttached = false;

  function isMobile() {
    return window.matchMedia('(max-width: ' + MOBILE_MAX + 'px)').matches;
  }

  function lockBody(lock) {
    document.body.classList.toggle('mnav-locked', !!lock);
  }

  function open() {
    if (isOpen) return;
    isOpen = true;
    burger.classList.add('is-active');
    burger.setAttribute('aria-expanded', 'true');
    drawer.removeAttribute('hidden');
    backdrop.removeAttribute('hidden');
    // force reflow so transition fires
    void drawer.offsetWidth;
    backdrop.classList.add('open');
    drawer.classList.add('open');
    lockBody(true);
    // Close on scroll (after open) — debounced via flag
    if (!scrollCloseAttached) {
      window.addEventListener('scroll', onScrollClose, { passive: true });
      scrollCloseAttached = true;
    }
    // Focus first link
    setTimeout(() => {
      const first = drawer.querySelector('.mnav-list a');
      if (first) first.focus();
    }, 50);
  }

  function close() {
    if (!isOpen) return;
    isOpen = false;
    burger.classList.remove('is-active');
    burger.setAttribute('aria-expanded', 'false');
    backdrop.classList.remove('open');
    drawer.classList.remove('open');
    lockBody(false);
    if (scrollCloseAttached) {
      window.removeEventListener('scroll', onScrollClose);
      scrollCloseAttached = false;
    }
    // Hide after transition for a11y
    setTimeout(() => {
      if (!isOpen) {
        drawer.setAttribute('hidden', '');
        backdrop.setAttribute('hidden', '');
      }
    }, 240);
  }

  function toggle() { isOpen ? close() : open(); }

  function onScrollClose() {
    // close on any meaningful scroll
    close();
  }

  function buildDrawer(headerNav) {
    const ul = headerNav.querySelector('ul');
    const actions = headerNav.querySelector('.actions');
    const links = ul ? Array.from(ul.querySelectorAll('a')) : [];
    const coralCTA = actions ? actions.querySelector('.btn-coral') : null;

    // Burger button
    burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'mnav-burger';
    burger.setAttribute('aria-label', 'Άνοιγμα μενού');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'mnav-drawer');
    burger.innerHTML = '<span class="mnav-bars"><span></span><span></span><span></span></span>';
    burger.addEventListener('click', toggle);

    // Optional mobile coral CTA (visible in header on mobile)
    let mobileCTA = null;
    if (coralCTA) {
      mobileCTA = document.createElement('a');
      mobileCTA.className = 'nav-cta-mobile';
      mobileCTA.href = coralCTA.getAttribute('href') || '#';
      // strip the ▸ arrow span if present, keep text only — short label
      const text = (coralCTA.textContent || '').replace(/[▸→]/g, '').trim();
      mobileCTA.textContent = text || 'Παράγγειλε';
    }

    // Append to nav: CTA (if any) + burger
    if (mobileCTA) headerNav.appendChild(mobileCTA);
    headerNav.appendChild(burger);

    // Drawer
    drawer = document.createElement('aside');
    drawer.id = 'mnav-drawer';
    drawer.className = 'mnav-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Μενού πλοήγησης');
    drawer.setAttribute('hidden', '');

    // Head
    const head = document.createElement('div');
    head.className = 'mnav-drawer-head';
    const brandSrc = document.querySelector('.site-header .brand');
    const brandHTML = brandSrc
      ? `<a href="${brandSrc.getAttribute('href') || 'home.html'}" class="brand">
           <object class="mark" data="../assets/favicon.svg" type="image/svg+xml" aria-hidden="true"></object>
           <span class="word">giapraki</span>
         </a>`
      : '<span class="word">giapraki</span>';
    head.innerHTML = brandHTML +
      '<button type="button" class="mnav-close" aria-label="Κλείσιμο">×</button>';

    // CTA row (coral first if exists)
    let ctaRow = null;
    if (coralCTA) {
      ctaRow = document.createElement('div');
      ctaRow.className = 'mnav-cta-row';
      const ctaHref = coralCTA.getAttribute('href') || '#';
      const ctaText = (coralCTA.textContent || '').replace(/[▸→]/g, '').trim() || 'Παράγγειλε';
      ctaRow.innerHTML = `<a class="btn btn-coral" href="${ctaHref}">${ctaText} <span aria-hidden="true">▸</span></a>`;
    }

    // Body — links list
    const body = document.createElement('div');
    body.className = 'mnav-drawer-body';
    const list = document.createElement('ul');
    list.className = 'mnav-list';
    list.setAttribute('role', 'list');

    if (links.length === 0) {
      // Fallback links if header had no <ul>
      const fallback = [
        ['home.html', 'Γειτονιά'],
        ['stores.html', 'Εστιατόρια'],
        ['home.html#how', 'Πώς λειτουργεί'],
        ['#', 'Σύνδεση'],
      ];
      fallback.forEach(([h, t]) => {
        const li = document.createElement('li');
        li.innerHTML = `<a href="${h}">${t}</a>`;
        list.appendChild(li);
      });
    } else {
      links.forEach((a) => {
        const li = document.createElement('li');
        const newA = document.createElement('a');
        newA.href = a.getAttribute('href') || '#';
        newA.textContent = (a.textContent || '').trim();
        // mirror "active" state if present
        const styleColor = a.getAttribute('style') || '';
        if (styleColor.includes('var(--ink)') || a.classList.contains('active')) {
          newA.classList.add('active');
        }
        li.appendChild(newA);
        list.appendChild(li);
      });
    }
    body.appendChild(list);

    // Foot — small note
    const foot = document.createElement('div');
    foot.className = 'mnav-drawer-foot';
    foot.textContent = 'giapraki · Κοζάνη';

    drawer.appendChild(head);
    if (ctaRow) drawer.appendChild(ctaRow);
    drawer.appendChild(body);
    drawer.appendChild(foot);

    // Backdrop
    backdrop = document.createElement('div');
    backdrop.className = 'mnav-backdrop';
    backdrop.setAttribute('hidden', '');

    document.body.appendChild(backdrop);
    document.body.appendChild(drawer);

    // Wire close events
    head.querySelector('.mnav-close').addEventListener('click', close);
    backdrop.addEventListener('click', close);
    list.querySelectorAll('a').forEach((a) => {
      a.addEventListener('click', () => {
        // If link goes elsewhere, close before navigation; if hash → close after
        close();
      });
    });
    if (ctaRow) {
      ctaRow.querySelector('a').addEventListener('click', close);
    }

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen) close();
    });

    // Resize: if grew past breakpoint, close
    window.addEventListener('resize', () => {
      if (!isMobile() && isOpen) close();
    });
  }

  function init() {
    const headerNav = document.querySelector('.site-header .nav');
    if (!headerNav) return;
    if (headerNav.querySelector('.mnav-burger')) return; // already built
    buildDrawer(headerNav);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }
})();
