const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture6.js');
const close=(x,y,e=1e-10)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`),relative=(x,y)=>assert.ok(Math.abs(x-y)<Math.max(1e-300,Math.abs(y))*1e-10,`${x} != ${y}`);
let r=a.residual(4,.2);close(r.plainGradient,.0016);close(r.residualGradient,2.0736);
assert.equal(a.residual(30,0).plainGradient,0);assert.equal(a.residual(30,0).residualGradient,1);assert.equal(a.residual(3,-1).plainGradient,-1);assert.equal(a.residual(3,-1).residualGradient,0);
assert.ok(a.residual(20,.5).residualGradient>1000);assert.ok(a.residual(20,-.9).residualGradient<1e-19);
for(const skip of [false,true]){const run=x=>{for(let i=0;i<5;i++)x=skip?x+(-.2)*x:(-.2)*x;return x;};const gradient=(run(1+1e-5)-run(1-1e-5))/(2e-5);close(gradient,skip?a.residual(5,-.2).residualGradient:a.residual(5,-.2).plainGradient);}
assert.deepEqual(a.stats(new Float64Array([1,3])),{mean:2,second:5}); // second moment, not centered variance
assert.deepEqual([...a.dense(new Float64Array([1,-1,2,0]),new Float64Array([1,2,3,4]),2,1,'identity')],[-1,-1,2,6]);
assert.deepEqual([...a.dense(new Float64Array([1,-1]),new Float64Array([1,2,3,4]),2,1,'relu')],[0,0]);
close(a.dense(new Float64Array([1,-1]),new Float64Array([1,2,3,4]),2,1,'tanh')[0],Math.tanh(-1));
const normal=a.gaussian(123),sample=Float64Array.from({length:10000},normal),moments=a.stats(sample);assert.ok(Math.abs(moments.mean)<.04);assert.ok(Math.abs(moments.second-1)<.06);
const first=a.initialize(),again=a.initialize();assert.deepEqual(first,again);assert.notDeepEqual(first.series[1].points,a.initialize({seed:23107}).series[1].points);
assert.equal(first.depth,6);assert.equal(first.batch,16);close(first.series[1].std,Math.sqrt(2/first.width));
for(const activation of ['relu','identity']){const result=a.initialize({width:16,depth:6,activation});for(const scheme of result.series)for(let layer=0;layer<=6;layer++)relative(scheme.points[layer].second,result.series[1].points[layer].second*scheme.factor**(2*layer));}
const tanh=a.initialize({width:16,depth:12,activation:'tanh'});for(const scheme of tanh.series)for(const p of scheme.points.slice(1)){assert.ok(p.second>=0&&p.second<=1);assert.ok(Math.abs(p.mean)<=1);}
assert.deepEqual(first.series[1].points,a.initialize({depth:12}).series[1].points.slice(0,7));
for(const[file,svg]of [['residual-gradient-static.svg',a.residualSVG()],['initialization-static.svg',a.initializationSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
// Execute actual handlers; browser layout is outside this harness.
class E{constructor(){this.hidden=true;this.textContent='';this.innerHTML='';this.value='';this.one={};this.children=[];this.events={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}}
const make=keys=>{const e=new E();for(const key of keys)e.one[`[${key}]`]=new E();return e;};
const res=make(['data-res-depth','data-res-slope','data-residual-plot','data-res-depth-output','data-res-slope-output','data-plain-gradient','data-residual-gradient','data-local-gradient','data-residual-result','data-res-zero','data-res-cancel','data-res-reset','data-residual-controls','data-residual-static']);
res.one['[data-res-depth]'].value='20';res.one['[data-res-slope]'].value='.05';a.mountResidual({querySelectorAll:()=>[res]});assert.equal(res.one['[data-residual-gradient]'].textContent,'2.6533');
res.one['[data-res-zero]'].emit('click');assert.equal(res.one['[data-residual-gradient]'].textContent,'1.0000');assert.equal(res.one['[data-plain-gradient]'].textContent,'0');
res.one['[data-res-cancel]'].emit('click');assert.equal(res.one['[data-residual-gradient]'].textContent,'0');assert.ok(res.one['[data-residual-result]'].textContent.includes('抵消'));
res.one['[data-res-reset]'].emit('click');assert.equal(res.one['[data-residual-gradient]'].textContent,'2.6533');assert.equal(res.one['[data-residual-controls]'].hidden,false);
const init=make(['data-init-width','data-init-depth','data-init-activation','data-initialization-plot','data-init-seed','data-init-rows','data-initialization-result','data-init-new-seed','data-init-reset','data-initialization-controls','data-initialization-static']);
for(const[k,v]of [['width','32'],['depth','6'],['activation','relu']])init.one[`[data-init-${k}]`].value=v;
a.mountInitialization({querySelectorAll:()=>[init],createElement:()=>new E()});assert.equal(init.one['[data-init-rows]'].children.length,3);const initial=init.one['[data-init-rows]'].children[1].children[3].textContent;
init.one['[data-init-new-seed]'].emit('click');assert.equal(init.one['[data-init-seed]'].textContent,23107);assert.notEqual(init.one['[data-init-rows]'].children[1].children[3].textContent,initial);
init.one['[data-init-activation]'].value='tanh';init.one['[data-init-activation]'].emit('change');assert.ok(init.one['[data-initialization-result]'].textContent.includes('tanh'));
init.one['[data-init-reset]'].emit('click');assert.equal(init.one['[data-init-seed]'].textContent,23106);assert.equal(init.one['[data-init-rows]'].children[1].children[3].textContent,initial);
console.log('Passed residual chain derivatives/cancellation, second-moment semantics, dense forward math, deterministic Gaussian sampling, shared-weight scale invariance, activation bounds, static plots and actual UI handlers.');
