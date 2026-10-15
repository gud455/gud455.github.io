/* CS231n learning labs. Synthetic data only; no training, telemetry or dependencies. */
(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (root.document) api.mount(root.document);
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const names = ['A', 'B', 'C'];
  const colors = ['#b42e20', '#276075', '#61692b'];
  const pale = ['#f0d5ca', '#d4e2e4', '#e0e2be'];
  const clamp = (v, lo = 0, hi = 1) => Math.min(hi, Math.max(lo, Number(v)));
  function makePoints() {
    let state = 455;
    const random = () => { state = (Math.imul(1664525, state) + 1013904223) >>> 0; return state / 4294967296; };
    const centers = [[0.28, 0.68], [0.73, 0.65], [0.50, 0.26]];
    const points = [];
    centers.forEach(([x, y], label) => {
      for (let j = 0; j < 14; j++) points.push({x: clamp(x + (random() - 0.5) * 0.6, 0.05, 0.95), y: clamp(y + (random() - 0.5) * 0.6, 0.05, 0.95), label, id: points.length + 1});
    });
    return points;
  }
  function knn(points, query, k, metric) {
    if (!points.length) throw new Error('At least one sample is required');
    const distance = p => metric === 'l1' ? Math.abs(p.x-query.x)+Math.abs(p.y-query.y) : Math.hypot(p.x-query.x,p.y-query.y);
    const neighbors = points.map(p => ({...p, distance: distance(p)})).sort((a,b) => a.distance-b.distance || a.id-b.id).slice(0, Math.max(1, Math.min(points.length, Math.round(k))));
    const votes = [0,0,0]; neighbors.forEach(p => votes[p.label]++);
    const max = Math.max(...votes), winner = neighbors.find(p => votes[p.label] === max).label;
    return {neighbors, votes, winner};
  }
  function linear(x, weights, bias, target) {
    const scores = weights.map((w,i) => w.reduce((sum,v,j) => sum + v*x[j], bias[i]));
    const max = Math.max(...scores), exp = scores.map(s => Math.exp(s-max)), sum = exp.reduce((a,b) => a+b, 0);
    const probs = exp.map(v => v/sum);
    return {scores, probs, prediction: scores.indexOf(max), tied: scores.filter(s => Math.abs(s-max)<1e-10).length>1,
      ce: max-scores[target]+Math.log(sum), svm: scores.reduce((loss,s,i) => loss+(i === target ? 0 : Math.max(0,s-scores[target]+1)),0)};
  }
  const presets = {horizontal:[1,1,0,0], vertical:[0,1,0,1], diagonal:[1,0,0,1]};
  const initialWeights = () => [[1,1,-1,-1],[-1,1,-1,1],[1,-1,-1,1]];
  function mountKnn(doc) {
    doc.querySelectorAll('[data-knn-lab]').forEach(lab => {
      const $ = key => lab.querySelector(key), canvas = $('[data-knn-canvas]');
      let ctx; try { ctx = canvas.getContext('2d'); } catch (_) { return; } if (!ctx) return;
      const points = makePoints(), kInput = $('[data-k]'), metric = $('[data-metric]');
      const xInput = $('[data-query-x]'), yInput = $('[data-query-y]');
      const w = canvas.width, h = canvas.height, pad = 24, pw = w-2*pad, ph = h-2*pad;
      let cacheKey = '', boundary = [], query = {x:0.5,y:0.5};
      const px = x => pad+x*pw, py = y => h-pad-y*ph;
      const glyph = (p, r) => {
        const x=px(p.x), y=py(p.y); ctx.beginPath();
        if (p.label === 0) ctx.arc(x,y,r,0,Math.PI*2);
        else if (p.label === 1) ctx.rect(x-r,y-r,2*r,2*r);
        else {ctx.moveTo(x,y-r-1);ctx.lineTo(x+r+1,y+r);ctx.lineTo(x-r-1,y+r);ctx.closePath();}
        ctx.fillStyle=colors[p.label];ctx.fill();ctx.strokeStyle='#faf9f4';ctx.lineWidth=1.5;ctx.stroke();
      };
      const render = () => {
        const k=Number(kInput.value), key=k+metric.value;
        if (key !== cacheKey) {
          boundary=[];
          for(let gy=0;gy<52;gy++) for(let gx=0;gx<80;gx++) boundary.push(knn(points,{x:(gx+.5)/80,y:1-(gy+.5)/52},k,metric.value).winner);
          cacheKey=key;
        }
        ctx.clearRect(0,0,w,h);ctx.fillStyle='#faf9f4';ctx.fillRect(0,0,w,h);
        boundary.forEach((label,i) => {ctx.fillStyle=pale[label];ctx.fillRect(pad+(i%80)*pw/80,pad+Math.floor(i/80)*ph/52,pw/80+0.5,ph/52+0.5);});
        ctx.strokeStyle='#a8a89c';ctx.lineWidth=0.6;
        for(let i=0;i<=4;i++){ctx.beginPath();ctx.moveTo(px(i/4),pad);ctx.lineTo(px(i/4),h-pad);ctx.moveTo(pad,py(i/4));ctx.lineTo(w-pad,py(i/4));ctx.stroke();}
        const result=knn(points,query,k,metric.value);
        ctx.strokeStyle='#242522';ctx.setLineDash([3,3]);ctx.lineWidth=1;
        result.neighbors.forEach(p=>{ctx.beginPath();ctx.moveTo(px(query.x),py(query.y));ctx.lineTo(px(p.x),py(p.y));ctx.stroke();});ctx.setLineDash([]);
        points.forEach(p=>glyph(p,4.5));
        result.neighbors.forEach(p=>{ctx.beginPath();ctx.arc(px(p.x),py(p.y),8,0,Math.PI*2);ctx.strokeStyle='#242522';ctx.stroke();});
        const qx=px(query.x), qy=py(query.y);ctx.strokeStyle='#faf9f4';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(qx-8,qy);ctx.lineTo(qx+8,qy);ctx.moveTo(qx,qy-8);ctx.lineTo(qx,qy+8);ctx.stroke();ctx.strokeStyle='#242522';ctx.lineWidth=2;ctx.stroke();
        ctx.fillStyle='#242522';ctx.font='11px monospace';ctx.fillText('0',pad-7,h-7);ctx.fillText('1 / x',w-47,h-7);ctx.fillText('y',6,17);
        xInput.value=query.x.toFixed(2);yInput.value=query.y.toFixed(2);$('[data-x-output]').textContent=query.x.toFixed(2);$('[data-y-output]').textContent=query.y.toFixed(2);$('[data-k-output]').textContent=k;
        $('[data-knn-result]').textContent=`预测 ${names[result.winner]} 类 · 投票 A ${result.votes[0]} / B ${result.votes[1]} / C ${result.votes[2]} · k = ${k}，${metric.value.toUpperCase()} 距离`;
        const list=$('[data-neighbor-list]');list.replaceChildren();
        result.neighbors.forEach(p=>{const li=doc.createElement('li');li.textContent=`样本 ${String(p.id).padStart(2,'0')} · ${names[p.label]} 类 · 距离 ${p.distance.toFixed(3)}`;list.append(li);});
      };
      kInput.addEventListener('input',render);metric.addEventListener('change',render);
      [xInput,yInput].forEach(input=>input.addEventListener('input',()=>{query={x:clamp(xInput.value),y:clamp(yInput.value)};render();}));
      canvas.addEventListener('pointerdown',event=>{const r=canvas.getBoundingClientRect();query={x:clamp(((event.clientX-r.left)*w/r.width-pad)/pw),y:clamp(1-((event.clientY-r.top)*h/r.height-pad)/ph)};render();});
      canvas.addEventListener('keydown',event=>{
        const steps={ArrowLeft:[-0.01,0],ArrowRight:[0.01,0],ArrowUp:[0,0.01],ArrowDown:[0,-0.01]};if(!steps[event.key])return;
        event.preventDefault();const [dx,dy]=steps[event.key];query={x:clamp(query.x+dx),y:clamp(query.y+dy)};render();
      });
      $('[data-knn-reset]').addEventListener('click',()=>{kInput.value='3';metric.value='l2';query={x:.5,y:.5};render();});
      render();canvas.hidden=false;$('[data-knn-fallback]').hidden=true;$('[data-knn-controls]').hidden=false;$('[data-knn-coordinates]').hidden=false;
    });
  }
  function mountLinear(doc) {
    doc.querySelectorAll('[data-linear-lab]').forEach(lab=>{
      const $=key=>lab.querySelector(key), all=key=>[...lab.querySelectorAll(key)];
      const pixels=all('[data-pixel]'),pixelOutputs=all('[data-pixel-output]'),weights=all('[data-weight]'),weightOutputs=all('[data-weight-output]');
      const template=$('[data-template]'),target=$('[data-target]'),bias=$('[data-bias]');
      let x=[...presets.horizontal],W=initialWeights(),b=[0,0,0];
      const sync=()=>{
        pixels.forEach((input,i)=>input.value=x[i]);weights.forEach((input,i)=>input.value=W[Number(template.value)][i]);bias.value=b[Number(template.value)];
      };
      const render=()=>{
        const result=linear(x,W,b,Number(target.value)), selected=Number(template.value);
        all('[data-pixel-preview] span').forEach((pixel,i)=>{const value=Math.round(x[i]*255);pixel.style.backgroundColor=`rgb(${value},${value},${value})`;});
        pixelOutputs.forEach((el,i)=>el.textContent=x[i].toFixed(2));weightOutputs.forEach((el,i)=>el.textContent=W[selected][i].toFixed(1));$('[data-bias-output]').textContent=b[selected].toFixed(1);
        all('[data-score]').forEach((el,i)=>el.textContent=result.scores[i].toFixed(2));
        all('[data-prob]').forEach((el,i)=>el.textContent=(100*result.probs[i]).toFixed(1)+'%');
        all('[data-prob-bar]').forEach((el,i)=>{el.style.width=(100*result.probs[i])+'%';el.style.backgroundColor=colors[i];});
        $('[data-ce]').textContent=result.ce.toFixed(3);$('[data-svm]').textContent=result.svm.toFixed(3);
        $('[data-linear-result]').textContent=`预测 ${names[result.prediction]} 类${result.tied?'（最高分并列，按类别顺序取首项）':''} · 目标 ${names[Number(target.value)]} 类`;
        $('[data-linear-formula]').textContent=`${names[selected]} 类：${W[selected].map((v,i)=>`(${v.toFixed(1)} × ${x[i].toFixed(2)})`).join(' + ')} + (${b[selected].toFixed(1)}) = ${result.scores[selected].toFixed(2)}`;
      };
      pixels.forEach((input,i)=>input.addEventListener('input',()=>{x[i]=clamp(input.value);render();}));
      weights.forEach((input,i)=>input.addEventListener('input',()=>{W[Number(template.value)][i]=clamp(input.value,-2,2);render();}));
      bias.addEventListener('input',()=>{b[Number(template.value)]=clamp(bias.value,-2,2);render();});
      template.addEventListener('change',()=>{sync();render();});target.addEventListener('change',render);
      all('[data-preset]').forEach(button=>button.addEventListener('click',()=>{x=[...presets[button.dataset.preset]];sync();render();}));
      $('[data-linear-zero]').addEventListener('click',()=>{W=W.map(row=>row.map(()=>0));b=[0,0,0];sync();render();});
      $('[data-linear-reset]').addEventListener('click',()=>{x=[...presets.horizontal];W=initialWeights();b=[0,0,0];template.value='0';target.value='0';sync();render();});
      sync();render();$('[data-linear-controls]').hidden=false;$('[data-score-display]').hidden=false;$('[data-linear-static]').hidden=true;
    });
  }
  function mount(doc) {mountKnn(doc);mountLinear(doc);}
  return {makePoints,knn,linear,initialWeights,presets,mountKnn,mountLinear,mount};
});
