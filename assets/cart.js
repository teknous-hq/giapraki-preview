/* giapraki preview · shared cart (localStorage) */
(function () {
  'use strict';

  const STORAGE_KEY = 'giapraki_cart';
  const RESTAURANT_KEY = 'giapraki_restaurant';
  const ORDER_KEY = 'giapraki_last_order';

  const fmtEUR = (n) => '€' + (Math.round(n * 100) / 100).toFixed(2).replace('.', ',');

  function loadCart() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      return [];
    }
  }
  function saveCart(c) {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(c));
    document.dispatchEvent(new CustomEvent('cart:change'));
  }
  function loadRestaurant() {
    try {
      const raw = localStorage.getItem(RESTAURANT_KEY);
      return raw ? JSON.parse(raw) : { name: 'Πίτσα Ντι Νάπολη', minOrder: 10, deliveryFee: 0 };
    } catch (e) {
      return { name: 'Πίτσα Ντι Νάπολη', minOrder: 10, deliveryFee: 0 };
    }
  }
  function saveRestaurant(r) {
    localStorage.setItem(RESTAURANT_KEY, JSON.stringify(r));
  }

  const Cart = {
    items: loadCart(),
    restaurant: loadRestaurant(),

    addItem(item) {
      // item: {id,name,price,qty,notes,img}
      const existing = this.items.find(
        (x) => x.id === item.id && (x.notes || '') === (item.notes || '')
      );
      if (existing) {
        existing.qty += item.qty;
      } else {
        this.items.push({ ...item });
      }
      saveCart(this.items);
    },
    setQty(idx, qty) {
      if (qty <= 0) {
        this.items.splice(idx, 1);
      } else {
        this.items[idx].qty = qty;
      }
      saveCart(this.items);
    },
    remove(idx) {
      this.items.splice(idx, 1);
      saveCart(this.items);
    },
    clear() {
      this.items = [];
      saveCart(this.items);
    },
    subtotal() {
      return this.items.reduce((s, x) => s + x.price * x.qty, 0);
    },
    count() {
      return this.items.reduce((s, x) => s + x.qty, 0);
    },
    setRestaurant(r) {
      this.restaurant = { ...this.restaurant, ...r };
      saveRestaurant(this.restaurant);
    },
    fmt: fmtEUR,
  };

  /* ===== Cart drawer (injected once) ===== */
  function ensureDrawer() {
    if (document.getElementById('gp-drawer')) return;
    const root = document.createElement('div');
    root.id = 'gp-drawer-root';
    root.innerHTML = `
      <div id="gp-drawer-backdrop" class="gp-backdrop" hidden></div>
      <aside id="gp-drawer" class="gp-drawer" hidden role="dialog" aria-label="Καλάθι" aria-modal="true">
        <header class="gp-drawer-head">
          <h2>Το καλάθι σου</h2>
          <button class="gp-close" aria-label="Κλείσιμο" data-gp-close>×</button>
        </header>
        <div class="gp-drawer-body">
          <div class="gp-restaurant" id="gp-d-restaurant"></div>
          <div id="gp-d-list" class="gp-d-list"></div>
          <div id="gp-d-empty" class="gp-d-empty">Άδειο καλάθι. Διάλεξε κάτι νόστιμο.</div>
        </div>
        <footer class="gp-drawer-foot" id="gp-d-foot">
          <div class="gp-d-totals">
            <div><span>Υποσύνολο</span><span id="gp-d-subtotal">€0,00</span></div>
            <div><span>Παράδοση</span><span id="gp-d-delivery">Δωρεάν</span></div>
            <div class="gp-d-total"><span>Σύνολο</span><span id="gp-d-total">€0,00</span></div>
          </div>
          <a href="checkout.html" class="gp-d-cta" id="gp-d-cta">Συνέχεια στην παραγγελία ▸</a>
        </footer>
      </aside>

      <button id="gp-cart-pill" class="gp-cart-pill" hidden type="button" aria-label="Άνοιγμα καλαθιού">
        <span class="gp-pill-icon">🛒</span>
        <span class="gp-pill-text"><b id="gp-pill-count">0</b> προϊόντα · <span id="gp-pill-total">€0,00</span></span>
        <span class="gp-pill-cta">Καλάθι ▸</span>
      </button>

      <div id="gp-modal-backdrop" class="gp-backdrop" hidden></div>
      <div id="gp-modal" class="gp-modal" hidden role="dialog" aria-modal="true" aria-label="Προσθήκη στο καλάθι">
        <button class="gp-close" aria-label="Κλείσιμο" data-gp-close-modal>×</button>
        <div class="gp-modal-img" id="gp-m-img"></div>
        <div class="gp-modal-body">
          <h3 id="gp-m-name"></h3>
          <p id="gp-m-desc"></p>
          <label class="gp-m-label" for="gp-m-notes">Σημείωση (προαιρετικό)</label>
          <textarea id="gp-m-notes" placeholder="Πχ. χωρίς κρεμμύδι, λίγο ψημένο…"></textarea>
          <div class="gp-m-row">
            <div class="gp-m-qty">
              <button type="button" id="gp-m-minus" aria-label="Μείωση">−</button>
              <span id="gp-m-qty">1</span>
              <button type="button" id="gp-m-plus" aria-label="Αύξηση">+</button>
            </div>
            <button type="button" id="gp-m-add" class="gp-m-add"></button>
          </div>
        </div>
      </div>
    `;
    document.body.appendChild(root);

    // wire close
    document.getElementById('gp-drawer-backdrop').addEventListener('click', closeDrawer);
    document.querySelectorAll('[data-gp-close]').forEach((b) => b.addEventListener('click', closeDrawer));
    document.getElementById('gp-modal-backdrop').addEventListener('click', closeModal);
    document.querySelectorAll('[data-gp-close-modal]').forEach((b) => b.addEventListener('click', closeModal));
    document.getElementById('gp-cart-pill').addEventListener('click', openDrawer);

    document.addEventListener('keydown', (e) => {
      if (e.key === 'Escape') {
        if (!document.getElementById('gp-modal').hidden) closeModal();
        else if (!document.getElementById('gp-drawer').hidden) closeDrawer();
      }
    });
  }

  function openDrawer() {
    ensureDrawer();
    renderDrawer();
    document.getElementById('gp-drawer-backdrop').hidden = false;
    document.getElementById('gp-drawer').hidden = false;
    requestAnimationFrame(() => document.getElementById('gp-drawer').classList.add('open'));
  }
  function closeDrawer() {
    const d = document.getElementById('gp-drawer');
    if (!d) return;
    d.classList.remove('open');
    setTimeout(() => {
      d.hidden = true;
      document.getElementById('gp-drawer-backdrop').hidden = true;
    }, 200);
  }

  let modalState = null;
  function openModal(item) {
    ensureDrawer();
    modalState = { ...item, qty: 1, notes: '' };
    document.getElementById('gp-m-name').textContent = item.name;
    document.getElementById('gp-m-desc').textContent = item.desc || '';
    const img = document.getElementById('gp-m-img');
    img.style.backgroundImage = item.img ? `url('${item.img}')` : '';
    document.getElementById('gp-m-notes').value = '';
    document.getElementById('gp-m-qty').textContent = '1';
    updateModalCTA();
    document.getElementById('gp-modal-backdrop').hidden = false;
    document.getElementById('gp-modal').hidden = false;
    requestAnimationFrame(() => document.getElementById('gp-modal').classList.add('open'));
  }
  function closeModal() {
    const m = document.getElementById('gp-modal');
    if (!m) return;
    m.classList.remove('open');
    setTimeout(() => {
      m.hidden = true;
      document.getElementById('gp-modal-backdrop').hidden = true;
    }, 180);
  }
  function updateModalCTA() {
    if (!modalState) return;
    const total = modalState.price * modalState.qty;
    document.getElementById('gp-m-add').textContent =
      `Προσθήκη στο καλάθι · ${fmtEUR(total)}`;
  }

  function renderDrawer() {
    const list = document.getElementById('gp-d-list');
    const empty = document.getElementById('gp-d-empty');
    const foot = document.getElementById('gp-d-foot');
    const rest = document.getElementById('gp-d-restaurant');
    if (!list) return;

    rest.textContent = Cart.restaurant.name ? `από ${Cart.restaurant.name}` : '';

    if (Cart.items.length === 0) {
      list.innerHTML = '';
      empty.hidden = false;
      foot.hidden = true;
      return;
    }
    empty.hidden = true;
    foot.hidden = false;

    list.innerHTML = Cart.items
      .map((it, i) => `
        <article class="gp-line" data-idx="${i}">
          <div class="gp-line-name">
            <strong>${escapeHTML(it.name)}</strong>
            ${it.notes ? `<em class="gp-line-notes">«${escapeHTML(it.notes)}»</em>` : ''}
          </div>
          <div class="gp-line-controls">
            <div class="gp-line-qty">
              <button type="button" data-act="minus" aria-label="Μείωση">−</button>
              <span>${it.qty}</span>
              <button type="button" data-act="plus" aria-label="Αύξηση">+</button>
            </div>
            <div class="gp-line-price">${fmtEUR(it.price * it.qty)}</div>
            <button type="button" class="gp-line-remove" data-act="remove" aria-label="Αφαίρεση">✕</button>
          </div>
        </article>
      `)
      .join('');

    list.querySelectorAll('.gp-line').forEach((line) => {
      const idx = parseInt(line.dataset.idx, 10);
      line.querySelectorAll('[data-act]').forEach((btn) => {
        btn.addEventListener('click', () => {
          const act = btn.dataset.act;
          const cur = Cart.items[idx];
          if (!cur) return;
          if (act === 'plus') Cart.setQty(idx, cur.qty + 1);
          else if (act === 'minus') Cart.setQty(idx, cur.qty - 1);
          else if (act === 'remove') Cart.remove(idx);
          renderDrawer();
        });
      });
    });

    const sub = Cart.subtotal();
    const dlv = Cart.restaurant.deliveryFee || 0;
    document.getElementById('gp-d-subtotal').textContent = fmtEUR(sub);
    document.getElementById('gp-d-delivery').textContent = dlv > 0 ? fmtEUR(dlv) : 'Δωρεάν';
    document.getElementById('gp-d-total').textContent = fmtEUR(sub + dlv);
  }

  function renderPill() {
    ensureDrawer();
    const pill = document.getElementById('gp-cart-pill');
    if (!pill) return;
    const count = Cart.count();
    const sub = Cart.subtotal();
    if (count === 0) {
      pill.hidden = true;
      return;
    }
    pill.hidden = false;
    document.getElementById('gp-pill-count').textContent = count;
    document.getElementById('gp-pill-total').textContent = fmtEUR(sub);
  }

  function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, (c) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
    }[c]));
  }

  /* ===== Modal interactions wiring (one-time) ===== */
  function wireModalControls() {
    const minus = document.getElementById('gp-m-minus');
    const plus = document.getElementById('gp-m-plus');
    const add = document.getElementById('gp-m-add');
    const notes = document.getElementById('gp-m-notes');
    if (!minus) return;
    minus.addEventListener('click', () => {
      if (!modalState) return;
      if (modalState.qty > 1) {
        modalState.qty--;
        document.getElementById('gp-m-qty').textContent = modalState.qty;
        updateModalCTA();
      }
    });
    plus.addEventListener('click', () => {
      if (!modalState) return;
      modalState.qty++;
      document.getElementById('gp-m-qty').textContent = modalState.qty;
      updateModalCTA();
    });
    notes.addEventListener('input', () => {
      if (!modalState) return;
      modalState.notes = notes.value.trim();
    });
    add.addEventListener('click', () => {
      if (!modalState) return;
      Cart.addItem({
        id: modalState.id,
        name: modalState.name,
        price: modalState.price,
        qty: modalState.qty,
        notes: modalState.notes || '',
        img: modalState.img || '',
      });
      closeModal();
      renderPill();
      // brief flash on pill
      const pill = document.getElementById('gp-cart-pill');
      if (pill) {
        pill.classList.add('flash');
        setTimeout(() => pill.classList.remove('flash'), 600);
      }
    });
  }

  /* ===== Auto-bind menu items via [data-gp-item] ===== */
  function bindMenuItems() {
    document.querySelectorAll('[data-gp-add]').forEach((btn) => {
      if (btn.__gpBound) return;
      btn.__gpBound = true;
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        const card = btn.closest('[data-gp-item]') || btn;
        const item = {
          id: card.dataset.gpId || btn.dataset.gpId || ('x' + Math.random().toString(36).slice(2, 8)),
          name: card.dataset.gpName || btn.dataset.gpName || 'Item',
          price: parseFloat(card.dataset.gpPrice || btn.dataset.gpPrice || '0'),
          desc: card.dataset.gpDesc || '',
          img: card.dataset.gpImg || '',
        };
        openModal(item);
      });
    });
  }

  document.addEventListener('cart:change', () => {
    renderPill();
    if (!document.getElementById('gp-drawer').hidden) renderDrawer();
  });

  document.addEventListener('DOMContentLoaded', () => {
    ensureDrawer();
    wireModalControls();
    bindMenuItems();
    renderPill();
  });

  // expose for pages that want direct access
  window.GpCart = Cart;
  window.GpCartUI = { openDrawer, closeDrawer, openModal, renderPill, renderDrawer };
  window.GpCart.STORAGE_KEY = STORAGE_KEY;
  window.GpCart.ORDER_KEY = ORDER_KEY;
})();
