const assert=require('node:assert/strict');
const api=require('../assets/courses/courses.js');
const close=(a,b,e=1e-12)=>assert.ok(Math.abs(a-b)<e,`${a} != ${b}`);
assert.deepEqual(api.makePoints(),api.makePoints());assert.equal(api.makePoints().length,42);
const pair=[{x:0,y:0,id:1,label:0},{x:.6,y:.6,id:2,label:1}];
assert.equal(api.knn(pair,{x:1,y:0},1,'l1').winner,0);
assert.equal(api.knn(pair,{x:1,y:0},1,'l2').winner,1);
assert.equal(api.knn(pair,{x:1,y:0},2,'l2').winner,1); // tied votes choose nearest tied class
assert.equal(api.knn([...pair].reverse(),{x:1,y:0},1,'l1').winner,0); // tie determined by ID
assert.equal(api.knn(pair,{x:1,y:0},30,'l2').neighbors.length,2);
let r=api.linear([1,1,0,0],api.initialWeights(),[0,0,0],0);
assert.deepEqual(r.scores,[2,0,0]);close(r.probs[0],Math.exp(2)/(Math.exp(2)+2));close(r.ce,Math.log(1+2*Math.exp(-2)));assert.equal(r.svm,0);
r=api.linear([1,1,0,0],api.initialWeights(),[0,0,0],1);assert.equal(r.svm,4);close(r.ce,2+Math.log(1+2*Math.exp(-2)));
r=api.linear([0],[[0],[0],[0]],[0,0,0],2);close(r.ce,Math.log(3));assert.equal(r.svm,2);assert.ok(r.tied);
r=api.linear([1],[[1000],[999],[-1000]],[0,0,0],2);assert.ok(Number.isFinite(r.ce));close(r.ce,2000+Math.log(1+Math.exp(-1)));
for(const key of Object.keys(api.presets)) {r=api.linear(api.presets[key],api.initialWeights(),[0,0,0],0);close(r.probs.reduce((a,b)=>a+b),1);assert.equal(r.prediction,Object.keys(api.presets).indexOf(key));}
// Execute actual UI listeners with a small DOM harness; no browser rendering is simulated.
class E{
 constructor(){this.hidden=true;this.value='0';this.textContent='';this.style={};this.dataset={};this.children=[];this.events={};this.one={};this.many={};}
 querySelector(s){return this.one[s]||null;} querySelectorAll(s){return this.many[s]||[];}
 addEventListener(s,f){(this.events[s]||=[]).push(f);} emit(s,event={}){for(const f of this.events[s]||[])f(event);}
 append(e){this.children.push(e);} replaceChildren(){this.children=[];}
}
const el=()=>new E(), lab=el();
for(const key of ['data-template','data-target','data-bias','data-bias-output','data-ce','data-svm','data-linear-result','data-linear-formula','data-linear-zero','data-linear-reset','data-linear-controls','data-score-display','data-linear-static'])lab.one[`[${key}]`]=el();
for(const [key,n] of [['data-pixel',4],['data-pixel-output',4],['data-weight',4],['data-weight-output',4],['data-score',3],['data-prob',3],['data-prob-bar',3]])lab.many[`[${key}]`]=Array.from({length:n},el);
lab.many['[data-pixel-preview] span']=Array.from({length:4},el);
lab.many['[data-preset]']=Object.keys(api.presets).map(key=>{const e=el();e.dataset.preset=key;return e;});
api.mountLinear({querySelectorAll:()=>[lab]});
assert.equal(lab.one['[data-ce]'].textContent,'0.240');assert.equal(lab.one['[data-linear-controls]'].hidden,false);
lab.many['[data-preset]'][1].emit('click');assert.ok(lab.one['[data-linear-result]'].textContent.startsWith('预测 B 类'));assert.ok(lab.one['[data-linear-result]'].textContent.endsWith('目标 A 类'));
lab.one['[data-target]'].value='1';lab.one['[data-target]'].emit('change');assert.equal(lab.one['[data-ce]'].textContent,'0.240');
lab.one['[data-linear-zero]'].emit('click');assert.equal(lab.one['[data-ce]'].textContent,'1.099');assert.equal(lab.one['[data-svm]'].textContent,'2.000');
lab.one['[data-template]'].value='2';lab.one['[data-template]'].emit('change');lab.many['[data-weight]'][0].value='2';lab.many['[data-weight]'][0].emit('input');
lab.one['[data-template]'].value='0';lab.one['[data-template]'].emit('change');assert.equal(Number(lab.many['[data-weight]'][0].value),0); // edits isolated per template
lab.one['[data-linear-reset]'].emit('click');assert.equal(lab.one['[data-ce]'].textContent,'0.240');assert.equal(lab.many['[data-pixel]'][0].value,1);
const knn=el();for(const key of ['data-knn-canvas','data-k','data-metric','data-query-x','data-query-y','data-x-output','data-y-output','data-k-output','data-knn-result','data-neighbor-list','data-knn-reset','data-knn-fallback','data-knn-controls','data-knn-coordinates'])knn.one[`[${key}]`]=el();
const canvas=knn.one['[data-knn-canvas]'];canvas.width=480;canvas.height=320;canvas.getBoundingClientRect=()=>({left:0,top:0,width:240,height:160});
canvas.getContext=()=>new Proxy({},{get:(_,name)=>()=>{},set:()=>true});
knn.one['[data-k]'].value='3';knn.one['[data-metric]'].value='l2';
api.mountKnn({querySelectorAll:()=>[knn],createElement:el});
assert.equal(knn.one['[data-neighbor-list]'].children.length,3);
knn.one['[data-k]'].value='7';knn.one['[data-k]'].emit('input');assert.equal(knn.one['[data-neighbor-list]'].children.length,7);
knn.one['[data-metric]'].value='l1';knn.one['[data-metric]'].emit('change');assert.ok(knn.one['[data-knn-result]'].textContent.includes('L1'));
canvas.emit('pointerdown',{clientX:240,clientY:0});assert.equal(knn.one['[data-query-x]'].value,'1.00');assert.equal(knn.one['[data-query-y]'].value,'1.00');
canvas.emit('keydown',{key:'ArrowLeft',preventDefault(){}});assert.equal(knn.one['[data-query-x]'].value,'0.99');
knn.one['[data-knn-reset]'].emit('click');assert.equal(knn.one['[data-query-x]'].value,'0.50');assert.equal(knn.one['[data-k]'].value,'3');
assert.equal(canvas.hidden,false);assert.equal(knn.one['[data-knn-fallback]'].hidden,true);
console.log('Passed distance/vote rules, stable Softmax and loss calculations, input/template isolation, reset, kNN pointer/keyboard controls and static enhancement.');
