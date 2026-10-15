(function(root,factory){
  const api=factory();
  if(typeof module==='object'&&module.exports)module.exports=api;
  if(root.document)api.mount(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ink='#22251f',accent='#b42e20',blue='#365a68',paper='#f6f3eb',line='#d8d8cc';
const orders={original:[0,1,2,3],swap:[2,1,0,3],reverse:[3,2,1,0],rotate:[1,2,3,0]};
const tokens=[[1,0],[0,1],[-1,.5],[.5,-1]];
const WQ=[[1,.3],[-.2,.9]],WK=[[.8,-.4],[.5,1]],WV=[[1,.2],[-.3,.8]];
const f=(n,d=3)=>Math.abs(n)<.5*10**(-d)?'0':n.toFixed(d);
const vector=v=>'('+v.map(n=>f(n)).join(', ')+')';
const dot=(a,b)=>a.reduce((s,n,i)=>s+n*b[i],0);
const project=(x,w)=>w[0].map((_,j)=>x.reduce((s,n,i)=>s+n*w[i][j],0));
function softmax(scores){const max=Math.max(...scores);if(!Number.isFinite(max))throw new RangeError('At least one unmasked finite score is required');const e=scores.map(s=>Math.exp(s-max)),sum=e.reduce((s,n)=>s+n,0);return e.map(n=>n/sum);}
function attention(Q,K,V,{scaled=true,causal=false}={}){
  const logits=Q.map((q,i)=>K.map((k,j)=>causal&&j>i?-Infinity:dot(q,k)/(scaled?Math.sqrt(q.length):1)));
  const weights=logits.map(softmax);
  const output=weights.map(row=>V[0].map((_,d)=>row.reduce((s,w,j)=>s+w*V[j][d],0)));
  return {logits,weights,output};
}
function qkv({x=1,y=.5,value=1,scaled=true}={}){
  const K=[[1,0],[0,1],[-1,0]],V=[[1,0],[0,value],[-1,-1]],q=[x,y],a=attention([q],K,V,{scaled});
  return {q,K,V,logits:a.logits[0],weights:a.weights[0],output:a.output[0],scaled};
}
function selfAttention(order=orders.original,{position=false,causal=false}={}){
  const X=order.map((id,i)=>tokens[id].map((n,d)=>n+(position?.6*(d===0?Math.sin(i):Math.cos(i)):0)));
  const Q=X.map(x=>project(x,WQ)),K=X.map(x=>project(x,WK)),V=X.map(x=>project(x,WV));
  return {X,Q,K,V,...attention(Q,K,V,{causal})};
}
function sequence({order='swap',position=false,causal=false}={}){
  const ids=orders[order]||orders.swap,baseline=selfAttention(orders.original,{position,causal}),current=selfAttention(ids,{position,causal});
  const reference=ids.map(id=>baseline.output[id]),errors=current.output.map((v,i)=>Math.max(...v.map((n,d)=>Math.abs(n-reference[i][d]))));
  const futureMass=Math.max(...current.weights.map((row,i)=>row.reduce((s,n,j)=>s+(j>i?n:0),0)));
  return {ids,baseline,current,reference,errors,error:Math.max(...errors),futureMass,position,causal};
}
function svgStart(title,desc,width,height){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${width} ${height}" role="img" aria-label="${title}"><title>${title}</title><desc>${desc}</desc><rect width="${width}" height="${height}" fill="${paper}"/><g font-family="monospace" fill="${ink}">`;}
function qkvSVG(options={}){
 const r=qkv(options),px=n=>520+n*65,py=n=>210-n*65;
 let s=svgStart('Query, keys and weighted values','Left: three normalized attention weights. Right: values and their weighted mean y.',720,320);
 s+=`<text x="24" y="29" font-size="13">01 / WEIGHTS OVER KEYS</text><text x="384" y="29" font-size="13">02 / WEIGHTED VALUE</text><text x="24" y="52" font-size="11">q = ${vector(r.q)} | ${r.scaled?'scaled / sqrt(2)':'unscaled'}</text>`;
 for(let i=0;i<3;i++){const y=82+i*70;s+=`<text x="24" y="${y+13}" font-size="12">K${i+1}</text><rect x="56" y="${y}" width="230" height="20" fill="${line}"/><rect x="56" y="${y}" width="${r.weights[i]*230}" height="20" fill="${accent}"/><text x="296" y="${y+14}" font-size="12">${f(r.weights[i])}</text>`;}
 s+=`<path d="M ${px(-1.5)} ${py(0)} H ${px(2.3)} M ${px(0)} ${py(-1.3)} V ${py(2.3)}" stroke="${line}" fill="none"/><text x="${px(2.3)}" y="${py(0)-7}" font-size="10">v[0]</text><text x="${px(0)+8}" y="${py(2.3)}" font-size="10">v[1]</text>`;
 s+=`<polygon points="${r.V.map(v=>px(v[0])+','+py(v[1])).join(' ')}" fill="${line}" fill-opacity=".28" stroke="${blue}" stroke-dasharray="4 4"/>`;
 r.V.forEach((v,i)=>{s+=`<circle cx="${px(v[0])}" cy="${py(v[1])}" r="4" fill="${blue}"/><text x="${px(v[0])+7}" y="${py(v[1])-9}" font-size="12" fill="${blue}">V${i+1}</text>`;});
 s+=`<circle cx="${px(r.output[0])}" cy="${py(r.output[1])}" r="7" fill="${accent}" stroke="${paper}" stroke-width="2"/><text x="${px(r.output[0])+11}" y="${py(r.output[1])+17}" font-size="13" fill="${accent}">y</text><text x="24" y="296" font-size="11">sum(a) = ${f(r.weights.reduce((s,n)=>s+n,0))}</text><text x="384" y="296" font-size="11">y = ${vector(r.output)}</text></g></svg>`;
 return s;
}
function sequenceSVG(options={}){
 const r=sequence(options),names=['A','B','C','D'];
 let s=svgStart('Self-attention before and after token permutation','Rows are queries; columns are keys. Hatched cells are masked and have exactly zero weight.',720,364);
 s+=`<defs><pattern id="attention-mask-hatch" width="6" height="6" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 6L6 0M5 7L7 5" stroke="${line}" stroke-width="1"/></pattern></defs>`;
 function matrix(x,weights,ids,title){
   let part=`<text x="${x-32}" y="28" font-size="13">${title}</text><text x="${x+80}" y="57" font-size="10">KEYS</text>`;
   ids.forEach((id,i)=>{part+=`<text x="${x+i*55+25}" y="79" text-anchor="middle" font-size="13">${names[id]}</text><text x="${x-16}" y="${115+i*55}" text-anchor="middle" font-size="13">${names[id]}</text>`;});
   weights.forEach((row,i)=>row.forEach((w,j)=>{const masked=r.causal&&j>i,c=[246,243,235].map((n,d)=>Math.round(n+( [180,46,32][d]-n)*w));part+=`<rect x="${x+j*55}" y="${91+i*55}" width="52" height="52" fill="${masked?'url(#attention-mask-hatch)':`rgb(${c.join(',')})`}" stroke="${line}"/><text x="${x+j*55+26}" y="${122+i*55}" text-anchor="middle" font-size="12" fill="${w>.55?paper:ink}">${masked?'0':f(w,2)}</text>`;}));
   return part;
 }
 s+=matrix(66,r.baseline.weights,orders.original,'01 / ORIGINAL');s+=matrix(426,r.current.weights,r.ids,'02 / CURRENT');
 s+=`<text x="24" y="337" font-size="11">position: ${r.position?'ON':'OFF'} | causal mask: ${r.causal?'ON':'OFF'} | each row sums to 1</text></g></svg>`;
 return s;
}
function rows(doc,target,data){target.replaceChildren();data.forEach(values=>{const tr=doc.createElement('tr');values.forEach(value=>{const td=doc.createElement('td');td.textContent=value;tr.append(td);});target.append(tr);});}
function mountQKV(doc){doc.querySelectorAll('[data-attention-qkv-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-qkv-'+k+']');
 const update=()=>{const options={x:Number(get('x').value),y:Number(get('y').value),value:Number(get('value').value),scaled:get('scale').value==='scaled'},r=qkv(options);
 for(const key of ['x','y','value'])get(key+'-output').textContent=f(options[key],2);
 get('plot').innerHTML=qkvSVG(options);get('sum').textContent=f(r.weights.reduce((s,n)=>s+n,0));get('max').textContent=f(Math.max(...r.weights));get('output').textContent=vector(r.output);
 rows(doc,get('rows'),r.K.map((k,i)=>['K'+(i+1)+' / V'+(i+1),vector(k),f(r.logits[i]),f(r.weights[i]),vector(r.V[i])]));
 get('result').textContent=`a = softmax(qKᵀ${options.scaled?' / √2':''})，y = Σaⱼvⱼ = ${vector(r.output)}。只调整 V₂ 不会改变任何权重。`;
 };
 for(const key of ['x','y','value'])get(key).addEventListener('input',update);get('scale').addEventListener('change',update);
 get('reset').addEventListener('click',()=>{for(const[k,v]of [['x','1'],['y','0.5'],['value','1'],['scale','scaled']])get(k).value=v;update();});
 update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mountOrder(doc){doc.querySelectorAll('[data-attention-order-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-order-'+k+']');
 const update=()=>{const options={order:get('permutation').value,position:get('position').value==='on',causal:get('mask').value==='causal'},r=sequence(options);
 get('plot').innerHTML=sequenceSVG(options);get('label').textContent=r.ids.map(i=>'ABCD'[i]).join(' ');get('error').textContent=r.error<1e-12?'0':f(r.error,6);get('future').textContent=f(r.futureMass,6);
 rows(doc,get('rows'),r.current.output.map((v,i)=>[`${i+1} / ${'ABCD'[r.ids[i]]}`,vector(v),vector(r.reference[i]),r.errors[i]<1e-12?'0':f(r.errors[i],6)]));
 const reason=options.position&&options.causal?'位置编码和因果掩码都固定在当前位置上。':options.position?'位置编码固定在位置上，随 token 打乱后输入表示发生变化。':options.causal?'因果掩码固定在位置上，打乱后可读取的 token 集合发生变化。':'未加入位置编码与顺序相关掩码，输出随输入一起重排。';
 get('result').textContent=reason+(r.error<1e-12?' 当前最大差值为 0（按 10⁻¹² 阈值显示）。':' 当前输出一般不再等于原输出的简单重排。');
 };
 for(const key of ['permutation','position','mask'])get(key).addEventListener('change',update);
 get('reset').addEventListener('click',()=>{get('permutation').value='swap';get('position').value='off';get('mask').value='full';update();});
 update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mount(doc){mountQKV(doc);mountOrder(doc);}
return {softmax,dot,project,attention,qkv,selfAttention,sequence,qkvSVG,sequenceSVG,mountQKV,mountOrder,mount};
});
