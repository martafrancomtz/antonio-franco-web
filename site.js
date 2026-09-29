/* la barra fija: blanca de verdad sobre las zonas oscuras
   Mira qué hay debajo de la barra (a la altura del menú) y, si
   es una zona marcada con data-dark, le pone .on-dark.        */
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
  window.addEventListener('scroll', req, {passive:true});
  window.addEventListener('resize', req);
  update();
})();
