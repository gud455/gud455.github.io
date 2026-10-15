const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture5.js');
const close=(x,y,e=1e-10)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const sample=[[1,2,3],[4,5,6],[7,8,9]];
close(a.correlate(sample,a.kernels.sobel,1,0).output[0][0],8); // cross-correlation, not reversed kernel
close(a.correlate(sample,a.kernels.blur,1,0).output[0][0],5);
close(a.correlate(sample,a.kernels.sharpen,1,0).output[0][0],5);
close(a.correlate(sample,a.kernels.identity,1,0,2).output[0][0],7);
assert.deepEqual(a.correlate(a.pattern(),a.kernels.identity).output,a.pattern());
assert.equal(a.correlate(a.pattern(),a.kernels.sobel,2,0).oh,2);assert.equal(a.correlate(a.pattern(),a.kernels.sobel,2,1).oh,3);
assert.equal(a.windowAt(a.correlate()).value,16);
for(const kind of ['edge','horizontal','checker'])for(const kernel of Object.values(a.kernels))for(const stride of [1,2])for(const padding of [0,1]){
 const conv=a.correlate(a.pattern(kind),kernel,stride,padding,.5);
 for(let i=0;i<conv.oh*conv.ow;i++){const win=a.windowAt(conv,i);close(win.sum+.5,win.value);}
}
let result=a.shape();assert.equal(result.output,32);assert.equal(result.rf,7);assert.equal(result.jump,1);assert.equal(result.parameters,5088);assert.equal(result.macs,5160960);
let pool=a.shape({pooling:true});assert.equal(pool.output,16);assert.equal(pool.rf,8);assert.equal(pool.jump,2);assert.equal(pool.parameters,result.parameters);assert.equal(pool.macs,result.macs);assert.equal(pool.layers.at(-1).parameters,0);
const slide=a.shape({cout:10,kernel:5,padding:2,depth:1});assert.equal(slide.parameters,760);assert.equal(slide.macs,768000);
assert.equal(a.shape({size:64}).parameters,result.parameters);assert.equal(a.shape({size:64}).macs,4*result.macs);
result=a.shape({stride:2,depth:2});assert.equal(result.output,8);assert.equal(result.rf,7);assert.equal(result.jump,4);assert.deepEqual(a.footprint(result).indices,[9,10,11,12,13,14,15]);
result=a.shape({kernel:1,stride:2,padding:0,depth:2,pooling:true});assert.equal(result.rf,5);assert.deepEqual(a.footprint(result).indices,[8,12]);
const invalid=a.shape({size:8,kernel:7,stride:2,padding:0,depth:3});assert.equal(invalid.valid,false);assert.equal(invalid.layers.length,2);assert.equal(a.footprint(invalid),null);assert.ok(a.receptiveSVG(invalid).includes('Invalid'));
// Independently propagate spatial dependency sets in 2D, including padding at each layer.
function brute(model){let grid=Array.from({length:model.size},(_,r)=>Array.from({length:model.size},(_,c)=>new Set([r*model.size+c])));
 for(const layer of model.layers){grid=Array.from({length:layer.output},(_,r)=>Array.from({length:layer.output},(_,c)=>{const ids=new Set();for(let i=0;i<layer.k;i++)for(let j=0;j<layer.k;j++){const old=grid[r*layer.s-layer.p+i]?.[c*layer.s-layer.p+j];if(old)for(const id of old)ids.add(id);}return ids;}));}
 const mid=Math.floor((model.output-1)/2);return [...grid[mid][mid]].sort((x,y)=>x-y);
}
for(const kernel of [1,3])for(const stride of [1,2])for(const padding of [0,1])for(const depth of [1,2,3])for(const pooling of [false,true]){
 const model=a.shape({size:8,kernel,stride,padding,depth,pooling});if(!model.valid)continue;
 const indices=a.footprint(model).indices,expected=indices.flatMap(r=>indices.map(c=>r*8+c));assert.deepEqual(expected,brute(model));
}
for(const[file,svg]of [['convolution-static.svg',a.convolutionSVG()],['receptive-field-static.svg',a.receptiveSVG()]])assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');
// Execute the actual listeners, including focus preservation on regenerated output buttons.
class E{constructor(){this.hidden=true;this.checked=false;this.textContent='';this.innerHTML='';this.value='';this.one={};this.children=[];this.events={};this.attributes={};this.style={setProperty(k,v){this[k]=v;}};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k,event={}){for(const f of this.events[k]||[])f(event);}append(x){this.children.push(x);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}focus(){this.focused=true;}}
const make=keys=>{const e=new E();for(const key of keys)e.one[`[${key}]`]=new E();return e;};
const conv=make(['data-conv-pattern','data-conv-kernel','data-conv-stride','data-conv-padding','data-conv-bias','data-conv-position','data-conv-position-output','data-conv-bias-output','data-input-grid','data-output-grid','data-conv-products','data-conv-sum','data-conv-result','data-conv-reset','data-convolution-controls','data-conv-static']);
for(const[k,v]of [['pattern','edge'],['kernel','sobel'],['stride','1'],['padding','1'],['bias','0'],['position','14']])conv.one[`[data-conv-${k}]`].value=v;
a.mountConvolution({querySelectorAll:()=>[conv],createElement:()=>new E()});assert.equal(conv.one['[data-input-grid]'].children.length,64);assert.equal(conv.one['[data-output-grid]'].children.length,36);assert.ok(conv.one['[data-conv-result]'].textContent.includes('16'));
conv.one['[data-output-grid]'].children[14].emit('keydown',{key:'ArrowRight',preventDefault(){}});assert.equal(Number(conv.one['[data-conv-position]'].value),15);assert.equal(conv.one['[data-output-grid]'].children[15].focused,true);
conv.one['[data-output-grid]'].children[1].emit('click');assert.equal(Number(conv.one['[data-conv-position]'].value),1);
conv.one['[data-conv-stride]'].value='2';conv.one['[data-conv-stride]'].emit('change');assert.equal(conv.one['[data-output-grid]'].children.length,9);
conv.one['[data-conv-reset]'].emit('click');assert.equal(Number(conv.one['[data-conv-position]'].value),14);assert.equal(conv.one['[data-conv-static]'].hidden,true);
const rf=make(['data-rf-size','data-rf-cin','data-rf-cout','data-rf-kernel','data-rf-stride','data-rf-padding','data-rf-layers','data-rf-pooling','data-receptive-plot','data-rf-output','data-rf-parameters','data-rf-macs','data-rf-field','data-rf-rows','data-rf-result','data-rf-reset','data-rf-slide','data-receptive-controls','data-receptive-static']);
for(const[k,v]of [['size','32'],['cin','3'],['cout','16'],['kernel','3'],['stride','1'],['padding','1'],['layers','3']])rf.one[`[data-rf-${k}]`].value=v;
a.mountReceptive({querySelectorAll:()=>[rf],createElement:()=>new E()});assert.equal(rf.one['[data-rf-parameters]'].textContent,'5,088');
rf.one['[data-rf-pooling]'].checked=true;rf.one['[data-rf-pooling]'].emit('change');assert.equal(rf.one['[data-rf-output]'].textContent,'1,16,16,16');
rf.one['[data-rf-slide]'].emit('click');assert.equal(rf.one['[data-rf-parameters]'].textContent,'760');assert.equal(rf.one['[data-rf-macs]'].textContent,'768,000');
for(const[k,v]of [['size','8'],['kernel','7'],['stride','2'],['padding','0'],['layers','3']])rf.one[`[data-rf-${k}]`].value=v;
rf.one['[data-rf-size]'].emit('change');assert.equal(rf.one['[data-rf-output]'].textContent,'不可构造');assert.equal(rf.one['[data-rf-macs]'].textContent,'—');
rf.one['[data-rf-reset]'].emit('click');assert.equal(rf.one['[data-rf-output]'].textContent,'1,16,32,32');
console.log('Passed cross-correlation/rounding, window sums, shape/parameter/MAC formulas, pooling, exact receptive coordinates with gaps/padding, invalid configurations and real UI handlers including keyboard focus.');
