const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture8.js');
const close=(x,y,e=1e-10)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const allclose=(x,y,e=1e-10)=>x.forEach((n,i)=>Array.isArray(n)?allclose(n,y[i],e):close(n,y[i],e));
// Known distributions, translation invariance, stable large logits and exact masked zeros.
allclose(a.softmax([0,0,0]),[1/3,1/3,1/3]);allclose(a.softmax([1000,1001,-Infinity]),a.softmax([0,1,-Infinity]));
assert.equal(a.softmax([-Infinity,2])[0],0);assert.throws(()=>a.softmax([-Infinity,-Infinity]),RangeError);
const q=a.qkv(),den=Math.exp(1/Math.sqrt(2))+Math.exp(.5/Math.sqrt(2))+Math.exp(-1/Math.sqrt(2));
allclose(q.weights,[1,.5,-1].map(n=>Math.exp(n/Math.sqrt(2))/den));allclose(q.output,[q.weights[0]-q.weights[2],q.weights[1]-q.weights[2]]);
for(const x of [-3,0,3])for(const y of [-3,0,3])for(const value of [0,1,2])for(const scaled of [true,false]){
 const r=a.qkv({x,y,value,scaled});close(r.weights.reduce((s,n)=>s+n,0),1);assert.ok(r.weights.every(w=>w>=0&&w<=1));
 for(let d=0;d<2;d++){assert.ok(r.output[d]>=Math.min(...r.V.map(v=>v[d]))-1e-12);assert.ok(r.output[d]<=Math.max(...r.V.map(v=>v[d]))+1e-12);}
}
const changed=a.qkv({value:2});assert.deepEqual(changed.weights,q.weights);close(changed.output[0],q.output[0]);close(changed.output[1]-q.output[1],q.weights[1]);
assert.ok(Math.max(...a.qkv({scaled:false}).weights)>Math.max(...q.weights));
// Independent row-vector projection and explicit first self-attention logit.
allclose(a.project([2,3],[[1,4],[2,5]]),[8,23]);close(a.selfAttention().logits[0][0],.68/Math.sqrt(2));
for(const order of ['original','swap','reverse','rotate']){
 const r=a.sequence({order});assert.ok(r.error<1e-12);allclose(r.current.output,r.reference);
 for(const position of [false,true])for(const causal of [false,true]){
  const v=a.sequence({order,position,causal});v.current.weights.forEach((row,i)=>{close(row.reduce((s,n)=>s+n,0),1);if(causal)row.forEach((n,j)=>{if(j>i)assert.equal(n,0);});});
  if(causal)assert.equal(v.futureMass,0);
  if(order==='original')assert.ok(v.error<1e-12);
  else if(position||causal)assert.ok(v.error>.01);
 }
}
// Causality means changing future keys and values cannot change earlier outputs.
const Q=[[1,0],[0,1],[1,1]],K=[[1,0],[0,1],[1,1]],V=[[2,1],[3,-1],[1,2]],K2=[K[0],K[1],[100,-30]],V2=[V[0],V[1],[-99,200]];
const c1=a.attention(Q,K,V,{causal:true}),c2=a.attention(Q,K2,V2,{causal:true});allclose(c1.output.slice(0,2),c2.output.slice(0,2));
assert.ok(Math.abs(a.attention(Q,K,V).output[0][0]-a.attention(Q,K2,V2).output[0][0])>1);
for(const[file,svg]of [['attention-qkv-static.svg',a.qkvSVG()],['attention-order-static.svg',a.sequenceSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
assert.ok(a.sequenceSVG({causal:true}).includes('url(#attention-mask-hatch)'));
// Exercise the actual mount/update/reset listeners in a minimal DOM harness.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}}
const make=(prefix,keys)=>{const e=new E();for(const key of keys)e.one[`[data-${prefix}-${key}]`]=new E();return e;};
const qlab=make('qkv',['x','y','value','scale','x-output','y-output','value-output','plot','sum','max','output','rows','result','reset','static','controls']);
const get=k=>qlab.one[`[data-qkv-${k}]`];for(const[k,v]of [['x','1'],['y','0.5'],['value','1'],['scale','scaled']])get(k).value=v;
a.mountQKV({querySelectorAll:()=>[qlab],createElement:()=>new E()});assert.equal(get('controls').hidden,false);assert.equal(get('static').hidden,true);assert.equal(get('rows').children.length,3);
const weights=get('rows').children.map(row=>row.children[3].textContent),output=get('output').textContent;
get('value').value='2';get('value').emit('input');assert.deepEqual(get('rows').children.map(row=>row.children[3].textContent),weights);assert.notEqual(get('output').textContent,output);
get('scale').value='raw';get('scale').emit('change');assert.notDeepEqual(get('rows').children.map(row=>row.children[3].textContent),weights);
get('reset').emit('click');assert.equal(get('output').textContent,output);get('x').value='0';get('y').value='0';get('x').emit('input');assert.ok(get('rows').children.every(row=>row.children[3].textContent==='0.333'));
const slab=make('order',['permutation','position','mask','plot','label','error','future','rows','result','reset','static','controls']),sget=k=>slab.one[`[data-order-${k}]`];
for(const[k,v]of [['permutation','swap'],['position','off'],['mask','full']])sget(k).value=v;
a.mountOrder({querySelectorAll:()=>[slab],createElement:()=>new E()});assert.equal(sget('controls').hidden,false);assert.equal(sget('error').textContent,'0');assert.equal(sget('label').textContent,'C B A D');assert.equal(sget('rows').children.length,4);
sget('position').value='on';sget('position').emit('change');assert.ok(Number(sget('error').textContent)>.01);
sget('position').value='off';sget('mask').value='causal';sget('mask').emit('change');assert.equal(sget('future').textContent,'0');assert.ok(Number(sget('error').textContent)>.01);
sget('permutation').value='original';sget('permutation').emit('change');assert.equal(sget('error').textContent,'0');
sget('reset').emit('click');assert.equal(sget('error').textContent,'0');assert.equal(sget('mask').value,'full');assert.equal(sget('label').textContent,'C B A D');
console.log('Passed stable softmax, independent Q/K/V calculations, weight/value separation, convex bounds, permutation equivariance, positional and causal counterexamples, future isolation, static diagrams and real UI events.');
