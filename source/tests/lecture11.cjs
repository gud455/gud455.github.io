const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture11.js');
const close=(x,y,e=1e-8)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const known=a.dataParallel();assert.equal(known.global,-19/8);assert.equal(known.reduced,-19/8);assert.equal(known.next,1+.05*19/8);assert.deepEqual(known.groups.map(g=>g.gradient),[-.5,-4.25]);
for(const weight of [-1,.1,1,3]){
 close((a.globalLoss(weight+1e-5)-a.globalLoss(weight-1e-5))/(2e-5),a.dataParallel({weight}).global);
 for(let id=0;id<8;id++)close((a.sampleLoss(weight+1e-5,id)-a.sampleLoss(weight-1e-5,id))/(2e-5),a.sampleGradient(weight,id));
 for(const ranks of [2,4])for(const partition of ['balanced','uneven'])for(const rate of [.01,.05,.2]){
  const r=a.dataParallel({weight,ranks,partition,rate});assert.deepEqual(r.groups.flatMap(g=>g.ids),[0,1,2,3,4,5,6,7]);assert.equal(r.groups.reduce((s,g)=>s+g.n,0),8);close(r.groups.reduce((s,g)=>s+g.alpha,0),1);close(r.groups.reduce((s,g)=>s+g.alpha*g.loss,0),r.loss);close(r.reduced,r.global);close(r.next,weight-rate*r.global);if(partition==='balanced')close(r.naive,r.global);
 }
}
const uneven=a.dataParallel({ranks:4,partition:'uneven'});assert.equal(uneven.naive,-1.5625);assert.notEqual(uneven.naive,uneven.global);
// Validate each schedule event and its predecessor dependencies, not only the utilization formula.
for(const stages of [2,4,6])for(let microbatches=1;microbatches<=8;microbatches++){
 const r=a.pipeline({stages,microbatches});assert.equal(r.total,2*(microbatches+stages-1));let jobs=0;
 const times=new Map();r.schedule.forEach((row,s)=>{assert.equal(row.length,r.total);assert.equal(row.filter(Boolean).length,2*microbatches);assert.equal(row.filter(v=>!v).length,r.idlePerStage);row.forEach((job,t)=>{if(job){jobs++;const key=`${job.phase}-${s}-${job.micro}`;assert.ok(!times.has(key));times.set(key,t);}});});
 assert.equal(jobs,2*stages*microbatches);close(jobs/(stages*r.total),r.busyFraction);close(r.busyFraction+r.idleFraction,1);
 for(let s=0;s<stages;s++)for(let m=1;m<=microbatches;m++){
  const f=times.get(`F-${s}-${m}`),b=times.get(`B-${s}-${m}`);assert.ok(b>=f+1);assert.ok(f<r.phaseLength&&b>=r.phaseLength);
  if(s>0)assert.ok(f>=times.get(`F-${s-1}-${m}`)+1);
  if(s<stages-1)assert.ok(b>=times.get(`B-${s+1}-${m}`)+1);
 }
 for(let t=1;t<=r.total;t++){const v=a.pipeline({stages,microbatches,time:t});assert.deepEqual(v.current,v.schedule.map(row=>row[t-1]));}
}
close(a.pipeline({stages:4,microbatches:1}).busyFraction,.25);close(a.pipeline().busyFraction,4/7);assert.equal(a.pipeline({time:999}).time,14);
for(const[file,svg]of [['distributed-gradient-static.svg',a.gradientSVG()],['pipeline-schedule-static.svg',a.pipelineSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
// Exercise actual page listeners with the native temporal range's max/value clamp represented.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};this.attributes={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
const make=(prefix,keys)=>{const e=new E();for(const key of keys)e.one[`[data-${prefix}-${key}]`]=new E();return e;};
const dp=make('dp',['ranks','partition','weight','rate','weight-output','rate-output','plot','global','reduced','next','rows','result','reset','static','controls']),d=k=>dp.one[`[data-dp-${k}]`];
for(const[k,v]of [['ranks','2'],['partition','balanced'],['weight','1'],['rate','0.05']])d(k).value=v;
a.mountGradient({querySelectorAll:()=>[dp],createElement:()=>new E()});assert.equal(d('controls').hidden,false);assert.equal(d('static').hidden,true);assert.equal(d('global').textContent,'-2.37500');assert.equal(d('rows').children.length,2);
d('partition').value='uneven';d('partition').emit('change');assert.equal(d('global').textContent,d('reduced').textContent);assert.ok(d('result').textContent.includes('0.45833'));
d('ranks').value='4';d('ranks').emit('change');assert.equal(d('rows').children.length,4);assert.equal(d('rows').children[0].children[2].textContent,'1');
d('weight').value='2';d('weight').emit('input');close(Number(d('global').textContent),a.dataParallel({weight:2}).global);d('rate').value='0.1';d('rate').emit('input');close(Number(d('next').textContent),a.dataParallel({weight:2,rate:.1}).next);d('reset').emit('click');assert.equal(d('next').textContent,'1.11875');assert.equal(d('partition').value,'balanced');
const pipe=make('pipe',['stages','micro','time','micro-output','time-output','plot','total','busy','idle','rows','result','reset','next','static','controls']),p=k=>pipe.one[`[data-pipe-${k}]`];
let rangeValue='1';p('time').attributes.max='14';Object.defineProperty(p('time'),'value',{get(){return rangeValue;},set(v){rangeValue=String(Math.min(Number(this.attributes.max),Math.max(1,Number(v))));}});p('time').setAttribute=function(k,v){this.attributes[k]=v;if(k==='max')this.value=rangeValue;};
for(const[k,v]of [['stages','4'],['micro','4'],['time','1']])p(k).value=v;
a.mountPipeline({querySelectorAll:()=>[pipe],createElement:()=>new E()});assert.equal(p('controls').hidden,false);assert.equal(p('static').hidden,true);assert.equal(p('busy').textContent,'57.1%');assert.equal(p('rows').children[0].children[1].textContent,'前向');assert.equal(p('rows').children[1].children[1].textContent,'空闲');
p('next').emit('click');assert.equal(p('time-output').textContent,'2 / 14');p('time').value='14';p('time').emit('input');assert.equal(p('rows').children[0].children[1].textContent,'反向');p('next').emit('click');assert.equal(p('time').value,'1');
p('stages').value='2';p('micro').value='1';p('micro').emit('input');assert.equal(p('time').attributes.max,'4');assert.equal(p('busy').textContent,'50.0%');p('reset').emit('click');assert.equal(p('time').attributes.max,'14');assert.equal(p('busy').textContent,'57.1%');assert.equal(p('rows').children.length,4);
console.log('Passed global/per-sample finite-difference gradients, weighted loss/gradient equivalence, uneven-count counterexample, exact pipeline event coverage and dependencies, bubble ratios, static diagrams and actual UI events with time-range clamping/reset.');
