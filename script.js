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
