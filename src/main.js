import { Game } from './game.js';
import { t, applyStaticI18n } from './i18n.js';

applyStaticI18n();

async function boot(){
  const bar=document.getElementById('bootBar');
  let p=8;
  const tick=setInterval(()=>{ p=Math.min(92,p+Math.random()*14); bar.style.width=p+'%'; },180);
  try{
    const res=await fetch('./assets/data/pokemon.json');
    if(!res.ok) throw new Error('Could not load the Pokédex data.');
    const data=await res.json();
    p=96; bar.style.width='96%';
    const game=new Game(data);
    window.terraverse=game;
    game.init();
    bar.style.width='100%';
    clearInterval(tick);
    document.documentElement.classList.add('ready');
  }catch(err){
    clearInterval(tick);
    console.error(err);
    document.getElementById('boot').innerHTML=`<div class="boot-mark"><span class="brand-orb brand-orb--xl"><i></i></span></div><div class="boot-title">TERRAVERSE</div><div class="boot-sub" style="color:#ff9b9b;text-transform:none;letter-spacing:.4px">${t('boot.error')} ${String(err.message||err)}</div>`;
  }
}
boot();
