/* el pase: la columna no se mueve, todo pasa dentro */
(function(){
  var work = document.getElementById('work');
  var frame = document.getElementById('frame');
  if (!work || !frame) return;
  var layers = [].slice.call(frame.querySelectorAll('.layer'));
  var texts  = [].slice.call(work.querySelectorAll('.txt'));
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  if (reduce) return;

  var N = layers.length;
  var PER = Math.max(1, Math.round(N / texts.length));  /* fotos por pieza */
  var STEP = 0.85;    /* pantallas de scroll por foto */
  var LIFT = 26;      /* % de contra-movimiento del motivo */
  var SINK = 0.03;    /* cuánto se encoge la que queda debajo */
  /* El relevo del texto ocupa esta fracción de la pieza. Cuanto
     más pequeña, más rápido se va: con 0,26 recorre una pantalla
     en 0,26 × 2,55 = 0,66 → va un 50% más deprisa que el scroll. */
  var HAND = 0.26;
  var active = -1;

  function height(){ work.style.height = (1 + (N - 1) * STEP) * 100 + 'svh'; }
  function ease(t){ return t < 0.5 ? 4*t*t*t : 1 - Math.pow(-2*t + 2, 3)/2; }
  function clamp01(v){ return v < 0 ? 0 : (v > 1 ? 1 : v); }

  var ticking = false;
  function update(){
    ticking = false;
    var vh = window.innerHeight;
    var top = work.getBoundingClientRect().top;
    var u = (-top) / (STEP * vh);
    if (u < 0) u = 0; else if (u > N - 1) u = N - 1;

    /* las fotos */
    for (var i = 0; i < N; i++){
      var lay = layers[i], img = lay.firstElementChild;
      if (i === 0){
        lay.style.setProperty('--ty', '0%');
      } else {
        var e = ease(clamp01(u - (i - 1)));
        lay.style.setProperty('--ty', ((1 - e) * 100).toFixed(2) + '%');
        img.style.setProperty('--iy', (-(1 - e) * LIFT).toFixed(2) + '%');
      }
      var cover = i < N - 1 ? clamp01(u - i) : 0;
      lay.style.setProperty('--sc', (1 - SINK * ease(cover)).toFixed(4));
    }

    /* el texto: quieto casi toda la pieza y, al final, fuera por
       arriba en poco recorrido: de ahí que se vea más rápido */
    var q = u / PER;
    for (var k = 0; k < texts.length; k++){
      var d = q - k, y = 0, vis = true;
      if (d <= -HAND || d >= 1){
        y = d <= -HAND ? 100 : -100; vis = false;
      } else if (d < 0){
        y = (1 - ease((d + HAND) / HAND)) * 100;          /* entra desde abajo */
      } else if (d <= 1 - HAND){
        y = 0;                                            /* quieto */
      } else {
        y = -ease((d - (1 - HAND)) / HAND) * 100;         /* sale por arriba */
      }
      var t = texts[k];
      t.style.setProperty('--y', y.toFixed(2) + 'svh');
      t.classList.toggle('live', vis);
    }

    /* el enlace de la foto apunta a la pieza que se está viendo */
    var now = Math.min(texts.length - 1, Math.max(0, Math.floor(q + 0.5)));
    if (now !== active){
      active = now;
      var src = texts[now];
      if (src){
        frame.setAttribute('href', src.dataset.href || '#');
        frame.setAttribute('aria-label', 'Ver ' + (src.dataset.name || ''));
      }
    }
  }
  function req(){ if (!ticking){ ticking = true; requestAnimationFrame(update); } }

  height();
  window.addEventListener('scroll', req, {passive:true});
  window.addEventListener('resize', function(){ height(); req(); });
  req();

  /* que ninguna foto se quede a medias
     Cuando el scroll se para dentro del tramo de fotos, se termina
     el pase con suavidad hasta la foto más cercana. En pantalla
     grande se espera algo más: la rueda del ratón da saltos más
     espaciados que el dedo y no hay que tirar mientras aún gira. */
  var small = window.matchMedia('(max-width: 860px)');
  var touching = false, settle = null, snapping = false;
  var tween = null;                 /* la animación propia de pantalla grande */

  /* En pantalla grande el scroll suave del navegador no es fiable
     justo después de la rueda (algunos lo ignoran o lo cortan), así
     que el ajuste se anima aquí, fotograma a fotograma. */
  function glide(to){
    var from = window.scrollY, dist = to - from;
    var dur = Math.min(700, Math.max(380, Math.abs(dist) * 1.1));
    var t0 = null;
    tween = { stop:false };
    var me = tween;
    function f(now){
      if (me.stop) return;
      if (t0 === null) t0 = now;
      var p = Math.min(1, (now - t0) / dur);
      var e = p < .5 ? 4*p*p*p : 1 - Math.pow(-2*p + 2, 3) / 2;
      window.scrollTo(0, from + dist * e);
      if (p < 1) requestAnimationFrame(f); else { tween = null; snapping = false; }
    }
    requestAnimationFrame(f);
  }
  function cancelGlide(){ if (tween){ tween.stop = true; tween = null; snapping = false; } }

  function snap(){
    settle = null;
    if (touching || tween) return;
    var vh = window.innerHeight, step = STEP * vh;
    var top = work.getBoundingClientRect().top;
    var u = -top / step;
    if (u <= 0.02 || u >= N - 1 - 0.02) return;            /* fuera del tramo o ya en la última */
    var k = Math.round(u);
    var d = (u - k) * step;                                 /* px que faltan para cuadrar */
    if (Math.abs(d) < 2) { snapping = false; return; }
    snapping = true;
    if (small.matches) window.scrollTo({ top: window.scrollY - d, behavior: 'smooth' });
    else glide(window.scrollY - d);
  }
  function later(){
    if (tween) return;                                      /* el scroll lo está moviendo el ajuste */
    clearTimeout(settle);
    settle = setTimeout(snap, snapping ? 260 : (small.matches ? 140 : 240));
  }
  window.addEventListener('scroll', later, {passive:true});
  window.addEventListener('touchstart', function(){ touching = true; snapping = false; cancelGlide(); clearTimeout(settle); }, {passive:true});
  window.addEventListener('touchend', function(){ touching = false; later(); }, {passive:true});
  /* si la persona vuelve a mover la rueda, pulsa una tecla o hace clic, manda ella */
  ['wheel', 'keydown', 'mousedown'].forEach(function(ev){
    window.addEventListener(ev, function(){ if (tween){ cancelGlide(); later(); } }, {passive:true});
  });
})();

/* la pastilla "View" */
(function(){
  var cur = document.getElementById('cursor');
  var frame = document.getElementById('frame');
  if (!cur || !frame || window.matchMedia('(hover: none)').matches) return;
  var tx = -200, ty = -200, x = -200, y = -200, raf = null, on = false;

  function loop(){
    raf = requestAnimationFrame(loop);
    x += (tx - x) * 0.15;   /* cuanto más bajo, más arrastre */
    y += (ty - y) * 0.15;
    cur.style.setProperty('--cx', x.toFixed(1) + 'px');
    cur.style.setProperty('--cy', y.toFixed(1) + 'px');
    if (!on && Math.abs(tx - x) < 0.4 && Math.abs(ty - y) < 0.4){
      cancelAnimationFrame(raf); raf = null;
    }
  }
  function kick(){ if (!raf) raf = requestAnimationFrame(loop); }

  window.addEventListener('pointermove', function(e){
    if (e.pointerType === 'touch') return;
    tx = e.clientX; ty = e.clientY; kick();
  }, {passive:true});
  frame.addEventListener('pointerenter', function(e){
    if (e.pointerType === 'touch') return;
    on = true; cur.classList.add('on'); kick();
  });
  frame.addEventListener('pointerleave', function(e){
    if (e.pointerType === 'touch') return;
    on = false; cur.classList.remove('on'); kick();
  });
  window.addEventListener('blur', function(){ on = false; cur.classList.remove('on'); });
})();
