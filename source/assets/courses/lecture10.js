(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)api.mount(root.document);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ink='#22251f',red='#b42e20',blue='#365a68',paper='#f6f3eb',line='#d8d8cc';
const f=(n,d=3)=>Math.abs(n)<.5*10**(-d)?'0':n.toFixed(d);
const sum=values=>values.reduce((s,n)=>s+n,0);
function frame(t){return Array.from({length:5},(_,y)=>Array.from({length:10},(_,x)=>Number(y===2&&x===t+1)));}
function pool(frames){return frames[0].map((row,y)=>row.map((_,x)=>sum(frames.map(grid=>grid[y][x]))/frames.length));}
function temporalFilter(values){return values.slice(1,-1).map((_,i)=>(values[i+2]-values[i])/2);}
function clip({stride=1,order='reverse'}={}){
 const selected=Array.from({length:8},(_,i)=>i).filter(i=>i%stride===0);let ids=[...selected];
 if(order==='reverse')ids.reverse();
 if(order==='interleave'){ids=[];for(let l=0,r=selected.length-1;l<=r;l++,r--){ids.push(selected[l]);if(l!==r)ids.push(selected[r]);}}
 const frames=ids.map(frame),average=pool(frames),reference=pool(selected.map(frame)),positions=ids.map(id=>id+1),responses=temporalFilter(positions);
 return {selected,ids,frames,average,reference,positions,responses,poolDifference:Math.max(...average.flat().map((n,i)=>Math.abs(n-reference.flat()[i]))),responseMean:sum(responses)/responses.length,span:(selected.at(-1)-selected[0])/8,stride,order};
}
function start(title,description,w,h){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><desc>${description}</desc><rect width="${w}" height="${h}" fill="${paper}"/><g font-family="monospace" fill="${ink}">`;}
function clipSVG(options={}){
 const r=clip(options);let s=start('Video frame order, temporal mean and local filtering','The same selected frames can be reordered without changing their mean image, while local temporal responses can change.',760,390);
 s+=`<text x="24" y="29" font-size="13">FRAME ORDER / ${r.order.toUpperCase()}</text><text x="24" y="52" font-size="11">sample stride = ${r.stride} | selected frames = ${r.ids.length} | original indices below</text>`;
 r.frames.forEach((grid,i)=>{const x=24+i*89;grid.forEach((row,y)=>row.forEach((n,j)=>{s+=`<rect x="${x+j*6}" y="${77+y*6}" width="6" height="6" fill="${n?red:'#e3e0d6'}"/>`;}));s+=`<text x="${x}" y="128" font-size="10">t=${r.ids[i]} / #${i+1}</text>`;});
 s+=`<path d="M24 151H736" stroke="${line}"/><text x="24" y="178" font-size="12">01 / TEMPORAL MEAN</text><text x="389" y="178" font-size="12">02 / LOCAL TEMPORAL RESPONSE</text>`;
 const max=Math.max(...r.average.flat());r.average.forEach((row,y)=>row.forEach((n,x)=>{s+=`<rect x="${42+x*22}" y="${204+y*22}" width="21" height="21" fill="${n?blue:paper}" stroke="${line}"/>`;}));
 s+=`<text x="24" y="339" font-size="11">lit cell value = ${f(max)}</text>`;
 const scale=Math.max(1,...r.responses.map(Math.abs)),count=r.responses.length,barStep=300/count;
 s+=`<path d="M390 260H714" stroke="${ink}"/>`;
 r.responses.forEach((n,i)=>{const h=Math.abs(n)*44/scale,x=400+i*barStep,y=n>=0?260-h:260;s+=`<rect x="${x}" y="${y}" width="${Math.min(29,barStep-9)}" height="${h}" fill="${n>=0?red:blue}"/><text x="${x}" y="${n>=0?y-8:y+h+16}" font-size="11">${f(n,2)}</text><text x="${x}" y="338" font-size="10">#${i+2}</text>`;});
 s+=`<text x="24" y="373" font-size="10">g[i] = (p[i+1] - p[i-1]) / 2. This is a toy feature response, not optical flow.</text></g></svg>`;return s;
}
const base=[[0,0,0,0,0],[0,1,2,1,0],[0,2,4,2,0],[0,1,2,1,0],[0,0,0,0,0]];
const kernel2D=[[0,-1,0],[-1,4,-1],[0,-1,0]];
function video(pattern='constant'){return Array.from({length:5},(_,t)=>base.map(row=>row.map((n,x)=>pattern==='moving'?(row[x-(t-2)]||0):pattern==='brightness'?n*(.5+t*.25):n)));}
function conv2D(input,kernel){return Array.from({length:input.length-kernel.length+1},(_,y)=>Array.from({length:input[0].length-kernel[0].length+1},(_,x)=>sum(kernel.map((row,dy)=>sum(row.map((w,dx)=>w*input[y+dy][x+dx]))))));}
function conv3D(input,kernel){const out=[];for(let t=0;t<=input.length-kernel.length;t++){let grid=null;kernel.forEach((slice,dt)=>{const value=conv2D(input[t+dt],slice);grid=grid?grid.map((row,y)=>row.map((n,x)=>n+value[y][x])):value;});out.push(grid);}return out;}
function inflation({pattern='constant',kt=3,time=1,normalized=true}={}){
 const input=video(pattern),maxTime=5-kt,t=Math.min(maxTime,Math.max(0,time)),a=normalized?1/kt:1,kernel=Array.from({length:kt},()=>kernel2D.map(row=>row.map(n=>n*a))),output=conv3D(input,kernel);
 const frames=input.slice(t,t+kt),responses=frames.map(grid=>conv2D(grid,kernel2D)[1][1]),contributions=responses.map(n=>a*n),reference=conv2D(input[t+Math.floor(kt/2)],kernel2D)[1][1],value=output[t][1][1];
 return {input,kernel,output,frames,responses,contributions,reference,value,difference:Math.abs(value-reference),a,kt,time:t,maxTime,weights:9*kt,shape:[6-kt,3,3],normalized,pattern};
}
function inflationSVG(options={}){
 const r=inflation(options);let s=start('Inflating a 2D kernel along time','Copy a spatial kernel along time and compare normalized versus unnormalized copies. The output is the sum of per-frame contributions.',760,435);
 s+=`<text x="24" y="28" font-size="13">2D FILTER TO 3D / ${r.pattern.toUpperCase()}</text><text x="24" y="56" font-size="11">W2D</text>`;
 kernel2D.forEach((row,y)=>row.forEach((n,x)=>{s+=`<rect x="${24+x*30}" y="${68+y*30}" width="29" height="29" fill="${n>0?red:n<0?blue:paper}" stroke="${line}"/><text x="${39+x*30}" y="${88+y*30}" text-anchor="middle" font-size="12" fill="${n?paper:ink}">${n}</text>`;}));
 s+=`<text x="166" y="82" font-size="13">W3D[t] = W2D${r.normalized?' / Kt':''}</text><text x="166" y="111" font-size="11">Kt = ${r.kt} | valid stride 1 | output = ${r.shape.join(' x ')}</text><text x="166" y="140" font-size="11">dense weights: 9 (2D) -> ${r.weights} (3D), no bias</text><text x="166" y="169" font-size="11">center-frame 2D response = ${f(r.reference)}</text><path d="M24 192H736" stroke="${line}"/>`;
 const patchMax=Math.max(1,...r.frames.flat(2));r.frames.forEach((grid,i)=>{const x=28+i*145;s+=`<text x="${x}" y="219" font-size="11">input t=${r.time+i}</text>`;for(let y=0;y<3;y++)for(let col=0;col<3;col++){const n=grid[y+1][col+1],c=Math.round(246-180*n/patchMax);s+=`<rect x="${x+col*28}" y="${236+y*28}" width="27" height="27" fill="rgb(${c},${c},${c})" stroke="${line}"/><text x="${x+col*28+13.5}" y="${254+y*28}" text-anchor="middle" font-size="10" fill="${n/patchMax>.55?paper:ink}">${f(n,2)}</text>`;}s+=`<text x="${x}" y="345" font-size="11">r = ${f(r.responses[i])}</text><text x="${x}" y="367" font-size="11">a*r = ${f(r.contributions[i])}</text>`;});
 s+=`<text x="24" y="410" font-size="12">a = ${f(r.a)} | sum(a*r) = ${f(r.value)} | absolute difference = ${f(r.difference)}</text></g></svg>`;return s;
}
function rows(doc,target,data){target.replaceChildren();data.forEach(values=>{const tr=doc.createElement('tr');values.forEach(value=>{const td=doc.createElement('td');td.textContent=value;tr.append(td);});target.append(tr);});}
function mountClip(doc){doc.querySelectorAll('[data-video-sequence-lab]').forEach(lab=>{const get=k=>lab.querySelector('[data-clip-'+k+']');const update=()=>{const options={stride:Number(get('stride').value),order:get('order').value},r=clip(options);get('plot').innerHTML=clipSVG(options);get('count').textContent=String(r.ids.length);get('pool-difference').textContent=f(r.poolDifference);get('response').textContent=f(r.responseMean);get('result').textContent=`重排同一帧集合，平均图最大差为 ${f(r.poolDifference)}。原视频首末采样时刻相距 ${f(r.span)} 秒；局部响应单位是像素/选中序列步，不是速度估计。`;rows(doc,get('rows'),r.ids.map((id,i)=>[String(i+1),String(id),String(r.positions[i]),i===0||i===r.ids.length-1?'—':f(r.responses[i-1])]));};get('stride').addEventListener('change',update);get('order').addEventListener('change',update);get('reset').addEventListener('click',()=>{get('stride').value='1';get('order').value='reverse';update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;});}
function mountInflation(doc){doc.querySelectorAll('[data-video-inflation-lab]').forEach(lab=>{const get=k=>lab.querySelector('[data-inflate-'+k+']');const update=()=>{const kt=Number(get('kt').value),time=Math.min(5-kt,Number(get('time').value));get('time').setAttribute('max',String(5-kt));get('time').value=String(time);const options={pattern:get('pattern').value,kt,time,normalized:get('scale').value==='normalized'},r=inflation(options);get('time-output').textContent=String(time);get('plot').innerHTML=inflationSVG(options);get('reference').textContent=f(r.reference,5);get('output').textContent=f(r.value,5);get('difference').textContent=f(r.difference,5);rows(doc,get('rows'),r.responses.map((n,i)=>[String(time+i),f(n,5),f(r.a,5),f(r.contributions[i],5)]));get('result').textContent=`输出形状（T×H×W）：${r.shape.join('×')}；标准稠密层权重数 ${r.weights}，不计偏置。`+(options.pattern==='constant'?(r.normalized?'静态视频 + 除以 Kₜ：保持原 2D 响应。':`静态视频 + 直接复制：响应是原 2D 的 ${kt} 倍。`):'当前帧随时间变化，3D 输出为窗口内空间响应的加权和，不保证等于中间帧的 2D 响应。');};for(const key of ['pattern','kt','scale'])get(key).addEventListener('change',update);get('time').addEventListener('input',update);get('reset').addEventListener('click',()=>{get('pattern').value='constant';get('kt').value='3';get('scale').value='normalized';get('time').setAttribute('max','2');get('time').value='1';update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;});}
function mount(doc){mountClip(doc);mountInflation(doc);}
return {frame,pool,temporalFilter,clip,clipSVG,video,conv2D,conv3D,inflation,inflationSVG,mountClip,mountInflation,mount};
});
