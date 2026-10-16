(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)api.mount(root.document);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ink='#22251f',red='#b42e20',blue='#365a68',paper='#f6f3eb',line='#d8d8cc',gray='#82877e';
const f=(n,d=3)=>Math.abs(n)<.5*10**(-d)?'0':n.toFixed(d);
const softplus=x=>Math.max(x,0)+Math.log1p(Math.exp(-Math.abs(x)));
const sigmoid=x=>x>=0?1/(1+Math.exp(-x)):Math.exp(x)/(1+Math.exp(x));
const modes=[{key:'saturating',label:'G：log(1−D)',color:red},{key:'nonsaturating',label:'G：−log D',color:blue},{key:'discriminator',label:'D：−log(1−D)',color:gray}];
function gan({logit=-6,rate=.5,mode='nonsaturating'}={}){
 const probability=sigmoid(logit),targets={saturating:{loss:-softplus(logit),gradient:-probability},nonsaturating:{loss:softplus(-logit),gradient:-sigmoid(-logit)},discriminator:{loss:softplus(logit),gradient:probability}};
 for(const value of Object.values(targets))value.next=logit-rate*value.gradient;
 return {probability,targets,selected:targets[mode],logit,rate,mode};
}
function start(title,description,w,h){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><desc>${description}</desc><rect width="${w}" height="${h}" fill="${paper}"/><g font-family="monospace" fill="${ink}">`;}
function ganSVG(options={}){
 const r=gan(options);let s=start('GAN scalar losses and logit derivatives','Loss curves and derivatives for the saturating generator, non-saturating generator and discriminator fake-sample branch. The selected objective is emphasized.',760,362);
 s+=`<text x="24" y="28" font-size="13">GAN / LOCAL LOGIT ANALYSIS</text><text x="24" y="49" font-size="10" fill="${red}">red: G log(1-D)</text><text x="228" y="49" font-size="10" fill="${blue}">blue: G -log D</text><text x="440" y="49" font-size="10" fill="${gray}">gray: D -log(1-D)</text>`;
 for(const[ox,kind,title,limit]of [[50,'loss','01 / LOSS',8.4],[430,'gradient','02 / d(LOSS)/d(LOGIT)',1.1]]){
  const xm=a=>ox+(a+8)/16*280,ym=v=>178-v/limit*88;s+=`<text x="${ox}" y="76" font-size="11">${title}</text><path d="M${ox} 178H${ox+280}M${xm(0)} 87V269" stroke="${line}"/>`;
  for(const tick of [-8,-4,0,4,8])s+=`<text x="${xm(tick)}" y="290" text-anchor="middle" font-size="10">${tick}</text>`;
  for(const tick of [-limit,limit])s+=`<text x="${ox-9}" y="${ym(tick)+4}" text-anchor="end" font-size="9">${f(tick,1)}</text>`;
  modes.forEach(m=>{const points=Array.from({length:161},(_,i)=>{const a=-8+i*.1;return xm(a)+','+ym(gan({logit:a}).targets[m.key][kind]);}).join(' ');s+=`<polyline points="${points}" stroke="${m.color}" stroke-width="${r.mode===m.key?3:1.5}" opacity="${r.mode===m.key?1:.65}" fill="none"/>`;});
  s+=`<circle cx="${xm(r.logit)}" cy="${ym(r.selected[kind])}" r="4" fill="${ink}"/><text x="${ox}" y="315" font-size="11">a = ${f(r.logit,2)} | value = ${f(r.selected[kind],5)}</text>`;
 }
 s+=`<text x="24" y="346" font-size="10">All objectives shown as minimization losses. A scalar illustration, not GAN training.</text></g></svg>`;return s;
}
function varianceAt(t){return (1-t)**2*.36+t*t;}
function velocity(y,t,mean=0){const s=varianceAt(t),coefficient=(t-(1-t)*.36)/s;return -mean+coefficient*(y-(1-t)*mean);}
function cfgVelocity(y,t,mean=1.2,guidance=0){const unconditional=velocity(y,t,0),conditional=velocity(y,t,mean);return {unconditional,conditional,guided:(1+guidance)*conditional-guidance*unconditional};}
function exactFlow(t,noise=1,mean=1.2){return (1-t)*mean+Math.sqrt(varianceAt(t))*noise;}
function rectifiedFlow({mean=1.2,guidance=0,noise=1,steps=8,view=4}={}){
 const effectiveMean=(1+guidance)*mean,states=[{step:0,t:1,y:noise,...cfgVelocity(noise,1,mean,guidance)}];
 for(let i=0;i<steps;i++){const previous=states[i],t=1-(i+1)/steps,y=previous.y-previous.guided/steps;states.push({step:i+1,t,y,...cfgVelocity(y,t,mean,guidance)});}
 const endpoint=states.at(-1).y,exact=exactFlow(0,noise,effectiveMean),current=states[Math.min(steps,Math.max(0,view))];return {states,endpoint,exact,error:Math.abs(endpoint-exact),effectiveMean,current,mean,guidance,noise,steps};
}
function flowSVG(options={}){
 const r=rectifiedFlow(options),reference=Array.from({length:161},(_,i)=>{const t=1-i/160;return {t,unconditional:exactFlow(t,r.noise,0),conditional:exactFlow(t,r.noise,r.mean),guided:exactFlow(t,r.noise,r.effectiveMean)};}),all=[...r.states.map(p=>p.y),...reference.flatMap(p=>[p.unconditional,p.conditional,p.guided])],low=Math.min(...all),high=Math.max(...all),margin=Math.max(.25,(high-low)*.15),ymin=low-margin,ymax=high+margin,xm=t=>54+(1-t)*650,ym=y=>262-(y-ymin)/(ymax-ymin)*170;
 let s=start('Analytic Gaussian rectified flow with reverse Euler and CFG','Time runs from noise at t=1 on the left to data at t=0 on the right. Compare exact branch trajectories with the guided reverse Euler trajectory.',760,364);
 s+=`<text x="24" y="27" font-size="13">RECTIFIED FLOW / N=${r.steps} / w=${f(r.guidance,1)}</text><text x="24" y="49" font-size="10" fill="${gray}">gray: uncond exact</text><text x="222" y="49" font-size="10" fill="${blue}">blue: cond exact</text><text x="413" y="49" font-size="10" fill="${red}">red dashed: CFG exact; solid: Euler</text>`;
 for(let i=0;i<=3;i++){const y=ymin+(ymax-ymin)*i/3;s+=`<path d="M54 ${ym(y)}H704" stroke="${line}" stroke-dasharray="3 4"/><text x="44" y="${ym(y)+4}" text-anchor="end" font-size="10">${f(y,1)}</text>`;}
 for(const[key,color,dash]of [['unconditional',gray,false],['conditional',blue,false],['guided',red,true]])s+=`<polyline points="${reference.map(p=>xm(p.t)+','+ym(p[key])).join(' ')}" fill="none" stroke="${color}" stroke-width="${dash?2:1.5}"${dash?' stroke-dasharray="5 4"':''}/>`;
 s+=`<polyline points="${r.states.map(p=>xm(p.t)+','+ym(p.y)).join(' ')}" fill="none" stroke="${red}" stroke-width="2.5"/>`;
 r.states.forEach(p=>{s+=`<circle cx="${xm(p.t)}" cy="${ym(p.y)}" r="2.5" fill="${red}"/>`;});
 s+=`<circle cx="${xm(r.current.t)}" cy="${ym(r.current.y)}" r="5" fill="${ink}" stroke="${paper}" stroke-width="1.5"/><text x="54" y="287" font-size="11">t=1 / noise</text><text x="704" y="287" text-anchor="end" font-size="11">t=0 / data</text><text x="24" y="318" font-size="11">Euler end = ${f(r.endpoint,5)} | analytic end = ${f(r.exact,5)} | error = ${f(r.error,5)}</text><text x="24" y="345" font-size="10">Reverse step: y_new = y - v_cfg / N. These are hand-defined fields, not image models.</text></g></svg>`;return s;
}
function rows(doc,target,data){target.replaceChildren();data.forEach(values=>{const tr=doc.createElement('tr');values.forEach(value=>{const td=doc.createElement('td');td.textContent=value;tr.append(td);});target.append(tr);});}
function mountGAN(doc){doc.querySelectorAll('[data-gan-gradient-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-gan-'+k+']');
 const update=()=>{const options={mode:get('mode').value,logit:Number(get('logit').value),rate:Number(get('rate').value)},r=gan(options);get('logit-output').textContent=f(r.logit,2);get('rate-output').textContent=f(r.rate,2);get('plot').innerHTML=ganSVG(options);get('probability').textContent=r.probability.toFixed(6);get('sat-gradient').textContent=Math.abs(r.targets.saturating.gradient).toFixed(6);get('ns-gradient').textContent=Math.abs(r.targets.nonsaturating.gradient).toFixed(6);rows(doc,get('rows'),modes.map(m=>[m.label,f(r.targets[m.key].loss,6),f(r.targets[m.key].gradient,6),f(r.targets[m.key].next,6)]));get('result').textContent=`当前目标的 logit 导数为 ${f(r.selected.gradient,6)}，标量示意更新后 a = ${f(r.selected.next,6)}。这只是局部方向，真实网络参数梯度还需完整链式求导。`;};
 get('mode').addEventListener('change',update);for(const key of ['logit','rate'])get(key).addEventListener('input',update);get('reset').addEventListener('click',()=>{get('mode').value='nonsaturating';get('logit').value='-6';get('rate').value='0.5';update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mountFlow(doc){doc.querySelectorAll('[data-rectified-flow-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-flow-'+k+']');
 const update=()=>{const steps=Number(get('steps').value),view=Math.min(steps,Number(get('view').value));get('view').setAttribute('max',String(steps));get('view').value=String(view);const options={mean:Number(get('mean').value),guidance:Number(get('guidance').value),noise:Number(get('noise').value),steps,view},r=rectifiedFlow(options);for(const key of ['mean','guidance','noise'])get(key+'-output').textContent=f(options[key],2);get('view-output').textContent=`${view} / ${steps}`;get('plot').innerHTML=flowSVG(options);get('endpoint').textContent=f(r.endpoint,6);get('exact').textContent=f(r.exact,6);get('error').textContent=f(r.error,6);const p=r.current;rows(doc,get('rows'),[[f(p.t,5),f(p.y,5),f(p.unconditional,5),f(p.conditional,5),f(p.guided,5)]]);get('result').textContent=`第 ${view} 次更新后，t = ${f(p.t,5)}。v_cfg = (1+${f(r.guidance,2)})v_c − ${f(r.guidance,2)}v_u = ${f(p.guided,5)}。`+(view===steps?'当前已到 t=0，不再执行下一步。':`下一次反向更新乘 Δt = −1/${steps}。`)+`等价记号 s = 1+w = ${f(1+r.guidance,2)}。`;};
 for(const key of ['mean','guidance','noise','view'])get(key).addEventListener('input',update);get('steps').addEventListener('change',update);get('reset').addEventListener('click',()=>{get('mean').value='1.2';get('guidance').value='0';get('noise').value='1';get('steps').value='8';get('view').setAttribute('max','8');get('view').value='4';update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mount(doc){mountGAN(doc);mountFlow(doc);}
return {softplus,sigmoid,gan,ganSVG,varianceAt,velocity,cfgVelocity,exactFlow,rectifiedFlow,flowSVG,mountGAN,mountFlow,mount};
});
