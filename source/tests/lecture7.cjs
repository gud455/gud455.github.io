const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture7.js');
const close=(x,y,e=1e-8)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const inputs=[1,0,1,1,0,1,0,0],options={a:.7,b:.4,c:-.05};
const full=a.rnn(inputs,options),short=a.rnn(inputs,{...options,horizon:3});assert.deepEqual(full.h,short.h);assert.deepEqual(full.full,full.truncated);assert.deepEqual(full.parameters,full.truncatedParameters);assert.deepEqual(short.truncated.slice(0,5),[0,0,0,0,0]);assert.deepEqual(short.truncated.slice(5),full.full.slice(5));
for(let i=0;i<inputs.length;i++){const plus=[...inputs],minus=[...inputs];plus[i]+=1e-5;minus[i]-=1e-5;close((a.rnn(plus,options).h.at(-1)-a.rnn(minus,options).h.at(-1))/(2e-5),full.full[i]);}
for(const key of ['a','b','c']){const plus={...options,[key]:options[key]+1e-5},minus={...options,[key]:options[key]-1e-5};close((a.rnn(inputs,plus).h.at(-1)-a.rnn(inputs,minus).h.at(-1))/(2e-5),full.parameters[key]);}
// Truncated shared-parameter derivatives must freeze the prefix boundary, not recompute it.
function suffix(values){let h=short.h[5];for(const x of inputs.slice(5))h=Math.tanh(values.a*h+values.b*x+values.c);return h;}
for(const key of ['a','b','c'])close((suffix({...options,[key]:options[key]+1e-5})-suffix({...options,[key]:options[key]-1e-5}))/(2e-5),short.truncatedParameters[key]);
const zero=a.rnn(a.presets.zeros,{a:1.5,b:.6,c:0});assert.deepEqual(zero.h,Array(9).fill(0));close(zero.full[0],.6*1.5**7);close(zero.initialGradient,1.5**8);
let mem=a.memory({f:1,i:0,c0:1});assert.deepEqual(mem.cells,Array(13).fill(1));assert.equal(mem.directGradient,1);
const closed=a.memory({o:0});assert.deepEqual(closed.cells,a.memory().cells);assert.ok(closed.hidden.slice(1).every(v=>v===0));assert.equal(closed.hidden[0],null);
for(const f of [0,.1,.5,.95,1]){const config={f,i:.4,g:-.3,c0:1.2,steps:8};const r=a.memory(config),expected=f===1?1.2+8*.4*(-.3):f**8*1.2+.4*(-.3)*(1-f**8)/(1-f);close(r.lastCell,expected);close((a.memory({...config,c0:1.2+1e-5}).lastCell-a.memory({...config,c0:1.2-1e-5}).lastCell)/(2e-5),r.directGradient);assert.ok(r.hidden.slice(1).every(h=>Math.abs(h)<=r.o));}
for(const[file,svg]of [['rnn-sequence-static.svg',a.rnnSVG()],['lstm-memory-static.svg',a.memorySVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
// Run actual UI handlers without pretending to render a browser layout.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};this.attributes={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
const make=keys=>{const e=new E();for(const key of keys)e.one[`[${key}]`]=new E();return e;};
const rnn=make(['data-rnn-a','data-rnn-b','data-rnn-c','data-rnn-time','data-rnn-horizon','data-rnn-preset','data-rnn-bits','data-rnn-sequence-plot','data-rnn-a-output','data-rnn-b-output','data-rnn-c-output','data-rnn-time-output','data-rnn-horizon-output','data-rnn-previous','data-rnn-input','data-rnn-current','data-rnn-formula','data-rnn-rows','data-rnn-shared-gradient','data-rnn-reset','data-rnn-controls','data-rnn-sequence-static']);
for(const[k,v]of [['a','.8'],['b','.6'],['c','0'],['time','4'],['horizon','8'],['preset','pulse']])rnn.one[`[data-rnn-${k}]`].value=v;
a.mountRNN({querySelectorAll:()=>[rnn],createElement:()=>new E()});assert.equal(rnn.one['[data-rnn-bits]'].children.length,8);const h=rnn.one['[data-rnn-current]'].textContent;
rnn.one['[data-rnn-horizon]'].value='3';rnn.one['[data-rnn-horizon]'].emit('input');assert.equal(rnn.one['[data-rnn-current]'].textContent,h);assert.equal(rnn.one['[data-rnn-rows]'].children[0].children[4].textContent,'0');
const button=rnn.one['[data-rnn-bits]'].children[1];button.emit('click');assert.equal(rnn.one['[data-rnn-preset]'].value,'custom');assert.equal(rnn.one['[data-rnn-bits]'].children[1],button);assert.equal(button.attributes['aria-pressed'],'true');
rnn.one['[data-rnn-reset]'].emit('click');assert.equal(rnn.one['[data-rnn-current]'].textContent,h);assert.equal(rnn.one['[data-rnn-horizon]'].value,'8');
const lstm=make(['data-lstm-f','data-lstm-i','data-lstm-o','data-lstm-g','data-lstm-c0','data-lstm-steps','data-lstm-memory-plot','data-lstm-f-output','data-lstm-i-output','data-lstm-o-output','data-lstm-g-output','data-lstm-c0-output','data-lstm-steps-output','data-lstm-cell','data-lstm-hidden','data-lstm-path-gradient','data-lstm-result','data-lstm-preserve','data-lstm-forget','data-lstm-write','data-lstm-reset','data-lstm-controls','data-lstm-memory-static']);
for(const[k,v]of [['f','.95'],['i','.1'],['o','.8'],['g','.2'],['c0','1'],['steps','12']])lstm.one[`[data-lstm-${k}]`].value=v;
a.mountMemory({querySelectorAll:()=>[lstm]});const initial=lstm.one['[data-lstm-cell]'].textContent;
lstm.one['[data-lstm-o]'].value='0';lstm.one['[data-lstm-o]'].emit('input');assert.equal(lstm.one['[data-lstm-cell]'].textContent,initial);assert.equal(lstm.one['[data-lstm-hidden]'].textContent,'0');
lstm.one['[data-lstm-preserve]'].emit('click');assert.equal(lstm.one['[data-lstm-cell]'].textContent,'1.00000');assert.equal(lstm.one['[data-lstm-path-gradient]'].textContent,'1.00000');
lstm.one['[data-lstm-forget]'].emit('click');assert.ok(Number(lstm.one['[data-lstm-cell]'].textContent)<.001);
lstm.one['[data-lstm-reset]'].emit('click');assert.equal(lstm.one['[data-lstm-cell]'].textContent,initial);
console.log('Passed RNN input/shared-parameter finite differences, frozen-boundary truncated BPTT, invariant forward states, gradient growth, fixed-gate memory derivatives, output-gate separation, static plots and real UI handlers.');
