(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)api.mount(root.document);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ink='#22251f',red='#b42e20',blue='#365a68',paper='#f6f3eb',line='#d8d8cc';
const f=(n,d=3)=>Math.abs(n)<.5*10**(-d)?'0':n.toFixed(d),sum=a=>a.reduce((s,n)=>s+n,0),prob=n=>n<.0001?n.toExponential(1):n.toFixed(4);
function arScore(bits,{first=.5,afterZero=.2,afterOne=.8}={}){
 const factors=bits.map((bit,i)=>{const p=i===0?first:bits[i-1]?afterOne:afterZero;return bit?p:1-p;});
 const logProbability=sum(factors.map(Math.log));return {factors,logProbability,nll:-logProbability,probability:Math.exp(logProbability)};
}
function autoregressive({bits=[1,1,0,1],first=.5,afterZero=.2,afterOne=.8,time=2}={}){
 const params={first,afterZero,afterOne},distribution=Array.from({length:16},(_,id)=>{const sequence=id.toString(2).padStart(4,'0').split('').map(Number);return {bits:sequence,...arScore(sequence,params)};});
 return {bits:[...bits],...arScore(bits,params),distribution,total:sum(distribution.map(d=>d.probability)),time,first,afterZero,afterOne};
}
function sampleAR({first=.5,afterZero=.2,afterOne=.8}={},seed=7){
 let state=seed>>>0;const bits=[],uniforms=[];for(let i=0;i<4;i++){state=(Math.imul(1664525,state)+1013904223)>>>0;const u=state/4294967296,p=i===0?first:bits[i-1]?afterOne:afterZero;uniforms.push(u);bits.push(Number(u<p));}return {bits,uniforms};
}
function start(title,description,w,h){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><desc>${description}</desc><rect width="${w}" height="${h}" fill="${paper}"/><g font-family="monospace" fill="${ink}">`;}
function autoregressiveSVG(options={}){
 const r=autoregressive(options);let s=start('Autoregressive probability chain for a binary image','Left: available prefix. Middle: four conditional probabilities for the full target. Right: all sixteen outcomes and their normalized joint probabilities.',760,352);
 s+=`<defs><pattern id="generative-ar-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 7L7 0M6 8L8 6" stroke="${line}"/></pattern></defs><text x="24" y="28" font-size="13">FOUR BINARY VARIABLES / TARGET ${r.bits.join('')}</text><text x="24" y="60" font-size="11">PREFIX / STEP ${r.time}</text><text x="190" y="60" font-size="11">CONDITIONAL FACTORS</text><text x="440" y="60" font-size="11">ALL 16 OUTCOMES</text>`;
 r.bits.forEach((bit,i)=>{const x=24+i%2*56,y=84+Math.floor(i/2)*56,known=i<r.time-1,current=i===r.time-1;s+=`<rect x="${x}" y="${y}" width="53" height="53" fill="${known?(bit?ink:paper):'url(#generative-ar-hatch)'}" stroke="${current?red:line}" stroke-width="${current?2:1}"/><text x="${x+5}" y="${y+12}" font-size="9" fill="${known&&bit?paper:ink}">x${i+1}</text><text x="${x+27}" y="${y+37}" text-anchor="middle" font-size="20" fill="${known&&bit?paper:current?red:ink}">${known?bit:current?'?':'·'}</text>`;});
 s+=`<text x="24" y="221" font-size="10">row-major order</text><text x="24" y="242" font-size="10">x1 -> x2 -> x3 -> x4</text>`;
 r.factors.forEach((p,i)=>{const y=85+i*47;if(i===r.time-1)s+=`<rect x="183" y="${y-10}" width="234" height="43" fill="#eae2d8"/>`;s+=`<text x="190" y="${y+4}" font-size="10">${i===0?`p(x1=${r.bits[0]})`:`p(x${i+1}=${r.bits[i]} | x${i}=${r.bits[i-1]})`}</text><text x="190" y="${y+23}" font-size="13">${f(p,5)}</text>`;});
 r.distribution.forEach((d,i)=>{const x=440+i%4*72,y=82+Math.floor(i/4)*50,selected=d.bits.join('')===r.bits.join('');s+=`<rect x="${x}" y="${y}" width="68" height="45" fill="${paper}" stroke="${selected?red:line}" stroke-width="${selected?2:1}"/><text x="${x+7}" y="${y+16}" font-size="10">${d.bits.join('')}</text><text x="${x+7}" y="${y+34}" font-size="10">${prob(d.probability)}</text>`;});
 s+=`<text x="24" y="312" font-size="12">p(target) = product of factors = ${f(r.probability,6)}</text><text x="24" y="336" font-size="11">sum over all outcomes = ${f(r.total,6)} | negative log likelihood = ${f(r.nll,5)}</text></g></svg>`;return s;
}
function normalPDF(z,mu=0,variance=1){return Math.exp(-((z-mu)**2)/(2*variance))/Math.sqrt(2*Math.PI*variance);}
function gaussianKL(muQ,varQ,muP=0,varP=1){return Math.max(0,.5*((varQ+(muQ-muP)**2)/varP-1+Math.log(varP/varQ)));}
function gaussianVAE({x=1,mu=0,sigma=1,epsilon=.5}={}){
 if(!(sigma>0))throw new RangeError('Positive standard deviation required');
 const variance=sigma**2,observationVariance=.25,posteriorVariance=.2,posteriorMu=.8*x,expectedLogLikelihood=-.5*(Math.log(2*Math.PI*observationVariance)+((x-mu)**2+variance)/observationVariance),klPrior=gaussianKL(mu,variance),elbo=expectedLogLikelihood-klPrior,logDensity=-.5*(Math.log(2*Math.PI*1.25)+x*x/1.25),gap=gaussianKL(mu,variance,posteriorMu,posteriorVariance);
 return {x,mu,sigma,epsilon,variance,posteriorMu,posteriorVariance,expectedLogLikelihood,klPrior,elbo,logDensity,gap,z:mu+sigma*epsilon};
}
function vaeSVG(options={}){
 const r=gaussianVAE(options),lo=Math.min(-4,r.mu-3*r.sigma,r.z-.5),hi=Math.max(4,r.mu+3*r.sigma,r.z+.5),xmap=z=>44+(z-lo)/(hi-lo)*672,maxDensity=Math.max(normalPDF(0),normalPDF(r.mu,r.mu,r.variance),normalPDF(r.posteriorMu,r.posteriorMu,r.posteriorVariance))*1.15,ymap=d=>230-d/maxDensity*148;
 let s=start('Exact one-dimensional Gaussian ELBO and reparameterization','The approximate posterior, exact posterior and prior are density curves. A fixed epsilon gives one reparameterized value, while the ELBO is computed in closed form.',760,318);
 s+=`<text x="24" y="28" font-size="13">1D GAUSSIAN LATENT MODEL / FIXED GENERATOR</text><text x="24" y="51" font-size="11" fill="${red}">q(z|x)</text><text x="160" y="51" font-size="11" fill="${blue}">true posterior (dashed)</text><text x="440" y="51" font-size="11" fill="#777c73">prior p(z)</text><text x="44" y="76" font-size="10">density</text>`;
 const curve=(mu,variance,color,dash='')=>{const points=Array.from({length:321},(_,i)=>{const z=lo+(hi-lo)*i/320;return xmap(z)+','+ymap(normalPDF(z,mu,variance));}).join(' ');return `<polyline points="${points}" fill="none" stroke="${color}" stroke-width="2"${dash?' stroke-dasharray="'+dash+'"':''}/>`;};
 s+=curve(0,1,'#92968d')+curve(r.posteriorMu,r.posteriorVariance,blue,'5 4')+curve(r.mu,r.variance,red)+`<path d="M44 230H716" stroke="${ink}"/>`;
 for(let i=0;i<=4;i++){const z=lo+(hi-lo)*i/4,px=xmap(z);s+=`<path d="M${px} 230v5" stroke="${ink}"/><text x="${px}" y="253" text-anchor="middle" font-size="10">${f(z,1)}</text>`;}
 s+=`<path d="M${xmap(r.z)} 230V${ymap(normalPDF(r.z,r.mu,r.variance))}" stroke="${ink}" stroke-dasharray="2 3"/><circle cx="${xmap(r.z)}" cy="230" r="4" fill="${ink}"/><text x="24" y="288" font-size="12">z = mu + sigma * epsilon = ${f(r.z,5)}</text><text x="24" y="308" font-size="10">Changing epsilon moves the marker; the exact expected ELBO stays unchanged.</text></g></svg>`;return s;
}
function rows(doc,target,data){target.replaceChildren();data.forEach(values=>{const tr=doc.createElement('tr');values.forEach(value=>{const td=doc.createElement('td');td.textContent=value;tr.append(td);});target.append(tr);});}
function mountAR(doc){doc.querySelectorAll('[data-autoregressive-chain-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-ar-'+k+']');let bits=[1,1,0,1],seed=7,lastSeed=null;const buttons=[];
 const params=()=>({first:Number(get('first').value),afterZero:Number(get('after-zero').value),afterOne:Number(get('after-one').value)});
 const update=()=>{const options={...params(),bits,time:Number(get('time').value)},r=autoregressive(options);for(const key of ['first','after-zero','after-one'])get(key+'-output').textContent=f(Number(get(key).value),2);get('time-output').textContent=String(r.time);buttons.forEach((button,i)=>{button.textContent=`x${i+1} = ${bits[i]}`;button.setAttribute('aria-pressed',String(Boolean(bits[i])));button.setAttribute('aria-label',`目标像素 x${i+1} 当前为 ${bits[i]}，点击切换`);});get('plot').innerHTML=autoregressiveSVG(options);get('joint').textContent=f(r.probability,6);get('nll').textContent=f(r.nll,5);get('total').textContent=f(r.total,6);rows(doc,get('rows'),r.factors.map((p,i)=>[String(i+1),i?bits.slice(0,i).join(''):'空',String(bits[i]),f(p,5),f(-Math.log(p),5)]));get('result').textContent=`四项条件概率相乘得到 p(${bits.join('')}) = ${f(r.probability,6)}，四项负对数贡献相加得到 ${f(r.nll,5)} nat。`+(lastSeed===null?'':`本次顺序采样种子：${lastSeed}。`);};
 for(let i=0;i<4;i++){const button=doc.createElement('button');button.type='button';button.addEventListener('click',()=>{bits[i]=1-bits[i];lastSeed=null;update();});buttons.push(button);get('bits').append(button);}
 for(const key of ['first','after-zero','after-one'])get(key).addEventListener('input',()=>{lastSeed=null;update();});get('time').addEventListener('input',update);get('sample').addEventListener('click',()=>{lastSeed=seed;bits=sampleAR(params(),seed++).bits;update();});get('reset').addEventListener('click',()=>{bits=[1,1,0,1];seed=7;lastSeed=null;for(const[k,v]of [['first','0.5'],['after-zero','0.2'],['after-one','0.8'],['time','2']])get(k).value=v;update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mountVAE(doc){doc.querySelectorAll('[data-gaussian-vae-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-vae-'+k+']');
 const update=()=>{const options={x:Number(get('x').value),mu:Number(get('mu').value),sigma:Number(get('sigma').value),epsilon:Number(get('epsilon').value)},r=gaussianVAE(options);for(const key of ['x','mu','sigma','epsilon'])get(key+'-output').textContent=f(options[key],3);get('plot').innerHTML=vaeSVG(options);get('elbo').textContent=f(r.elbo,6);get('log-density').textContent=f(r.logDensity,6);get('gap').textContent=f(r.gap,6);rows(doc,get('rows'),[['E_q[log p(x|z)]',f(r.expectedLogLikelihood,6),'期望重建对数密度'],['KL(q‖p(z))',f(r.klPrior,6),'ELBO 中的先验约束'],['KL(q‖p(z|x))',f(r.gap,6),'log p(x) − ELBO'],['真实后验均值 / 方差',`${f(r.posteriorMu,5)} / ${f(r.posteriorVariance,5)}`,'此线性高斯模型可精确求解'],['z = μ + σε',f(r.z,6),'由当前固定 ε 得到的单次取值'],['∂z/∂μ；∂z/∂σ',`1；${f(r.epsilon,3)}`,'固定 ε 的路径导数']]);get('result').textContent=`ELBO = ${f(r.expectedLogLikelihood,6)} − ${f(r.klPrior,6)} = ${f(r.elbo,6)}；加上后验 KL ${f(r.gap,6)} 得到真实 log p(x) = ${f(r.logDensity,6)}。`;};
 for(const key of ['x','mu','sigma','epsilon'])get(key).addEventListener('input',update);get('match').addEventListener('click',()=>{get('mu').value=String(.8*Number(get('x').value));get('sigma').value=String(Math.sqrt(.2));update();});get('prior').addEventListener('click',()=>{get('mu').value='0';get('sigma').value='1';update();});get('reset').addEventListener('click',()=>{for(const[k,v]of [['x','1'],['mu','0'],['sigma','1'],['epsilon','0.5']])get(k).value=v;update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mount(doc){mountAR(doc);mountVAE(doc);}
return {arScore,autoregressive,sampleAR,autoregressiveSVG,normalPDF,gaussianKL,gaussianVAE,vaeSVG,mountAR,mountVAE,mount};
});
