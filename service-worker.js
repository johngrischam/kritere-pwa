<script>
(function(){
  const TRUSTED = ["kritere.com","1fakt.com","sportzonline.site"];
  const STATE_KEY = 'kritere_pwa_state_v4';
  const REDIRECT_PATH = '/p/redirect.html?to=';

  /* ===== State save / restore ===== */
  function saveAppState(){
    try{
      const inputs = Array.from(document.querySelectorAll('input,textarea,select')).map(el=>{
        return {selector:getSelector(el), value:el.value, checked:el.checked};
      });
      const state = {scrollY:window.scrollY||0, inputs, ts:Date.now()};
      sessionStorage.setItem(STATE_KEY, JSON.stringify(state));
    }catch(e){ console.warn('saveAppState', e); }
  }

  function restoreAppState(){
    try{
      const raw = sessionStorage.getItem(STATE_KEY);
      if(!raw) return;
      const state = JSON.parse(raw);
      if(state.inputs){
        state.inputs.forEach(item=>{
          const el=document.querySelector(item.selector);
          if(el){
            if('checked' in item) el.checked=item.checked;
            if('value' in item) el.value=item.value;
          }
        });
      }
      if('scrollY' in state) window.scrollTo(0,state.scrollY);
    }catch(e){ console.warn('restoreAppState', e); }
  }

  function getSelector(el){
    if(el.id) return '#'+el.id;
    if(el.name) return `${el.tagName.toLowerCase()}[name="${el.name}"]`;
    let path='', node=el;
    while(node && node.nodeType===1 && node.tagName.toLowerCase()!=='html'){
      let ii=1, sib=node;
      while((sib=sib.previousElementSibling)){ if(sib.tagName===node.tagName) ii++; }
      const part=`${node.tagName.toLowerCase()}:nth-of-type(${ii})`;
      path = path ? part + '>' + path : part;
      node=node.parentElement;
    }
    return path;
  }

  /* ===== Open external URLs safely ===== */
  function openExternal(url){
    try{
      const parsed=new URL(url, location.href);
      const isTrusted=TRUSTED.some(d=> parsed.hostname.endsWith(d));
      if(!isTrusted){
        const redirectUrl = REDIRECT_PATH + encodeURIComponent(parsed.href);
        const a=document.createElement('a');
        a.href=redirectUrl;
        a.target='_self';
        a.rel='noopener noreferrer';
        a.style.display='none';
        document.body.appendChild(a);
        a.click();
        a.remove();
        return;
      }
      const a=document.createElement('a');
      a.href=url;
      a.target='_blank';
      a.rel='noopener noreferrer';
      a.style.display='none';
      document.body.appendChild(a);
      a.click();
      a.remove();
    }catch(e){ console.warn('openExternal fallback', e); window.open(url,'_blank'); }
  }

  /* ===== Stub window for ads ===== */
  function makeStubWindow(initialUrl){
    return {
      closed:false,
      close(){ this.closed=true; },
      location:{
        href: initialUrl||'about:blank',
        assign(url){ openExternal(url); this.href=url; },
        replace(url){ this.assign(url); }
      },
      document:{
        write(html){
          try{
            const m=html&&html.match(/https?:\/\/[^\s"'>)]+/i);
            if(m&&m[0]) openExternal(m[0]);
          }catch(e){}
        }
      }
    };
  }

  /* ===== Monkey-patch window.open ===== */
  const nativeOpen = window.open.bind(window);
  window.open=function(url,target,features){
    if(!url || url.startsWith('about:')){
      saveAppState();
      openExternal(location.href);
      return makeStubWindow('about:blank');
    }
    try{
      const parsed=new URL(url, location.href);
      const isTrusted=TRUSTED.some(d=> parsed.hostname.endsWith(d));
      if(!isTrusted){
        saveAppState();
        openExternal(parsed.href);
        return makeStubWindow(parsed.href);
      }
    }catch(e){ console.warn('patched window.open error', e); }
    return nativeOpen(url,target,features);
  };

  /* ===== Intercept clicks ===== */
  document.addEventListener('click', function(e){
    const a=e.target.closest('a');
    if(!a) return;
    const href=a.getAttribute('href');
    if(!href) return;

    const explicitBlank = a.target === '_blank';
    if(href.startsWith('about:') || !TRUSTED.some(d=> new URL(href, location.href).hostname.endsWith(d)) || explicitBlank){
      e.preventDefault();
      saveAppState();
      openExternal(href);
      return;
    }
  }, {capture:true});

  /* ===== Rewrite untrusted iframe navigation ===== */
  const origAssign = Object.getOwnPropertyDescriptor(Location.prototype, 'assign');
  const origReplace = Object.getOwnPropertyDescriptor(Location.prototype, 'replace');
  if(origAssign && origReplace){
    Location.prototype.assign = function(url){
      const isTrusted = TRUSTED.some(d => new URL(url, location.href).hostname.endsWith(d));
      if(!isTrusted){
        openExternal(url);
      } else {
        origAssign.value.call(this,url);
      }
    };
    Location.prototype.replace = function(url){
      const isTrusted = TRUSTED.some(d => new URL(url, location.href).hostname.endsWith(d));
      if(!isTrusted){
        openExternal(url);
      } else {
        origReplace.value.call(this,url);
      }
    };
  }

  /* ===== Save / Restore App State ===== */
  document.addEventListener('visibilitychange', ()=>{ if(document.visibilityState==='hidden') saveAppState(); });
  window.addEventListener('pagehide', saveAppState);
  window.addEventListener('beforeunload', saveAppState);
  window.addEventListener('load', restoreAppState);

})();
</script>






