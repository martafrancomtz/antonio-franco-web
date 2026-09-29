/* 
   ANTONIO FRANCO: el carrusel de la ficha
   · Pantalla grande: el tramo .reel mide lo que tiene que
     recorrer la tira; mientras se baja, la tira avanza hacia
     la izquierda. Empieza a 1 px de tira por px de scroll y,
     pasada la primera pantalla, acelera poco a poco hasta
     SPEED (son muchas fotos). Suavizado por tiempo, así va
     igual de fluido a 60 que a 120 Hz.
     Arrastrar con el ratón mueve el scroll de la página, así
     que rueda y arrastre son lo mismo y nunca se pisan.
   · Pantalla pequeña: la tira tiene su propio scroll lateral
     (dedo o ratón).
   · En los dos casos cada pieza crece al acercarse al centro y
     encoge al alejarse, y las fotos y vídeos se cargan solo
     cuando están a punto de verse.
 */
(function(){
  var reel  = document.getElementById('reel');
  var wrap  = document.getElementById('wrap');
  var track = document.getElementById('track');
  if (!reel || !wrap || !track) return;

  var items  = [].slice.call(track.querySelectorAll('.item'));
  var media  = items.map(function(it){ return it.firstElementChild; });
  var wide   = window.matchMedia('(min-width: 861px)');
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

  var MIN   = 0.62;    /* tamaño de las que están lejos del centro */
  var REACH = 0.6;     /* a qué distancia del centro (en anchos de pantalla) llegan al mínimo */
  var SPEED = 1.9;     /* velocidad final de la tira respecto al scroll */
  var EASE  = 0.14;    /* suavizado (por fotograma a 60 Hz): más bajo, más suave */

  var vw = 0, maxX = 0, x = 0, target = 0, raf = null, last = 0;
  var A = 0, B = 0;                 /* tramo en el que acelera: de A a B px de scroll */
  var left = [], width = [];        /* posiciones de cada pieza, sin transformar */

  /* scroll (s) ⇄ avance de la tira (px)
     velocidad 1 hasta A, sube en línea recta hasta SPEED en B y se queda ahí */
  function xOf(s){
    if (s <= A) return s;
    if (s <= B) { var d = s - A; return A + d + (SPEED - 1) * d * d / (2 * (B - A)); }
    return xOf(B) + SPEED * (s - B);
  }
  function sOf(px){
    if (px <= A) return px;
    var xb = xOf(B);
    if (px <= xb) {                 /* resolver la parábola del tramo que acelera */
      var k = (SPEED - 1) / (2 * (B - A));
      return A + (-1 + Math.sqrt(1 + 4 * k * (px - A))) / (2 * k);
    }
    return B + (px - xb) / SPEED;
  }

  /* medidas: una vez, no en cada fotograma */
  function measure(){
    vw = window.innerWidth;
    items.forEach(function(it, i){ left[i] = it.offsetLeft; width[i] = it.offsetWidth; });
    if (wide.matches){
      maxX = Math.max(0, track.scrollWidth - wrap.clientWidth);
      A = vw * 0.8; B = vw * 2.4;
      reel.style.height = (reel.firstElementChild.offsetHeight + sOf(maxX)) + 'px';
    } else {
      reel.style.height = '';
      track.style.transform = '';
      x = target = 0;
    }
    kick();
  }

  /* cargar lo que está a punto de verse */
  function load(el){
    var src = el.getAttribute('data-src');
    if (!src) return;
    el.removeAttribute('data-src');
    el.addEventListener(el.tagName === 'VIDEO' ? 'loadeddata' : 'load', function(){ el.classList.add('ready'); }, { once:true });
    el.src = src;
  }
  media.forEach(function(m){               /* las primeras ya vienen con src */
    if (m.tagName === 'IMG' && !m.hasAttribute('data-src')){
      if (m.complete) m.classList.add('ready');
      else m.addEventListener('load', function(){ m.classList.add('ready'); }, { once:true });
    }
  });

  /* cada fotograma: avanzar, escalar, cargar, reproducir */
  function frame(now){
    raf = null;
    var dt = last ? Math.min(64, now - last) : 16.7; last = now;
    var shift;

    if (wide.matches){
      var top = reel.getBoundingClientRect().top;          /* la única lectura del fotograma */
      target = Math.min(maxX, xOf(Math.max(0, -top)));
      var a = reduce ? 1 : 1 - Math.pow(1 - EASE, dt / 16.7);
      x += (target - x) * a;
      if (Math.abs(target - x) < 0.25) x = target;
      track.style.transform = 'translate3d(' + (-x).toFixed(2) + 'px,0,0)';
      shift = x;
    } else {
      shift = wrap.scrollLeft;
    }

    var mid = vw / 2;
    for (var i = 0; i < items.length; i++){
      var l = left[i] - shift, r = l + width[i], m = media[i];
      if (r < -vw || l > vw * 2.2){
        if (m.tagName === 'VIDEO' && !m.paused) m.pause();
        continue;
      }
      load(m);
      if (!reduce){
        var d = Math.abs(l + width[i] / 2 - mid) / (vw * REACH);
        var t = d >= 1 ? 0 : 1 - d;
        t = t * t * (3 - 2 * t);                          /* suave en los dos extremos */
        items[i].style.transform = 'scale(' + (MIN + (1 - MIN) * t).toFixed(4) + ')';
      }
      if (m.tagName === 'VIDEO' && m.src){
        var seen = r > 0 && l < vw;
        if (seen && m.paused && !reduce){ var p = m.play(); if (p) p.catch(function(){}); }
        else if (!seen && !m.paused) m.pause();
      }
    }
    if (wide.matches && x !== target) kick(); else last = 0;
  }
  function kick(){ if (!raf) raf = requestAnimationFrame(frame); }

  window.addEventListener('scroll', kick, { passive:true });
  wrap.addEventListener('scroll', kick, { passive:true });
  window.addEventListener('resize', measure);
  if (wide.addEventListener) wide.addEventListener('change', measure);

  /* arrastrar con el botón izquierdo */
  var drag = null;
  wrap.addEventListener('pointerdown', function(e){
    if (e.pointerType !== 'mouse' || e.button !== 0) return;       /* el dedo ya hace scroll solo */
    drag = { x:e.clientX, tx:target, scroll:window.scrollY - Math.max(0, -reel.getBoundingClientRect().top), left:wrap.scrollLeft };
    wrap.setPointerCapture(e.pointerId);
    wrap.classList.add('grabbing');
    e.preventDefault();
  });
  wrap.addEventListener('pointermove', function(e){
    if (!drag) return;
    var dx = e.clientX - drag.x;
    if (wide.matches){
      /* la tira sigue al ratón: se busca el scroll que da ese avance */
      var want = Math.min(maxX, Math.max(0, drag.tx - dx));
      window.scrollTo(0, drag.scroll + sOf(want));
    } else {
      wrap.scrollLeft = drag.left - dx;
    }
  });
  function end(e){
    if (!drag) return;
    drag = null;
    wrap.classList.remove('grabbing');
    if (e && e.pointerId != null && wrap.hasPointerCapture(e.pointerId)) wrap.releasePointerCapture(e.pointerId);
  }
  wrap.addEventListener('pointerup', end);
  wrap.addEventListener('pointercancel', end);
  wrap.addEventListener('lostpointercapture', end);
  wrap.addEventListener('dragstart', function(e){ e.preventDefault(); });

  measure();
  window.addEventListener('load', measure);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
})();
