(function () {
  var MAX_MOVIL = 560;       // el marco móvil (390) no crece más allá de este ancho
  var ALTO_TARJETA_M = 1156; // alto de la tarjeta móvil en Figma (Sandbox Explora)
  // Destino del formulario: correo que recibe las solicitudes.
  var CORREO_CONTACTO = document.documentElement.dataset.correo || '';
  var ASUNTO = 'Quiero más información sobre el Sandbox';

  var lienzos = document.querySelectorAll('.lienzo');
  var sinMovimiento = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  function visible(el) { return el.offsetParent !== null || getComputedStyle(el).display !== 'none'; }

  function escalar() {
    var ancho = document.documentElement.clientWidth;
    lienzos.forEach(function (l) {
      var base = Number(l.dataset.ancho);
      var disponible = base === 390 ? Math.min(ancho, MAX_MOVIL) : ancho;
      l.style.setProperty('--z', disponible / base);
    });
    ajustarTarjetaMovil();
    pasos();
    paralaje();
  }

  // La tarjeta móvil crece con el texto; lo que está debajo baja lo mismo.
  function ajustarTarjetaMovil() {
    var l = document.querySelector('.lienzo-m');
    var t = l && l.querySelector('[data-node-id="24:1306"]');
    if (!t || !t.offsetWidth) return;
    var alto = t.offsetHeight / (t.offsetWidth / 360);
    l.style.setProperty('--extra', Math.max(0, Math.round(alto - ALTO_TARJETA_M)) + 'px');
  }

  // Entradas que se disparan una vez al entrar en pantalla.
  var animados = document.querySelectorAll('.rv, .barra');
  if ('IntersectionObserver' in window) {
    var obs = new IntersectionObserver(function (entradas) {
      entradas.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add('visto'); obs.unobserve(en.target); }
      });
    }, { threshold: 0.15 });
    animados.forEach(function (el) { obs.observe(el); });
  } else {
    animados.forEach(function (el) { el.classList.add('visto'); });
  }

  // Los tres pasos de «¿Cómo funciona?» aparecen según el avance del scroll.
  var listaPasos = document.querySelectorAll('.paso');
  var pendiente = false;
  function pasos() {
    pendiente = false;
    var vh = window.innerHeight;
    listaPasos.forEach(function (el) {
      if (!el.offsetWidth) return;
      if (sinMovimiento) { el.style.setProperty('--p', 1); return; }
      // Entra con una transición propia (CSS) al cruzar el umbral y vuelve a salir al subir.
      var r = el.getBoundingClientRect();
      var escala = r.width / el.offsetWidth || 1;
      var arriba = r.top - (el.dataset.p === '1' ? 0 : 48 * escala); // sin el desplazamiento de entrada
      var p = arriba < vh * 0.82 ? 1 : 0;
      if (el.dataset.p === String(p)) return;
      el.dataset.p = p;
      el.style.setProperty('--p', p);
    });
  }
  // Paralaje: los resplandores y el fondo se mueven a otra velocidad que el scroll.
  var FACTOR = { 'par-a': 0.16, 'par-b': -0.12, 'par-c': 0.22 };
  var capas = [];
  document.querySelectorAll('.par').forEach(function (el) {
    var f = 0;
    Object.keys(FACTOR).forEach(function (k) { if (el.classList.contains(k)) f = FACTOR[k]; });
    capas.push({ el: el, f: f, y: 0 });
  });
  function paralaje() {
    if (sinMovimiento) return;
    var vh = window.innerHeight;
    capas.forEach(function (c) {
      if (!c.el.offsetWidth) return;
      var r = c.el.getBoundingClientRect();
      var escala = r.width / c.el.offsetWidth || 1;
      var centro = r.top + r.height / 2 - c.y * escala - vh / 2; // sin el desplazamiento ya aplicado
      if (centro < -vh * 1.5 || centro > vh * 1.5) return;
      c.y = Math.round(centro * c.f / escala);
      c.el.style.setProperty('--py', c.y + 'px');
    });
  }

  // El astronauta del hero sigue al puntero con suavidad.
  var astro = document.querySelector('.sigue');
  if (astro && !sinMovimiento && window.matchMedia('(hover: hover)').matches) {
    window.addEventListener('mousemove', function (ev) {
      if (window.scrollY > window.innerHeight) return;
      var x = ev.clientX / window.innerWidth - 0.5, y = ev.clientY / window.innerHeight - 0.5;
      astro.style.setProperty('--mx', (x * -44).toFixed(1) + 'px');
      astro.style.setProperty('--my', (y * -30).toFixed(1) + 'px');
    }, { passive: true });
  }

  function cuadro() { pasos(); paralaje(); }
  function alDesplazar() { if (!pendiente) { pendiente = true; requestAnimationFrame(cuadro); } }
  window.addEventListener('scroll', alDesplazar, { passive: true });

  // Pestañas, puntos y contenido de los 4 Sandbox van sincronizados (y entre escritorio y móvil).
  var grupos = [];
  lienzos.forEach(function (l) {
    var tabs = l.querySelectorAll('[data-tab]');
    if (tabs.length < 2) return;
    grupos.push({
      tabs: tabs,
      puntos: l.querySelectorAll('[data-punto]'),
      paneles: l.querySelectorAll('[data-sb]'),
      activa: tabs[0].className,
      inactiva: tabs[1].className
    });
  });
  function elegir(i) {
    grupos.forEach(function (g) {
      g.tabs.forEach(function (t, n) {
        t.className = n === i ? g.activa : g.inactiva;
        t.setAttribute('aria-pressed', n === i ? 'true' : 'false');
      });
      g.puntos.forEach(function (p, n) {
        if (n === i) p.setAttribute('aria-current', 'true'); else p.removeAttribute('aria-current');
      });
      g.paneles.forEach(function (p) { p.hidden = Number(p.dataset.sb) !== i; });
      if (g.tabs[i].scrollIntoView && g.tabs[i].offsetWidth) {
        var caja = g.tabs[i].parentElement;
        if (caja.scrollWidth > caja.clientWidth) caja.scrollLeft = g.tabs[i].offsetLeft - 12;
      }
    });
    ajustarTarjetaMovil();
  }
  grupos.forEach(function (g) {
    g.tabs.forEach(function (t, n) { t.addEventListener('click', function () { elegir(n); }); });
    g.puntos.forEach(function (p, n) { p.addEventListener('click', function () { elegir(n); }); });
  });

  // ?sb=explora|construye|acelera|qa abre la página con ese Sandbox elegido (útil para enlaces y QR).
  var pedido = (new URLSearchParams(location.search).get('sb') || '').toLowerCase();
  var indice = ['explora', 'construye', 'acelera', 'qa'].indexOf(pedido);
  if (indice > 0) elegir(indice);

  // Demo: figura interactiva del Sandbox QA en una ventana sobre la página.
  var demo = document.getElementById('demo');
  if (demo) {
    var marco = demo.querySelector('iframe');
    document.querySelectorAll('[data-demo]').forEach(function (b) {
      b.addEventListener('click', function () {
        if (!marco.getAttribute('src')) marco.setAttribute('src', marco.dataset.src);
        if (demo.showModal) demo.showModal(); else window.open(marco.dataset.src, '_blank');
      });
    });
    demo.querySelector('.demo-cerrar').addEventListener('click', function () { demo.close(); });
    demo.addEventListener('click', function (ev) { if (ev.target === demo) demo.close(); });
  }

  // Formulario por pasos con validación; al terminar abre el correo con la solicitud redactada.
  var MENSAJES = {
    solucion: 'Cuéntanos qué necesitas (mínimo 3 caracteres).',
    nombre: 'Escribe tu nombre.',
    empresa: 'Escribe el nombre de tu empresa.',
    correo: 'Escribe un correo válido, por ejemplo nombre@empresa.com.',
    telefono: 'Usa solo números (entre 7 y 15 dígitos) o déjalo vacío.'
  };
  function validar(campo) {
    var v = campo.value.trim();
    switch (campo.name) {
      case 'solucion': return v.length >= 3;
      case 'nombre': return v.length >= 2;
      case 'empresa': return v.length >= 2;
      case 'correo': return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(v);
      case 'telefono': return v === '' || /^\+?[\d\s().-]{7,20}$/.test(v) && v.replace(/\D/g, '').length >= 7 && v.replace(/\D/g, '').length <= 15;
    }
    return true;
  }
  document.querySelectorAll('[data-formulario]').forEach(function (f) {
    var pasosF = f.querySelectorAll('.fm-paso');
    var error = f.querySelector('.fm-error');
    var atras = f.querySelector('.fm-atras');
    var enviar = f.querySelector('.fm-enviar');
    var cuerpo = f.querySelector('.fm-cuerpo');
    var fin = f.querySelector('.fm-fin');
    var actual = 0;

    function mostrar(i, enfocar) {
      actual = i;
      pasosF.forEach(function (p, n) { p.hidden = n !== i; });
      atras.hidden = i === 0;
      enviar.textContent = i === pasosF.length - 1 ? 'Enviar' : 'Siguiente';
      error.textContent = '';
      if (enfocar) pasosF[i].querySelector('input').focus({ preventScroll: true });
    }
    atras.addEventListener('click', function () { mostrar(actual - 1, true); });
    f.addEventListener('input', function (ev) {
      if (ev.target.getAttribute('aria-invalid')) { ev.target.removeAttribute('aria-invalid'); error.textContent = ''; }
    });
    f.addEventListener('submit', function (ev) {
      ev.preventDefault();
      var campo = pasosF[actual].querySelector('input');
      if (!validar(campo)) {
        campo.setAttribute('aria-invalid', 'true');
        error.textContent = MENSAJES[campo.name];
        campo.focus({ preventScroll: true });
        return;
      }
      if (actual < pasosF.length - 1) { mostrar(actual + 1, true); return; }
      var d = {};
      f.querySelectorAll('input').forEach(function (c) { d[c.name] = c.value.trim(); });
      var texto = 'Hola, quiero más información sobre el Sandbox.\n\n' +
        'Solución que necesito: ' + d.solucion + '\n' +
        'Nombre: ' + d.nombre + '\n' +
        'Empresa: ' + d.empresa + '\n' +
        'Correo: ' + d.correo + '\n' +
        (d.telefono ? 'Teléfono: ' + d.telefono + '\n' : '');
      var enlace = 'mailto:' + CORREO_CONTACTO + '?subject=' + encodeURIComponent(ASUNTO) + '&body=' + encodeURIComponent(texto);
      cuerpo.hidden = true;
      f.querySelector('.fm-acciones').hidden = true;
      var a = fin.querySelector('.fm-fin-correo');
      a.textContent = CORREO_CONTACTO;
      a.href = enlace;
      fin.hidden = false;
      fin.focus({ preventScroll: true });
      window.location.href = enlace;
    });
  });

  // Menú móvil
  var menu = document.getElementById('menu-m');
  var boton = document.querySelector('[data-menu]');
  function alternar(abrir) {
    menu.hidden = !abrir;
    boton.setAttribute('aria-expanded', abrir ? 'true' : 'false');
    boton.setAttribute('aria-label', abrir ? 'Cerrar menú' : 'Abrir menú');
  }
  if (menu && boton) {
    boton.addEventListener('click', function () { alternar(menu.hidden); });
    menu.addEventListener('click', function (ev) { if (ev.target.closest('a')) alternar(false); });
    document.addEventListener('keydown', function (ev) { if (ev.key === 'Escape' && !menu.hidden) alternar(false); });
  }

  escalar();
  window.addEventListener('resize', escalar);
  window.addEventListener('load', escalar);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(escalar);
})();
