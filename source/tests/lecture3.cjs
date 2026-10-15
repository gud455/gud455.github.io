const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const api=require('../assets/courses/lecture3.js');
const close=(a,b,e=1e-10)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
assert.deepEqual(api.samples(),api.samples());
close(api.basis(.3,2)[2],(3*.3*.3-1)/2);
const solution=api.solve([[2,1],[1,3]],[1,2]);close(solution[0],.2);close(solution[1],.6);
const data={train:[-1,0,1].map(x=>({x,y:2+3*x})),val:[{x:.4,y:3.2}]};
let fit=api.fitRidge(1,0,data);close(fit.coefficients[0],2);close(fit.coefficients[1],3);close(fit.trainMSE,0);close(fit.valMSE,0);
fit=api.fitRidge(1,.5,data);close(fit.coefficients[0],2);close(fit.coefficients[1],12/7);
const other=api.fitRidge(1,.5,{...data,val:[{x:.4,y:1000}]});assert.deepEqual(other.coefficients,fit.coefficients);assert.ok(other.valMSE>fit.valMSE); // no validation leakage
let previousNorm=Infinity;
for(const lambda of api.lambdas){const r=api.fitRidge(9,lambda);assert.ok(r.norm<=previousNorm);previousNorm=r.norm;assert.ok(Number.isFinite(r.valMSE));}
assert.ok(api.fitRidge(9,0).trainMSE<1e-20);assert.ok(api.fitRidge(9,.01).valMSE<api.fitRidge(9,0).valMSE);assert.ok(api.fitRidge(9,10).trainMSE>api.fitRidge(9,.01).trainMSE);
close(api.learningRate(.1,39,'step'),.1);close(api.learningRate(.1,40,'step'),.03);close(api.learningRate(.1,80,'step'),.009);close(api.learningRate(.1,60,'cosine'),.05);close(api.learningRate(.1,120,'cosine'),0);
let result=api.simulate({},1);close(result.states[0].w[0],-2.85);close(result.states[0].w[1],0);assert.deepEqual(result.states[0].w,result.states[1].w);
close(result.states[2].w[0],-3+.05*3/(.3+1e-8));close(result.states[3].w[0],-3+.05*3/(3+1e-8));close(result.states[3].w[1],1.5-.05*30/(30+1e-8));
result=api.simulate({},2);close(result.states[1].w[0],-2.5725);close(result.states[1].w[1],-1.35);
const gd=api.simulate({lr:.15,kappa:20},120).states[0];assert.ok(gd.diverged);assert.ok(gd.updates<120);
const noisy=api.simulate({noise:.5},30);assert.deepEqual(noisy,api.simulate({noise:.5},30));assert.notDeepEqual(noisy.states[0].w,api.simulate().states[0].w);
for(const degree of [1,5,9])for(const lambda of [0,.01,10])assert.ok(!/NaN|Infinity/.test(api.ridgeSVG(api.fitRidge(degree,lambda))));
assert.ok(!/NaN|Infinity/.test(api.optimizationSVG(api.simulate({lr:.2,kappa:40},120))));
for(const [file,svg]of [['regularization-static.svg',api.ridgeSVG(api.fitRidge())],['optimization-static.svg',api.optimizationSVG(api.simulate())]])assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');
// Run the actual event listeners; these checks do not simulate browser layout.
class E{constructor(){this.hidden=true;this.textContent='';this.innerHTML='';this.value='';this.one={};this.children=[];this.events={};}querySelector(s){return this.one[s];}addEventListener(t,f){(this.events[t]||=[]).push(f);}emit(t){for(const f of this.events[t]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}}
const make=keys=>{const e=new E();for(const k of keys)e.one[`[${k}]`]=new E();return e;};
const ridge=make(['data-degree','data-lambda','data-ridge-plot','data-degree-output','data-lambda-output','data-train-mse','data-val-mse','data-weight-norm','data-ridge-result','data-ridge-reset','data-ridge-controls','data-ridge-static']);
ridge.one['[data-degree]'].value='9';ridge.one['[data-lambda]'].value='3';api.mountRidge({querySelectorAll:()=>[ridge]});
assert.equal(ridge.one['[data-ridge-controls]'].hidden,false);assert.equal(ridge.one['[data-ridge-static]'].hidden,true);
const before=ridge.one['[data-val-mse]'].textContent;ridge.one['[data-lambda]'].value='0';ridge.one['[data-lambda]'].emit('input');assert.notEqual(ridge.one['[data-val-mse]'].textContent,before);
ridge.one['[data-degree]'].value='1';ridge.one['[data-degree]'].emit('input');assert.ok(ridge.one['[data-ridge-plot]'].innerHTML.includes('1 次'));
ridge.one['[data-ridge-reset]'].emit('click');assert.equal(ridge.one['[data-val-mse]'].textContent,before);
const opt=make(['data-opt-lr','data-curvature','data-schedule','data-gradient-noise','data-opt-step','data-optimizer-plot','data-lr-output','data-curvature-output','data-step-output','data-optimizer-rows','data-optimizer-result','data-opt-advance','data-opt-reset','data-optimizer-controls','data-optimizer-static']);
for(const [key,value]of [['data-opt-lr','.05'],['data-curvature','20'],['data-schedule','constant'],['data-gradient-noise','0'],['data-opt-step','30']])opt.one[`[${key}]`].value=value;
api.mountOptimization({querySelectorAll:()=>[opt],createElement:()=>new E()});assert.equal(opt.one['[data-optimizer-rows]'].children.length,4);
opt.one['[data-opt-advance]'].emit('click');assert.equal(opt.one['[data-opt-step]'].value,'40');
opt.one['[data-opt-lr]'].value='.2';opt.one['[data-opt-lr]'].emit('input');assert.ok(opt.one['[data-optimizer-result]'].textContent.includes('数值发散'));
opt.one['[data-schedule]'].value='cosine';opt.one['[data-schedule]'].emit('change');assert.equal(opt.one['[data-optimizer-rows]'].children.length,4);
opt.one['[data-opt-reset]'].emit('click');assert.equal(opt.one['[data-opt-step]'].value,'30');assert.equal(opt.one['[data-gradient-noise]'].value,'0');
console.log('Passed ridge solution, intercept exemption, validation isolation, optimizer steps/bias correction, schedule boundaries, seeded noise, divergence guard, static figures and real UI event handlers.');
