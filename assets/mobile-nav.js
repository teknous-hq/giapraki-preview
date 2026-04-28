/* giapraki preview · mobile hamburger drawer
   Auto-injects:
     - hamburger button into header.site .nav
     - slide-down drawer with brand, search, nav links, auth row
   Behavior:
     - Tap link / × / backdrop / ESC / scroll → close
     - Body scroll lock while open
     - Active page highlighted via filename match
*/
(function () {
  'use strict';

  const NAV_LINKS = [
    { href: 'home.html',     label: 'Αρχική',           icon: '🏠' },
    { href: 'stores.html',   label: 'Εστιατόρια',       icon: '🍽️' },
    { href: 'store.html',    label: 'Πίτσα Ντι Νάπολη', icon: '🍕' },
    { href: 'checkout.html', label: 'Ολοκλήρωση',       icon: '🧾' },
    { href: 'track.html',    label: 'Παραγγελία μου',   icon: '🛵' },
  ];

  function currentPage() {
    const m = (location.pathname || '').match(/([^/]+\.html)$/);
    return m ? m[1] : 'home.html';
  }

  function build() {
    const nav = document.querySelector('header.site .nav');
    if (!nav || document.querySelector('.gpn-burger')) return;

    // Hamburger button
    const burger = document.createElement('button');
    burger.type = 'button';
    burger.className = 'gpn-burger';
    burger.setAttribute('aria-label', 'Άνοιγμα μενού');
    burger.setAttribute('aria-expanded', 'false');
    burger.setAttribute('aria-controls', 'gpn-drawer');
    burger.innerHTML = `
      <span class="gpn-bar" aria-hidden="true"></span>
      <span class="gpn-bar" aria-hidden="true"></span>
      <span class="gpn-bar" aria-hidden="true"></span>
    `;
    nav.appendChild(burger);

    // Backdrop
    const backdrop = document.createElement('div');
    backdrop.className = 'gpn-backdrop';
    backdrop.setAttribute('aria-hidden', 'true');
    document.body.appendChild(backdrop);

    // Drawer
    const drawer = document.createElement('aside');
    drawer.className = 'gpn-drawer';
    drawer.id = 'gpn-drawer';
    drawer.setAttribute('role', 'dialog');
    drawer.setAttribute('aria-modal', 'true');
    drawer.setAttribute('aria-label', 'Μενού');
    drawer.setAttribute('aria-hidden', 'true');

    const cur = currentPage();

    drawer.innerHTML = `
      <div class="gpn-drawer-head">
        <a href="home.html" class="gpn-brand" aria-label="giapraki αρχική">
          <img src="../assets/favicon.svg" alt="">
          <span>giapraki</span>
        </a>
        <button type="button" class="gpn-drawer-close" aria-label="Κλείσιμο μενού">×</button>
      </div>
      <form class="gpn-drawer-search" role="search" onsubmit="return false;">
        <input type="search" id="gpn-search-input" placeholder="Ψάξε μαγαζί ή πιάτο…" aria-label="Αναζήτηση">
        <button type="button">Αναζήτηση</button>
      </form>
      <nav class="gpn-drawer-nav" aria-label="Πλοήγηση">
        ${NAV_LINKS.map((l) => `
          <a href="${l.href}"${l.href === cur ? ' class="is-active" aria-current="page"' : ''}>
            <span class="gpn-icon" aria-hidden="true">${l.icon}</span>
            <span>${l.label}</span>
          </a>
        `).join('')}
        <div class="gpn-divider" role="presentation"></div>
        <a href="#"><span class="gpn-icon" aria-hidden="true">📍</span><span>Κοζάνη · αλλαγή πόλης</span></a>
        <a href="#"><span class="gpn-icon" aria-hidden="true">❓</span><span>Βοήθεια</span></a>
      </nav>
      <div class="gpn-drawer-auth">
        <a href="#" class="gpn-btn-ghost">Σύνδεση</a>
        <a href="#" class="gpn-btn-primary">Εγγραφή</a>
      </div>
    `;
    document.body.appendChild(drawer);

    // ===== Open / close =====
    let lastScrollY = 0;
    let scrollCloseBound = false;
    const scrollOpenThreshold = 8; // px movement to trigger close

    function open() {
      drawer.classList.add('is-open');
      backdrop.classList.add('is-open');
      burger.classList.add('is-open');
      burger.setAttribute('aria-expanded', 'true');
      burger.setAttribute('aria-label', 'Κλείσιμο μενού');
      drawer.setAttribute('aria-hidden', 'false');
      backdrop.setAttribute('aria-hidden', 'false');
      // body scroll lock
      lastScrollY = window.scrollY;
      document.documentElement.classList.add('gpn-locked');
      document.body.classList.add('gpn-locked');
      // close on outer scroll (use wheel + touchmove as proxies, since scroll is locked)
      if (!scrollCloseBound) {
        scrollCloseBound = true;
        window.addEventListener('wheel', maybeCloseOnScroll, { passive: true });
        window.addEventListener('touchmove', maybeCloseOnScroll, { passive: true });
      }
      // focus first link
      setTimeout(() => {
        const first = drawer.querySelector('.gpn-drawer-nav a');
        if (first) first.focus({ preventScroll: true });
      }, 60);
    }

    function close() {
      drawer.classList.remove('is-open');
      backdrop.classList.remove('is-open');
      burger.classList.remove('is-open');
      burger.setAttribute('aria-expanded', 'false');
      burger.setAttribute('aria-label', 'Άνοιγμα μενού');
      drawer.setAttribute('aria-hidden', 'true');
      backdrop.setAttribute('aria-hidden', 'true');
      document.documentElement.classList.remove('gpn-locked');
      document.body.classList.remove('gpn-locked');
      if (scrollCloseBound) {
        scrollCloseBound = false;
        window.removeEventListener('wheel', maybeCloseOnScroll);
        window.removeEventListener('touchmove', maybeCloseOnScroll);
      }
    }

    function maybeCloseOnScroll(e) {
      // Allow scroll inside drawer; close only if event came from outside it
      if (drawer.contains(e.target)) return;
      close();
    }

    function isOpen() { return drawer.classList.contains('is-open'); }

    burger.addEventListener('click', () => (isOpen() ? close() : open()));
    backdrop.addEventListener('click', close);
    drawer.querySelector('.gpn-drawer-close').addEventListener('click', close);

    // Close when nav link tapped
    drawer.querySelectorAll('.gpn-drawer-nav a, .gpn-drawer-auth a, .gpn-drawer-head .gpn-brand').forEach((a) => {
      a.addEventListener('click', () => {
        // small timeout so the navigation can start
        setTimeout(close, 30);
      });
    });

    // ESC
    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape' && isOpen()) close();
    });

    // Search submit (no-op but close)
    drawer.querySelector('.gpn-drawer-search button').addEventListener('click', () => {
      // demo: just close
      close();
    });
    drawer.querySelector('.gpn-drawer-search input').addEventListener('keydown', (e) => {
      if (e.key === 'Enter') { e.preventDefault(); close(); }
    });

    // Resize: if grew above breakpoint, force close + clear lock
    let resizeT;
    window.addEventListener('resize', () => {
      clearTimeout(resizeT);
      resizeT = setTimeout(() => {
        if (window.innerWidth > 700 && isOpen()) close();
      }, 80);
    });

    // expose
    window.GpNav = { open, close, isOpen };
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', build);
  } else {
    build();
  }
})();
