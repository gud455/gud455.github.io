const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture10.js');
const close=(x,y,e=1e-10)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const allclose=(x,y)=>x.forEach((n,i)=>Array.isArray(n)?allclose(n,y[i]):close(n,y[i]));
for(const stride of [1,2,3]){
 const forward=a.clip({stride,order:'forward'}),reverse=a.clip({stride,order:'reverse'});
 assert.deepEqual(reverse.ids,[...forward.ids].reverse());assert.deepEqual(reverse.average,forward.average);close(reverse.responseMean,-forward.responseMean);close(forward.responseMean,stride);
 for(const order of ['forward','reverse','interleave']){const r=a.clip({stride,order});assert.deepEqual([...r.ids].sort((x,y)=>x-y),r.selected);assert.equal(new Set(r.ids).size,r.ids.length);assert.equal(r.poolDifference,0);close(r.average.flat().reduce((s,n)=>s+n,0),1);assert.equal(r.responses.length,r.ids.length-2);close(r.span,(r.selected.at(-1)-r.selected[0])/8);}
}
assert.notDeepEqual(a.clip({stride:1}).average,a.clip({stride:2}).average);
assert.deepEqual(a.temporalFilter([1,4,2,7]),[.5,1.5]);assert.deepEqual(a.temporalFilter([3,3,3,3]),[0,0]);
// Known 2D result plus an independent explicit 3D cross-correlation calculation.
assert.deepEqual(a.conv2D([[1,2,3],[4,5,6],[7,8,9]],[[1,0],[0,-1]]),[[-4,-4],[-4,-4]]);
const input=Array.from({length:3},(_,t)=>Array.from({length:3},(_,y)=>Array.from({length:3},(_,x)=>100*t+10*y+x)));
const weights=[[[1,2],[3,4]],[[-1,0],[1,2]]];const result=a.conv3D(input,weights);
for(let t=0;t<2;t++)for(let y=0;y<2;y++)for(let x=0;x<2;x++){
 const expected=input[t][y][x]+2*input[t][y][x+1]+3*input[t][y+1][x]+4*input[t][y+1][x+1]-input[t+1][y][x]+input[t+1][y+1][x]+2*input[t+1][y+1][x+1];close(result[t][y][x],expected);
}
const k2=[[0,-1,0],[-1,4,-1],[0,-1,0]],reference=a.conv2D(a.video()[0],k2);assert.equal(reference[1][1],8);
for(const kt of [1,3,5])for(let time=0;time<=5-kt;time++)for(const pattern of ['constant','moving','brightness'])for(const normalized of [true,false]){
 const r=a.inflation({kt,time,pattern,normalized});assert.deepEqual(r.shape,[6-kt,3,3]);assert.equal(r.output.length,6-kt);assert.equal(r.weights,9*kt);close(r.value,r.contributions.reduce((s,n)=>s+n,0));
 if(pattern==='constant'){for(const outputFrame of r.output)allclose(outputFrame,reference.map(row=>row.map(n=>n*(normalized?1:kt))));close(r.value,normalized?8:8*kt);}
 if(kt===1)close(r.value,r.reference);
}
const moving=a.inflation({pattern:'moving'});close(moving.value,4);close(moving.reference,8);assert.equal(a.inflation({kt:5,time:4}).time,0);
for(const[file,svg]of [['video-sequence-static.svg',a.clipSVG()],['video-inflation-static.svg',a.inflationSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
// Mount actual handlers. Only the temporal range emulates the native max/value clamp.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};this.attributes={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
const make=(prefix,keys)=>{const e=new E();for(const key of keys)e.one[`[data-${prefix}-${key}]`]=new E();return e;};
const clip=make('clip',['stride','order','plot','count','pool-difference','response','result','rows','reset','static','controls']),c=k=>clip.one[`[data-clip-${k}]`];c('stride').value='1';c('order').value='reverse';
a.mountClip({querySelectorAll:()=>[clip],createElement:()=>new E()});assert.equal(c('controls').hidden,false);assert.equal(c('static').hidden,true);assert.equal(c('rows').children.length,8);assert.equal(c('response').textContent,'-1.000');
c('order').value='forward';c('order').emit('change');assert.equal(c('response').textContent,'1.000');assert.equal(c('pool-difference').textContent,'0');
c('stride').value='3';c('stride').emit('change');assert.equal(c('rows').children.length,3);assert.equal(c('response').textContent,'3.000');c('reset').emit('click');assert.equal(c('count').textContent,'8');assert.equal(c('response').textContent,'-1.000');
const inflation=make('inflate',['pattern','kt','scale','time','time-output','plot','reference','output','difference','rows','result','reset','static','controls']),g=k=>inflation.one[`[data-inflate-${k}]`];
let rangeValue='1';g('time').attributes.max='2';Object.defineProperty(g('time'),'value',{get(){return rangeValue;},set(v){rangeValue=String(Math.min(Number(this.attributes.max),Math.max(0,Number(v))));}});g('time').setAttribute=function(k,v){this.attributes[k]=v;if(k==='max')this.value=rangeValue;};
for(const[k,v]of [['pattern','constant'],['kt','3'],['scale','normalized'],['time','1']])g(k).value=v;
a.mountInflation({querySelectorAll:()=>[inflation],createElement:()=>new E()});assert.equal(g('controls').hidden,false);assert.equal(g('static').hidden,true);assert.equal(g('output').textContent,'8.00000');assert.equal(g('difference').textContent,'0');
g('scale').value='raw';g('scale').emit('change');assert.equal(g('output').textContent,'24.00000');g('pattern').value='moving';g('pattern').emit('change');assert.equal(g('output').textContent,'12.00000');
g('kt').value='5';g('kt').emit('change');assert.equal(g('time').value,'0');assert.equal(g('time').attributes.max,'0');assert.equal(g('rows').children.length,5);
g('reset').emit('click');assert.equal(g('time').value,'1');assert.equal(g('time-output').textContent,'1');assert.equal(g('time').attributes.max,'2');assert.equal(g('output').textContent,'8.00000');assert.equal(g('scale').value,'normalized');
console.log('Passed frame-set preservation, mean-pooling permutation invariance, reversal/local filtering, sampling coverage, independent 2D/3D correlation, full-map constant-video inflation equivalence, copy scaling, moving-video response, static figures and real UI events including native range clamping.');
