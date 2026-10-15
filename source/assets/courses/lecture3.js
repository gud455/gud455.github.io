/* Lecture 3: deterministic synthetic regression and optimization; no dependencies. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)api.mount(root.document);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const lambdas=[0,0.0001,0.001,0.01,0.1,1,10];
const methods=[{key:'gd',name:'梯度下降',color:'#b42e20'},{key:'momentum',name:'Momentum',color:'#276075'},{key:'rmsprop',name:'RMSProp',color:'#61692b'},{key:'adam',name:'Adam',color:'#78517a'}];
const truth=x=>0.65*Math.sin(3*x)+0.15*x;
function random(seed){let state=seed>>>0;return()=>{state=(Math.imul(1664525,state)+1013904223)>>>0;return state/4294967296;};}
function samples(){const r=random(23103);return {train:Array.from({length:10},(_,i)=>{const x=-0.95+1.9*i/9;return{x,y:truth(x)+(r()-.5)*.5};}),val:Array.from({length:30},(_,i)=>{const x=-1+2*(i+.37)/30;return{x,y:truth(x)+(r()-.5)*.5};})};}
function basis(x,degree){const values=[1,x];for(let n=2;n<=degree;n++)values.push(((2*n-1)*x*values[n-1]-(n-1)*values[n-2])/n);return values.slice(0,degree+1);}
function solve(matrix,rhs){const n=rhs.length,a=matrix.map((row,i)=>[...row,rhs[i]]);
for(let i=0;i<n;i++){let pivot=i;for(let j=i+1;j<n;j++)if(Math.abs(a[j][i])>Math.abs(a[pivot][i]))pivot=j;if(Math.abs(a[pivot][i])<1e-14)throw Error('Singular regression system');[a[i],a[pivot]]=[a[pivot],a[i]];const d=a[i][i];for(let j=i;j<=n;j++)a[i][j]/=d;for(let k=0;k<n;k++)if(k!==i){const factor=a[k][i];for(let j=i;j<=n;j++)a[k][j]-=factor*a[i][j];}}
return a.map(row=>row[n]);}
function fitRidge(degree=9,lambda=.01,data=samples()){
const n=degree+1,A=Array.from({length:n},()=>Array(n).fill(0)),b=Array(n).fill(0);
for(const p of data.train){const z=basis(p.x,degree);for(let i=0;i<n;i++){b[i]+=z[i]*p.y/data.train.length;for(let j=0;j<n;j++)A[i][j]+=z[i]*z[j]/data.train.length;}}
for(let j=1;j<n;j++)A[j][j]+=lambda;
const coefficients=solve(A,b),predict=x=>basis(x,degree).reduce((sum,v,i)=>sum+v*coefficients[i],0);
const mse=points=>points.reduce((sum,p)=>sum+(predict(p.x)-p.y)**2,0)/points.length;
return{degree,lambda,coefficients,predict,trainMSE:mse(data.train),valMSE:mse(data.val),norm:coefficients.slice(1).reduce((sum,v)=>sum+v*v,0),data};}
function learningRate(lr,step,schedule){if(schedule==='step')return lr*(step<40?1:step<80?.3:.09);if(schedule==='cosine')return lr*.5*(1+Math.cos(Math.PI*Math.min(step,120)/120));return lr;}
function simulate(options={},steps=30){const lr=options.lr??.05,kappa=options.kappa??20,schedule=options.schedule||'constant',noise=options.noise??0,rand=random(303);
const states=methods.map(method=>({...method,w:[-3,1.5],velocity:[0,0],square:[0,0],path:[[-3,1.5]],updates:0,diverged:false}));
for(let t=0;t<Math.max(0,Math.min(120,Math.round(steps)));t++){
const eta=learningRate(lr,t,schedule),jitter=[noise*(rand()*2-1),noise*(rand()*2-1)];
for(const s of states){if(s.diverged)continue;const gradient=[s.w[0]+jitter[0],kappa*s.w[1]+jitter[1]];
for(let j=0;j<2;j++){let update=gradient[j];if(s.key==='momentum'){s.velocity[j]=.9*s.velocity[j]+gradient[j];update=s.velocity[j];}
else if(s.key==='rmsprop'){s.square[j]=.99*s.square[j]+.01*gradient[j]**2;update=gradient[j]/(Math.sqrt(s.square[j])+1e-8);}
else if(s.key==='adam'){s.velocity[j]=.9*s.velocity[j]+.1*gradient[j];s.square[j]=.999*s.square[j]+.001*gradient[j]**2;update=(s.velocity[j]/(1-.9**(t+1)))/(Math.sqrt(s.square[j]/(1-.999**(t+1)))+1e-8);}
s.w[j]-=eta*update;}
s.updates=t+1;s.loss=.5*(s.w[0]**2+kappa*s.w[1]**2);if(s.w.every(Number.isFinite))s.path.push([...s.w]);s.diverged=s.w.some(v=>!Number.isFinite(v)||Math.abs(v)>1e6);}
}
for(const s of states)s.loss=.5*(s.w[0]**2+kappa*s.w[1]**2);
return{states,steps:Math.max(0,Math.min(120,Math.round(steps))),kappa,lr,schedule,noise};}
const fmt=v=>Math.abs(v)>=10000||Math.abs(v)>0&&Math.abs(v)<.0001?v.toExponential(3):v.toFixed(4);
const xy=(x,y)=>`${Math.max(-1e5,Math.min(1e5,x)).toFixed(2)} ${Math.max(-1e5,Math.min(1e5,y)).toFixed(2)}`;
function ridgeSVG(fit){const px=x=>34+(x+1)*210,py=y=>270-(y+1.6)/3.2*244;let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 300" role="img" aria-labelledby="ridge-title"><title id="ridge-title">合成数据的正则化拟合：'+fit.degree+' 次，lambda '+fit.lambda+'</title><defs><clipPath id="ridge-clip"><rect x="34" y="26" width="420" height="244"/></clipPath></defs><rect width="480" height="300" fill="#faf9f4"/>';
for(const y of [-1.6,-.8,0,.8,1.6])s+=`<path d="M34 ${py(y)}H454" stroke="#deded3"/><text x="1" y="${py(y)+3}" font-family="monospace" font-size="9" fill="#66675e">${y.toFixed(1)}</text>`;
s+='<g clip-path="url(#ridge-clip)">';for(const [fn,color,dash]of [[truth,'#66675e','5 4'],[fit.predict,'#b42e20','']]){let d='';for(let i=0;i<=240;i++){const x=-1+i/120;d+=(i?'L':'M')+xy(px(x),py(fn(x)));}s+=`<path d="${d}" fill="none" stroke="${color}" stroke-width="2" stroke-dasharray="${dash}"/>`;}
for(const p of fit.data.val){const x=px(p.x),y=py(p.y);s+=`<path d="M${xy(x-3,y-3)}l6 6m-6 0l6-6" stroke="#276075" fill="none"/>`;}
for(const p of fit.data.train)s+=`<circle cx="${px(p.x)}" cy="${py(p.y)}" r="3.5" stroke="#242522" fill="#faf9f4" stroke-width="1.5"/>`;
return s+'</g><path d="M34 26V270H454" fill="none" stroke="#242522"/><g font-family="monospace" font-size="10" fill="#242522"><text x="28" y="288">-1</text><text x="240" y="288">0</text><text x="446" y="288">1 / x</text><text x="12" y="16">y</text></g></svg>';}
function optimizationSVG(result){const px=x=>240+52*x,py=y=>160-52*y;let s='<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 480 320" role="img" aria-labelledby="opt-title"><title id="opt-title">凸二次函数上的四种更新轨迹，第 '+result.steps+' 步</title><defs><clipPath id="opt-clip"><rect x="24" y="20" width="432" height="276"/></clipPath></defs><rect width="480" height="320" fill="#faf9f4"/><g clip-path="url(#opt-clip)">';
for(const loss of [1,4,9,16,25,36,49])s+=`<ellipse cx="240" cy="160" rx="${52*Math.sqrt(2*loss)}" ry="${52*Math.sqrt(2*loss/result.kappa)}" fill="none" stroke="#d8d8cb"/>`;
s+='<path d="M24 160H456M240 20V296" stroke="#aaa99c" stroke-dasharray="3 4"/>';
for(const state of result.states){const d=state.path.map((p,i)=>(i?'L':'M')+xy(px(p[0]),py(p[1]))).join('');s+=`<path d="${d}" fill="none" stroke="${state.color}" stroke-width="1.8" stroke-dasharray="${state.key==='rmsprop'?'4 2':''}"/>`;if(state.w.every(Number.isFinite))s+=`<circle cx="${px(state.w[0])}" cy="${py(state.w[1])}" r="3" fill="${state.color}"/>`;}
s+=`<circle cx="${px(-3)}" cy="${py(1.5)}" r="5" fill="none" stroke="#242522" stroke-width="2"/><path d="M233 160h14M240 153v14" stroke="#242522" stroke-width="2"/></g><g font-family="monospace" font-size="10" fill="#242522"><text x="425" y="312">w1</text><text x="7" y="18">w2</text><text x="245" y="175">0</text></g>`;
result.states.forEach((state,i)=>{s+=`<path d="M${30+i*112} 10h12" stroke="${state.color}" stroke-width="2"/><text x="${45+i*112}" y="13" font-family="Arial,sans-serif" font-size="9" fill="${state.color}">${state.key==='gd'?'GD':state.name}</text>`;});return s+'</svg>';}
function mountRidge(doc){doc.querySelectorAll('[data-ridge-lab]').forEach(lab=>{const $=q=>lab.querySelector(q),degree=$('[data-degree]'),strength=$('[data-lambda]');const render=()=>{const fit=fitRidge(Number(degree.value),lambdas[Number(strength.value)]);$('[data-ridge-plot]').innerHTML=ridgeSVG(fit);$('[data-degree-output]').textContent=degree.value;$('[data-lambda-output]').textContent=fit.lambda;$('[data-train-mse]').textContent=fmt(fit.trainMSE);$('[data-val-mse]').textContent=fmt(fit.valMSE);$('[data-weight-norm]').textContent=fmt(fit.norm);$('[data-ridge-result]').textContent=`${fit.degree} 次多项式 · λ = ${fit.lambda} · 训练 MSE ${fmt(fit.trainMSE)} / 验证 MSE ${fmt(fit.valMSE)}（固定合成数据）`;};degree.addEventListener('input',render);strength.addEventListener('input',render);$('[data-ridge-reset]').addEventListener('click',()=>{degree.value='9';strength.value='3';render();});render();$('[data-ridge-controls]').hidden=false;$('[data-ridge-plot]').hidden=false;$('[data-ridge-static]').hidden=true;});}
function mountOptimization(doc){doc.querySelectorAll('[data-optimizer-lab]').forEach(lab=>{const $=q=>lab.querySelector(q),lr=$('[data-opt-lr]'),curvature=$('[data-curvature]'),schedule=$('[data-schedule]'),noise=$('[data-gradient-noise]'),step=$('[data-opt-step]');const render=()=>{const result=simulate({lr:Number(lr.value),kappa:Number(curvature.value),schedule:schedule.value,noise:Number(noise.value)},Number(step.value));$('[data-optimizer-plot]').innerHTML=optimizationSVG(result);$('[data-lr-output]').textContent=Number(lr.value).toFixed(3);$('[data-curvature-output]').textContent=curvature.value;$('[data-step-output]').textContent=step.value;const rows=$('[data-optimizer-rows]');rows.replaceChildren();result.states.forEach(state=>{const row=doc.createElement('tr');for(const text of [state.name,String(state.updates),state.diverged?'数值发散，已停止':fmt(state.loss)]){const cell=doc.createElement('td');cell.textContent=text;row.append(cell);}rows.append(row);});const diverged=result.states.filter(s=>s.diverged).map(s=>s.name);$('[data-optimizer-result]').textContent=`第 ${result.steps} 步 · κ = ${result.kappa} · 当前调度学习率 ${learningRate(result.lr,Math.max(0,result.steps-1),result.schedule).toFixed(4)}${diverged.length?' · 数值发散：'+diverged.join('、'):''} · 同一学习率仅用于观察机制差异。`;};[lr,curvature,step].forEach(input=>input.addEventListener('input',render));[schedule,noise].forEach(input=>input.addEventListener('change',render));$('[data-opt-advance]').addEventListener('click',()=>{step.value=String(Math.min(120,Number(step.value)+10));render();});$('[data-opt-reset]').addEventListener('click',()=>{lr.value='.05';curvature.value='20';schedule.value='constant';noise.value='0';step.value='30';render();});render();$('[data-optimizer-controls]').hidden=false;$('[data-optimizer-plot]').hidden=false;$('[data-optimizer-static]').hidden=true;});}
function mount(doc){mountRidge(doc);mountOptimization(doc);}
return{lambdas,methods,truth,samples,basis,solve,fitRidge,learningRate,simulate,ridgeSVG,optimizationSVG,mountRidge,mountOptimization,mount};
});
