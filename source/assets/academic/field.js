/* GUD / field plates. Deterministic ordered dithering; no remote dependency. */
(function (root) {
  'use strict';
  const BAYER = [0,8,2,10,12,4,14,6,3,11,1,9,15,7,13,5];
  const PALETTE = ['#242522','#f3f1e9','#c9381f'];
  const clamp = value => Math.max(0,Math.min(1,value));
  function hash(x,y,seed) {
    let n = Math.imul(x+seed,374761393)^Math.imul(y+17,668265263);
    n = Math.imul(n^(n>>>13),1274126177);
    return ((n^(n>>>16))>>>0)/4294967296;
  }
  function pattern(width,height,seed=455,mode='wave',phase=0) {
    width=Math.max(1,Math.min(600,Math.trunc(width)||1));
    height=Math.max(1,Math.min(300,Math.trunc(height)||1));
    seed=Number(seed)>>>0;
    const pixels=new Uint8Array(width*height);
    const tilt=(seed%997)/997*1.4-.7, offset=(seed%101)/101*Math.PI;
    for(let y=0;y<height;y++) for(let x=0;x<width;x++) {
      const nx=(x/width-.5)*3.1, ny=(y/height-.5)*2.5;
      const u=nx*Math.cos(tilt*.24)-ny*Math.sin(tilt*.24);
      const v=nx*Math.sin(tilt*.24)+ny*Math.cos(tilt*.24);
      let light;
      if(mode==='cosmos') {
        const r=Math.hypot(u,v*1.8), a=Math.atan2(v*1.8,u);
        const spiral=Math.cos(2*a-5*r+phase*.65+offset);
        const arms=Math.pow(.5+.5*spiral,7)*Math.exp(-r*r*1.3);
        const core=Math.exp(-r*r*34);
        const halo=.11*Math.exp(-r*r*1.9);
        const star=hash(x,y,seed+7919)>.997
          ? .55+.4*(.5+.5*Math.sin(phase*.8+hash(x,y,seed)*20)) : 0;
        light=clamp(core*.95+arms*.68+halo+star);
      } else if(mode==='orbit') {
        const a=Math.atan2(v*1.25,u), r=Math.hypot(u,v*1.25);
        const contour=.74+.13*Math.sin(a*3+offset+phase);
        const rim=Math.exp(-(r-contour)*(r-contour)*40);
        light=rim*(.37+.63*(.5+.5*Math.cos(a-1+offset)))+.09*Math.exp(-r*r*1.5);
      } else {
        const fold=v+.29*Math.sin(u*2.4+phase+offset*.3);
        const envelope=Math.exp(-fold*fold*2.25-u*u*.32);
        const ridge=Math.pow(.5+.5*Math.sin(u*6+v*2+.85*Math.sin(v*3+phase)+offset),.65);
        light=envelope*(.16+.79*ridge)+.06*Math.exp(-Math.pow(v+.55,2)*14-u*u*.3);
      }
      light=clamp(light+(hash(x,y,seed)-.5)*.12);
      const threshold=(BAYER[(y%4)*4+x%4]+.5)/16;
      if(light>threshold) pixels[y*width+x]=Math.sin(u*3.2+v*4.8+offset+phase*.4)>.8&&light>.3?2:1;
    }
    return {width,height,seed,mode,pixels};
  }
  function svg(seed=455,mode='wave',width=270,height=105) {
    const plate=pattern(width,height,seed,mode);
    let rectangles='';
    for(let i=0;i<plate.pixels.length;i++) {
      const color=plate.pixels[i];
      if(color) rectangles+=`<rect x="${i%plate.width}" y="${Math.floor(i/plate.width)}" width="1" height="1" fill="${PALETTE[color]}"/>`;
    }
    const description=mode==='cosmos'?'程序生成的像素星空与旋涡星系':'程序生成的像素抖动曲面';
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${plate.width} ${plate.height}" shape-rendering="crispEdges" role="img" aria-label="${description}"><rect width="100%" height="100%" fill="${PALETTE[0]}"/>${rectangles}</svg>`;
  }
  const api={pattern,svg,palette:PALETTE.slice()};
  if(typeof module==='object'&&module.exports) module.exports=api;
  else root.GudArchiveField=api;
  if(typeof document==='undefined') return;
  document.querySelectorAll('[data-generative-figure]').forEach(figure=>{
    const canvas=figure.querySelector('[data-generative-canvas]');
    let ctx;
    try {ctx=canvas?.getContext('2d',{alpha:false});} catch {return;}
    if(!ctx) return;
    const controls=figure.querySelector('[data-field-controls]');
    const buttons=[...figure.querySelectorAll('[data-art-mode]')];
    const seedButton=figure.querySelector('[data-art-seed]');
    const motionButton=figure.querySelector('[data-art-motion]');
    const seedLabel=figure.querySelector('[data-seed-label]');
    const media=typeof matchMedia==='function'?matchMedia('(prefers-reduced-motion: reduce)'):null;
    let seed=455,mode='wave',phase=0,playing=true,visible=true,raf=null,lastFrame=0;
    canvas.width=270;canvas.height=105;
    function draw() {
      const plate=pattern(270,105,seed,mode,phase);
      const frame=ctx.createImageData(plate.width,plate.height);
      const colors=[[36,37,34],[243,241,233],[201,56,31]];
      for(let i=0;i<plate.pixels.length;i++) {
        const rgb=colors[plate.pixels[i]];
        frame.data[i*4]=rgb[0];frame.data[i*4+1]=rgb[1];frame.data[i*4+2]=rgb[2];frame.data[i*4+3]=255;
      }
      ctx.putImageData(frame,0,0);
    }
    function tick(time) {
      raf=null;
      if(!playing||!visible||document.visibilityState==='hidden'||media?.matches) return;
      if(time-lastFrame>=120) {phase+=.075;draw();lastFrame=time;}
      raf=requestAnimationFrame(tick);
    }
    function sync() {
      if(raf!==null) {cancelAnimationFrame(raf);raf=null;}
      if(playing&&visible&&document.visibilityState!=='hidden'&&!media?.matches) raf=requestAnimationFrame(tick);
      motionButton.setAttribute('aria-pressed',String(playing&&!media?.matches));
      motionButton.textContent=media?.matches?'静态显示':playing?'暂停动态':'播放动态';
      motionButton.setAttribute('aria-label',media?.matches?'已遵循系统减少动态效果设置':playing?'暂停动态插图':'播放动态插图');
      motionButton.disabled=!!media?.matches;
    }
    buttons.forEach(button=>button.addEventListener('click',()=>{
      mode=['orbit','cosmos'].includes(button.dataset.artMode)?button.dataset.artMode:'wave';phase=0;
      canvas.setAttribute('aria-label',mode==='cosmos'?'缓慢旋转的像素星系与闪烁星点':mode==='orbit'?'缓慢变化的轨道插图':'缓慢变化的生成式波场插图');
      buttons.forEach(item=>item.setAttribute('aria-pressed',String(item===button)));draw();
    }));
    seedButton?.addEventListener('click',()=>{seed=(seed+137)%10000;if(seedLabel) seedLabel.textContent=String(seed).padStart(4,'0');phase=0;draw();});
    motionButton.addEventListener('click',()=>{playing=!playing;sync();});
    document.addEventListener('visibilitychange',sync);
    media?.addEventListener?.('change',sync);
    if(typeof IntersectionObserver==='function') {
      const observer=new IntersectionObserver(entries=>{visible=entries[0].isIntersecting;sync();});
      observer.observe(canvas);
    }
    draw();sync();canvas.hidden=false;controls.hidden=false;
    const modeControls=figure.querySelector('[data-field-modes]');
    if(modeControls) {
      modeControls.hidden=false;
      const staticLabel=figure.querySelector('[data-field-static-label]');
      if(staticLabel) staticLabel.hidden=true;
    }
    figure.querySelector('.signal-surface>img')?.setAttribute('aria-hidden','true');
  });
})(typeof globalThis!=='undefined'?globalThis:this);
