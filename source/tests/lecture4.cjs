const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),api=require('../assets/courses/lecture4.js');
const close=(a,b,e=1e-8)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
let n=api.network();close(n.h1,.5);close(n.h2,0);close(n.score,-.25);close(n.affine,-.75);
for(const x of [-2,-1.3,0,.4,2])for(const w of [-1,.3,1,2])for(const c of [-.8,0,.7]){const state=api.network(x,'identity',w,c,-.2);close(state.score,state.affine);}
assert.notEqual(api.network(-1).score+api.network(1).score,2*api.network(0).score);
close(api.network(-1,'identity').score+api.network(1,'identity').score,2*api.network(0,'identity').score);
let g=api.graph();assert.equal(g.q,3);assert.equal(g.f,-12);assert.deepEqual(g.gradients,[-4,-4,3]);
g=api.graph(-2,5,-4,true);assert.equal(g.f,-8);assert.deepEqual(g.gradients,[-8,-4,3]);assert.deepEqual(g.xPaths,[-4,-4]);
g=api.graph(2,5,-4,true);assert.equal(g.gradients[0],0);assert.deepEqual(g.xPaths,[-4,4]);
for(const branch of [false,true])for(const x of [-3,-.2,0,2.1])for(const y of [-5,1])for(const z of [-4,.5]){
const analytic=api.graph(x,y,z,branch).gradients,finite=api.numerical(x,y,z,branch);analytic.forEach((v,i)=>close(v,finite[i]));}
assert.ok(!api.graphSVG(api.graph(),0).includes('df/dx='));assert.ok(!api.graphSVG(api.graph(),2).includes('df/dx='));assert.ok(api.graphSVG(api.graph(),2).includes('df/dq='));assert.ok(api.graphSVG(api.graph(),3).includes('df/dx=-4'));
assert.ok(!api.graphSVG().includes('r=x*x'));assert.ok(api.graphSVG(api.graph(-2,5,-4,true)).includes('r=x*x'));
for(const[file,svg]of [['nonlinearity-static.svg',api.networkSVG()],['backprop-static.svg',api.graphSVG()]])assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');
// Exercise real event handlers; this harness does not simulate browser rendering.
class E{constructor(){this.hidden=true;this.disabled=false;this.checked=false;this.textContent='';this.innerHTML='';this.value='';this.one={};this.children=[];this.events={};}querySelector(s){return this.one[s];}addEventListener(t,f){(this.events[t]||=[]).push(f);}emit(t){for(const f of this.events[t]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}}
const make=keys=>{const e=new E();for(const key of keys)e.one[`[${key}]`]=new E();return e;};
const net=make(['data-probe','data-hidden-weight','data-hidden-bias','data-output-bias','data-activation','data-nonlinearity-plot','data-probe-output','data-hidden-weight-output','data-hidden-bias-output','data-output-bias-output','data-h1','data-h2','data-network-score','data-nonlinearity-result','data-nonlinearity-reset','data-nonlinearity-controls','data-nonlinearity-static']);
for(const[k,v]of [['data-probe','.5'],['data-hidden-weight','1'],['data-hidden-bias','0'],['data-output-bias','-.75'],['data-activation','relu']])net.one[`[${k}]`].value=v;
api.mountNetwork({querySelectorAll:()=>[net]});assert.equal(net.one['[data-network-score]'].textContent,'-0.25');assert.equal(net.one['[data-nonlinearity-controls]'].hidden,false);
net.one['[data-activation]'].value='identity';net.one['[data-activation]'].emit('change');assert.equal(net.one['[data-network-score]'].textContent,'-0.75');assert.ok(net.one['[data-nonlinearity-result]'].textContent.includes('两条曲线重合'));
net.one['[data-hidden-weight]'].value='2';net.one['[data-hidden-weight]'].emit('input');assert.equal(net.one['[data-network-score]'].textContent,'-1.25');net.one['[data-nonlinearity-reset]'].emit('click');assert.equal(net.one['[data-network-score]'].textContent,'-0.25');
const bp=make(['data-bp-x','data-bp-y','data-bp-z','data-extra-branch','data-backprop-plot','data-bp-x-output','data-bp-y-output','data-bp-z-output','data-bp-phase','data-gradient-check','data-gradient-rows','data-bp-contribution','data-bp-next','data-bp-replay','data-bp-reset','data-backprop-controls','data-backprop-static']);
for(const[k,v]of [['data-bp-x','-2'],['data-bp-y','5'],['data-bp-z','-4']])bp.one[`[${k}]`].value=v;
api.mountBackprop({querySelectorAll:()=>[bp],createElement:()=>new E()});assert.equal(bp.one['[data-gradient-rows]'].children.length,3);assert.equal(bp.one['[data-bp-next]'].disabled,true);
bp.one['[data-extra-branch]'].checked=true;bp.one['[data-extra-branch]'].emit('change');assert.equal(bp.one['[data-gradient-rows]'].children[0].children[1].textContent,'-8');
bp.one['[data-bp-replay]'].emit('click');assert.equal(bp.one['[data-gradient-check]'].hidden,true);assert.equal(bp.one['[data-bp-next]'].disabled,false);assert.ok(bp.one['[data-bp-phase]'].textContent.startsWith('0/3'));
for(let i=1;i<=3;i++){bp.one['[data-bp-next]'].emit('click');assert.ok(bp.one['[data-bp-phase]'].textContent.startsWith(i+'/3'));}
assert.equal(bp.one['[data-gradient-check]'].hidden,false);bp.one['[data-bp-x]'].value='2';bp.one['[data-bp-x]'].emit('input');assert.equal(bp.one['[data-gradient-rows]'].children[0].children[1].textContent,'0');
bp.one['[data-bp-reset]'].emit('click');assert.equal(bp.one['[data-extra-branch]'].checked,false);assert.equal(bp.one['[data-gradient-rows]'].children[0].children[1].textContent,'-4');
console.log('Passed affine collapse, nonlinear output, graph chain rule, branch accumulation/cancellation, finite-difference checks, static figures and actual UI event handlers.');
