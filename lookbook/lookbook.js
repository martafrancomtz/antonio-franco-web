(function(){
  var work = document.getElementById('work');
  var rows = [].slice.call(work.querySelectorAll('.row'));
  var keys = rows.map(function(r){ return r.querySelector('.tile.key'); });
  var reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  var touchOnly = window.matchMedia('(hover: none)').matches;

  /* En List la foto importante se queda en su columna: se apunta
     cuál es (--c) y a qué lado va el texto (1-2 → derecha, 3-4 → izquierda). */
  rows.forEach(function(r, i){
    var c = [].indexOf.call(keys[i].parentNode.children, keys[i]) + 1;
    r.style.setProperty('--c', c);
    r.classList.toggle('txt-l', c > 2);
  });

  /* El pie va de "agrupado a la izquierda" a "repartido de punta a
     punta". Para que la transición sea continua hace falta un ancho
     en píxeles: se mide el ancho natural del contenido y se guarda. */
  function measure(){
    if (work.classList.contains('is-list')) return;
    rows.forEach(function(r){
      var cap = r.querySelector('.cap');
      cap.style.transition = 'none';
      cap.style.width = 'max-content';
      var w = cap.getBoundingClientRect().width;
      cap.style.width = '';
      cap.style.setProperty('--nat', Math.ceil(w) + 'px');
      void cap.offsetWidth;
      cap.style.transition = '';
    });
  }
  measure();
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(measure);
  var rt; window.addEventListener('resize', function(){
    clearTimeout(rt); rt = setTimeout(measure, 160);
  });

  /* hover: la fila señalada crece y el resto a blanco y negro */
  var hot = null;
  function setHot(r){
    if (hot === r) return;
    if (hot) hot.classList.remove('hot');
    hot = r;
    if (r){ r.classList.add('hot'); work.classList.add('hovering'); }
    else work.classList.remove('hovering');
  }
  rows.forEach(function(r){
    r.addEventListener('pointerenter', function(e){
      if (e.pointerType === 'touch' || busy) return;
      setHot(r);
    });
    r.addEventListener('pointerleave', function(e){
      if (e.pointerType === 'touch') return;
      if (hot === r) setHot(null);
    });
    r.addEventListener('click', function(){
      if (touchOnly && !busy) setHot(hot === r ? null : r);
    });
    [].forEach.call(r.querySelectorAll('.tile'), function(t){
      t.tabIndex = 0;
      /* en táctil el foco llega antes que el click y lo cancelaría:
         el teclado solo activa la fila si el foco es visible */
      t.addEventListener('focus', function(){
        if (!touchOnly && !busy && t.matches(':focus-visible')) setHot(r);
      });
    });
  });
  work.addEventListener('pointerleave', function(e){
    if (e.pointerType === 'touch') return;
    setHot(null);
  });

  /* los vídeos solo se reproducen cuando se ven */
  var vids = [].slice.call(work.querySelectorAll('video'));
  if ('IntersectionObserver' in window){
    var io = new IntersectionObserver(function(entries){
      entries.forEach(function(en){
        if (en.isIntersecting && !reduce){ var p = en.target.play(); if (p) p.catch(function(){}); }
        else en.target.pause();
      });
    }, { rootMargin:'200px 0px' });
    vids.forEach(function(v){ v.preload = 'metadata'; io.observe(v); });
  }

  /* Grid ⇄ List
     Se hace con FLIP: se mide dónde está cada foto importante,
     se cambia la maqueta, se vuelve a medir y se la devuelve a
     su sitio de antes con un transform; al quitarlo, viaja y
     encoge (o crece) hasta su sitio nuevo.                   */
  var FADE = 380, MOVE = 900;
  var busy = false;
  var view = document.getElementById('view');
  var btns = [].slice.call(view.querySelectorAll('button'));

  function rects(){ return keys.map(function(k){ return k.getBoundingClientRect(); }); }
  function flip(first, done){
    var last = rects();
    keys.forEach(function(k, i){
      var f = first[i], l = last[i];
      k.style.transition = 'none';
      k.style.transformOrigin = '0 0';
      k.style.transform = 'translate(' + (f.left - l.left) + 'px,' + (f.top - l.top) + 'px) scale(' + (f.width / l.width) + ')';
    });
    void work.offsetWidth;
    keys.forEach(function(k){
      k.style.transition = 'transform ' + MOVE + 'ms var(--ease)';
      k.style.transform = '';
    });
    setTimeout(function(){
      keys.forEach(function(k){ k.style.transition = ''; k.style.transformOrigin = ''; });
      done();
    }, MOVE);
  }

  function toList(){
    busy = true; setHot(null);
    work.classList.add('busy', 'fade');                /* 1 · se apagan las demás */
    setTimeout(function(){
      var first = rects();
      work.classList.add('is-list');                   /* 2 · encoge en su sitio */
      flip(first, function(){
        work.classList.add('list-in');                 /* 3 · líneas y texto */
        work.classList.remove('busy');
        busy = false;
      });
    }, FADE);
  }
  function toGrid(){
    busy = true; setHot(null);
    work.classList.add('busy');
    work.classList.remove('list-in');                  /* 1 · se van líneas y texto */
    setTimeout(function(){
      var first = rects();
      work.classList.remove('is-list');                /* 2 · crece hasta su sitio */
      measure();
      flip(first, function(){
        work.classList.remove('fade', 'busy');         /* 3 · vuelven las demás */
        busy = false;
      });
    }, reduce ? 0 : 320);
  }

  function set(v){
    var isList = work.classList.contains('is-list');
    if (busy || (v === 'list') === isList) return;
    btns.forEach(function(b){ b.setAttribute('aria-pressed', String(b.dataset.v === v)); });
    if (reduce){
      work.classList.toggle('is-list', v === 'list');
      work.classList.toggle('list-in', v === 'list');
      work.classList.toggle('fade', v === 'list');
      measure();
      return;
    }
    if (v === 'list') toList(); else toGrid();
  }
  btns.forEach(function(b){
    b.addEventListener('click', function(){ set(b.dataset.v); });
  });
})();
