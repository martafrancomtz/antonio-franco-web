/* la barra fija
   1 · La entrada de la home: si la barra
       lleva data-intro y no se llega con View Transition, la firma
       aparece grande en el centro, espera y viaja a su esquina;
       luego baja el menú y aparecen los textos del hero.
   2 · Blanca de verdad sobre las zonas oscuras: mira qué hay
       debajo de la barra y, si es una zona data-dark, le pone
       .on-dark; el menú se abre sobre la columna oscura con una
       animación (site.css). Para que esa animación se vea siempre:
       · si se llega desde otra página con View Transition, el estado
         se pone antes de pintar y la transición lleva el menú;
       · si no, el menú arranca compacto y se abre después.        */
/* la línea skip ink de los botones (ver site.css)
   Dentro de cada botón, una copia invisible de su texto que lleva
   el subrayado de verdad. aria-hidden: los lectores de pantalla no
   lo leen dos veces. */
(function(){
  var sel = '.bar-nav a, .site-foot a, .mail, .more a, .view button, .pager a > span, .ttl .u';
  var els = [].slice.call(document.querySelectorAll(sel));
  els.forEach(function(el){
    if (el.classList.contains('has-ink')) return;
    var ink = document.createElement('span');
    ink.className = 'ink';
    ink.setAttribute('aria-hidden', 'true');
    ink.innerHTML = el.innerHTML;
    el.classList.add('has-ink');
    el.appendChild(ink);
  });
  /* el color de la línea = el del texto del botón */
  function paint(){ els.forEach(function(el){ el.style.setProperty('--ink-c', getComputedStyle(el).color); }); }
  paint();
  var t; window.addEventListener('resize', function(){ clearTimeout(t); t = setTimeout(paint, 150); });
})();

/* menú hamburguesa (pantallas pequeñas; lo muestra site.css) */
(function(){
  var bar = document.getElementById('bar');
  var nav = bar && bar.querySelector('.bar-nav');
  if (!nav) return;
  nav.id = nav.id || 'menu';
  var btn = document.createElement('button');
  btn.type = 'button';
  btn.className = 'bar-burger';
  btn.setAttribute('aria-controls', nav.id);
  btn.setAttribute('aria-expanded', 'false');
  btn.setAttribute('aria-label', 'Menu');
  btn.innerHTML = '<span></span><span></span>';
  bar.appendChild(btn);

  var small = window.matchMedia('(max-width: 760px)');
  function set(open){
    bar.classList.toggle('menu-open', open);
    document.documentElement.classList.toggle('menu-lock', open);
    btn.setAttribute('aria-expanded', String(open));
    btn.setAttribute('aria-label', open ? 'Close menu' : 'Menu');
    if (open){ var first = nav.querySelector('a'); if (first) setTimeout(function(){ first.focus({preventScroll:true}); }, 300); }
  }
  btn.addEventListener('click', function(){ set(!bar.classList.contains('menu-open')); });
  nav.addEventListener('click', function(e){ if (e.target.closest('a')) set(false); });
  document.addEventListener('keydown', function(e){
    if (e.key === 'Escape' && bar.classList.contains('menu-open')){ set(false); btn.focus(); }
  });
  function onChange(){ if (!small.matches) set(false); }
  if (small.addEventListener) small.addEventListener('change', onChange);
})();

(function(){
  var bar = document.getElementById('bar');
  if (!bar) return;
  var sig = bar.querySelector('.bar-sig');
  var darks = [].slice.call(document.querySelectorAll('[data-dark]'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var HOLD = 1800;      /* lo que la firma se queda en el centro */
  var FLY  = 1250;      /* lo que tarda en llegar a su sitio (= transición en site.css) */

  /* 2 · zonas oscuras */
  var ticking = false;
  function update(){
    ticking = false;
    var y = 40, on = false;
    for (var i = 0; i < darks.length; i++){
      var r = darks[i].getBoundingClientRect();
      if (r.top <= y && r.bottom > y){ on = true; break; }
    }
    bar.classList.toggle('on-dark', on);
  }
  function req(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }
  function later(){ requestAnimationFrame(function(){ requestAnimationFrame(update); }); }
  function listen(){
    if (!darks.length) return;
    window.addEventListener('scroll', req, {passive:true});
    window.addEventListener('resize', req);
  }

  /* 1 · la entrada */
  function centre(){
    sig.style.transition = 'none';
    sig.style.transform = 'none';
    var r = sig.getBoundingClientRect();
    var vw = window.innerWidth, vh = window.innerHeight;
    var tw = vw < 760 ? vw * 0.55 : Math.min(vw * 0.30, 460);
    var k  = tw / Math.max(1, r.width);
    var tx = (vw - tw) / 2, ty = (vh - r.height * k) / 2;
    sig.style.transform = 'translate(' + (tx - r.left).toFixed(1) + 'px,' +
                          (ty - r.top).toFixed(1) + 'px) scale(' + k.toFixed(4) + ')';
    void sig.offsetWidth;
    sig.style.transition = '';
  }
  function intro(){
    document.documentElement.classList.add('is-intro');
    bar.classList.add('intro');
    centre();
    window.addEventListener('resize', centre);
    setTimeout(function(){
      window.removeEventListener('resize', centre);
      sig.style.transform = '';                           /* viaja a la esquina */
      document.documentElement.classList.add('leaving');  /* y se retira el negro */
      setTimeout(function(){
        bar.classList.add('solid');                       /* la firma sigue blanca, sin cambiar de color */
        bar.classList.remove('intro');                    /* baja el menú */
        document.documentElement.classList.remove('is-intro', 'leaving');
        setTimeout(function(){                            /* y se abre */
          if (darks.length) update();
          bar.classList.remove('solid');
          listen();
        }, 450);
      }, FLY - 250);
    }, HOLD);
  }

  var started = false;
  function start(viaTransition){
    if (started) return; started = true;
    var pre = function(){ document.documentElement.classList.remove("pre"); };
    if (viaTransition){ pre(); if (darks.length) update(); listen(); }
    else if (bar.hasAttribute("data-intro") && !reduce && sig){ intro(); pre(); }
    else { pre(); if (darks.length) later(); listen(); }
  }

  if ('onpagereveal' in window){
    window.addEventListener('pagereveal', function(e){ start(!!e.viewTransition); }, {once:true});
    setTimeout(function(){ start(false); }, 400);         /* por si el evento ya pasó */
  } else {
    start(false);
  }
  /* al volver con el botón atrás desde la caché, solo se reabre el menú */
  window.addEventListener('pageshow', function(e){
    if (e.persisted && darks.length){ bar.classList.remove('on-dark'); later(); }
  });
})();
