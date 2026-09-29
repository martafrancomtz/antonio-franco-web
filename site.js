/* la barra fija: blanca de verdad sobre las zonas oscuras
   Mira qué hay debajo de la barra (a la altura del menú) y, si
   es una zona marcada con data-dark, le pone .on-dark: el menú
   se abre sobre la columna oscura con una animación (site.css).

   Para que esa animación se vea siempre, también al entrar:
   · si se llega desde otra página con View Transition, el estado
     se pone antes de pintar y es la transición la que lleva el
     menú de su sitio anterior al nuevo;
   · si no, la página arranca con el menú compacto y se abre en
     el primer fotograma, con la misma animación que al hacer scroll. */
(function(){
  var bar = document.getElementById('bar');
  var darks = [].slice.call(document.querySelectorAll('[data-dark]'));
  if (!bar || !darks.length) return;

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

  var started = false;
  function start(viaTransition){
    if (started) return; started = true;
    if (viaTransition) update(); else later();
    window.addEventListener('scroll', req, {passive:true});
    window.addEventListener('resize', req);
  }

  if ('onpagereveal' in window){
    window.addEventListener('pagereveal', function(e){ start(!!e.viewTransition); }, {once:true});
    /* por si el evento ya pasó (script cargado tarde) */
    setTimeout(function(){ start(false); }, 400);
  } else {
    start(false);
  }
  /* al volver con el botón atrás desde la caché, repetir la entrada */
  window.addEventListener('pageshow', function(e){
    if (e.persisted){ bar.classList.remove('on-dark'); later(); }
  });
})();
