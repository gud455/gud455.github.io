const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture14.js');
const close=(x,y,e=1e-8)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const keys=['saturating','nonsaturating','discriminator'];
const center=a.gan({logit:0});close(center.probability,.5);close(center.targets.saturating.loss,-Math.log(2));close(center.targets.nonsaturating.loss,Math.log(2));close(center.targets.discriminator.loss,Math.log(2));
for(const logit of [-8,-3,0,3,8])for(const mode of keys){
 const r=a.gan({logit,mode}),h=1e-4,difference=(a.gan({logit:logit+h,mode}).selected.loss-a.gan({logit:logit-h,mode}).selected.loss)/(2*h);close(difference,r.selected.gradient,1e-8);
 assert.ok(mode==='discriminator'?r.selected.gradient>0:r.selected.gradient<0);assert.ok(mode==='discriminator'?r.selected.next<logit:r.selected.next>logit);
}
const weak=a.gan({logit:-6});assert.ok(Math.abs(weak.targets.nonsaturating.gradient)>400*Math.abs(weak.targets.saturating.gradient));
for(const logit of [-1000,-100,100,1000]){const r=a.gan({logit});assert.ok(Number.isFinite(r.probability));for(const v of Object.values(r.targets))for(const n of Object.values(v))assert.ok(Number.isFinite(n));}
close(a.varianceAt(0),.36);close(a.varianceAt(1),1);
// Independently differentiate the analytic path: it must solve the velocity ODE.
for(const t of [0,.1,.5,.9,1])for(const mean of [-1.5,0,1.2])for(const noise of [-2,0,1,2]){
 const h=1e-5,y=a.exactFlow(t,noise,mean),dy=(a.exactFlow(t+h,noise,mean)-a.exactFlow(t-h,noise,mean))/(2*h);close(dy,a.velocity(y,t,mean),2e-9);
}
// Gaussian conditional expectation E[Z-X | (1-t)X+tZ=y], derived from covariances.
for(const t of [0,.25,.8,1])for(const mean of [-1,1.2])for(const y of [-2,.4,3]){
 const ex=(1-t)*mean,ev=-mean,cov=t-(1-t)*.36,variance=(1-t)**2*.36+t*t;close(a.velocity(y,t,mean),ev+cov/variance*(y-ex));
 for(const guidance of [0,.5,2]){const r=a.cfgVelocity(y,t,mean,guidance);close(r.guided,a.velocity(y,t,(1+guidance)*mean));if(guidance===0)close(r.guided,r.conditional);}
}
for(const steps of [1,2,4,8,16,32])for(const guidance of [0,1,2]){
 const r=a.rectifiedFlow({steps,guidance,noise:-1.3,mean:.7,view:steps});assert.equal(r.states.length,steps+1);assert.equal(r.states[0].t,1);assert.equal(r.states.at(-1).t,0);assert.equal(r.current,r.states.at(-1));close(r.exact,(1+guidance)*.7-.78);
 for(let i=1;i<r.states.length;i++){const before=r.states[i-1],after=r.states[i];close(after.t-before.t,-1/steps);close(after.y,before.y-before.guided/steps);}
 close(a.rectifiedFlow({steps,guidance,noise:0,mean:.7}).error,0);close(a.rectifiedFlow({steps:1,guidance,noise:2,mean:.7}).endpoint,(1+guidance)*.7);
}
let previous=Infinity;for(const steps of [2,4,8,16,32]){const error=a.rectifiedFlow({steps}).error;assert.ok(error<previous);previous=error;}assert.ok(previous<.03);
assert.equal(a.rectifiedFlow({view:100,steps:2}).current.step,2);assert.equal(a.rectifiedFlow({view:-1}).current.step,0);
for(const[file,svg]of [['gan-gradient-static.svg',a.ganSVG()],['rectified-flow-static.svg',a.flowSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
for(const guidance of [0,2])for(const steps of [1,32])assert.ok(!/NaN|Infinity/.test(a.flowSVG({guidance,steps,mean:-1.5,noise:2,view:steps})));
// Execute the actual UI handlers. This harness makes no browser layout claims.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};this.attributes={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
const make=(prefix,names)=>{const e=new E();for(const key of names)e.one[`[data-${prefix}-${key}]`]=new E();return e;};
const gan=make('gan',['mode','logit','rate','reset','logit-output','rate-output','plot','static','controls','probability','sat-gradient','ns-gradient','rows','result']),g=k=>gan.one[`[data-gan-${k}]`];for(const[k,v]of [['mode','nonsaturating'],['logit','-6'],['rate','0.5']])g(k).value=v;
a.mountGAN({querySelectorAll:()=>[gan],createElement:()=>new E()});assert.equal(g('controls').hidden,false);assert.equal(g('plot').hidden,false);assert.equal(g('static').hidden,true);assert.equal(g('rows').children.length,3);assert.equal(g('probability').textContent,'0.002473');assert.ok(g('result').textContent.includes('-5.501236'));
g('mode').value='discriminator';g('mode').emit('change');assert.ok(g('result').textContent.includes('-6.001236'));g('logit').value='0';g('logit').emit('input');assert.equal(g('probability').textContent,'0.500000');g('rate').value='1';g('rate').emit('input');assert.equal(g('rows').children[2].children[3].textContent,'-0.500000');g('reset').emit('click');assert.equal(g('logit').value,'-6');assert.equal(g('mode').value,'nonsaturating');assert.equal(g('rate').value,'0.5');assert.ok(g('result').textContent.includes('-5.501236'));
const flow=make('flow',['mean','guidance','noise','steps','view','reset','mean-output','guidance-output','noise-output','view-output','plot','static','controls','endpoint','exact','error','rows','result']),p=k=>flow.one[`[data-flow-${k}]`];for(const[k,v]of [['mean','1.2'],['guidance','0'],['noise','1'],['steps','8']])p(k).value=v;
// Model native range clamping: setting value while max=1 would discard a reset-to-4.
let rangeValue='4';p('view').attributes.max='8';Object.defineProperty(p('view'),'value',{get(){return rangeValue;},set(v){rangeValue=String(Math.min(Number(this.attributes.max),Math.max(0,Number(v))));}});p('view').setAttribute=function(k,v){this.attributes[k]=v;if(k==='max')this.value=rangeValue;};
a.mountFlow({querySelectorAll:()=>[flow],createElement:()=>new E()});assert.equal(p('controls').hidden,false);assert.equal(p('plot').hidden,false);assert.equal(p('static').hidden,true);assert.equal(p('rows').children.length,1);assert.equal(p('exact').textContent,'1.800000');assert.equal(p('endpoint').textContent,'1.703669');assert.equal(p('view-output').textContent,'4 / 8');
p('guidance').value='2';p('guidance').emit('input');assert.equal(p('exact').textContent,'4.200000');assert.ok(p('result').textContent.includes('s = 1+w = 3.00'));p('view').value='8';p('view').emit('input');assert.ok(p('result').textContent.includes('不再执行下一步'));p('steps').value='1';p('steps').emit('change');assert.equal(p('view').value,'1');assert.equal(p('view').attributes.max,'1');assert.equal(p('view-output').textContent,'1 / 1');assert.equal(p('endpoint').textContent,'3.600000');
p('reset').emit('click');assert.equal(p('steps').value,'8');assert.equal(p('view').attributes.max,'8');assert.equal(p('view').value,'4');assert.equal(p('guidance').value,'0');assert.equal(p('endpoint').textContent,'1.703669');p('noise').value='0';p('noise').emit('input');assert.equal(p('error').textContent,'0');p('mean').value='-1';p('mean').emit('input');assert.equal(p('endpoint').textContent,'-1.000000');
console.log('Passed GAN finite differences and stable extremes, Gaussian velocity/path identity, CFG convention, reverse Euler direction/count/convergence, static figures, and actual controls/clamping/reset events.');
