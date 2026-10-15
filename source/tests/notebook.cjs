const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const api = require('../assets/academic/notebook.js');
const charts = require('../_data/experiments.json');
const close = (a,b,eps=1e-12) => assert.ok(Math.abs(a-b)<eps, a+' != '+b);
// Check the forward distribution against independently calculated schedule endpoints.
close(api.coefficients(0).alphaBar,1);
close(api.coefficients(1).alphaBar,0.9999);
close(api.coefficients(2).alphaBar,0.9999*(1-(0.0001+0.0199/999)));
close(api.coefficients(1000).alphaBar,0.000040358297653756764);
assert.equal(api.coefficients(-50).t,0); assert.equal(api.coefficients(1200).t,1000);
for (const t of [0,1,300,500,1000]) {
 const c=api.coefficients(t); close(c.signal*c.signal+c.noise*c.noise,1);
}
const frame0=api.makeFrame(0), frame=api.makeFrame(500), frameOther=api.makeFrame(500,592);
assert.deepEqual(frame0.source,frame0.mixed);
assert.deepEqual(frame.noise,frame0.noise);
assert.deepEqual(frame.mixed,api.makeFrame(500).mixed);
assert.notDeepEqual(frame.noise,frameOther.noise);
const n=frame.noise.length, mean=frame.noise.reduce((a,b)=>a+b)/n;
const variance=frame.noise.reduce((a,b)=>a+(b-mean)**2,0)/n;
assert.ok(Math.abs(mean)<0.07); assert.ok(Math.abs(variance-1)<0.09);
for(const i of [0,25,233,1802]) close(frame.mixed[i],frame.coefficients.signal*frame.source[i]+frame.coefficients.noise*frame.noise[i]);
assert.equal(api.gray(-30),0); assert.equal(api.gray(30),255);
assert.equal(fs.readFileSync(path.join(__dirname,'../assets/academic/diffusion-plate.svg'),'utf8'),api.plateSVG());
assert.deepEqual(charts.fusion.variants.find(v=>v.key==='synthetic-20000').values,[0.024796,0.024835,0.025080]);
assert.deepEqual(charts.adapter.variants.find(v=>v.key==='synthetic').values,[0.024796,0.024694,0.018535,0.025759,0.024425]);
assert.deepEqual(charts.adapter.labels.map(x=>x.kind==='diagnostic'),[false,false,true,false,true]);
assert.equal(api.selection(charts.fusion,'missing').variant.key,'synthetic-20000');
const csv=fs.readFileSync(path.join(__dirname,'../assets/academic/sdadp-v02-chart-data.csv'),'utf8').trim().replace(/^\uFEFF/,'').split('\n').slice(1).map(x=>x.split(','));
let csvIndex=0;
for(const [name,chart] of Object.entries(charts)) for(const variant of chart.variants) variant.values.forEach((value,i)=>{
 assert.ok(value>=0 && value<=chart.max); const line=csv[csvIndex++];
 assert.deepEqual(line.slice(0,3),[name,variant.key,chart.labels[i].name]); assert.equal(line[3],value.toFixed(6));
 assert.equal(line[5],chart.labels[i].kind==='diagnostic'?'yes':'no');
});
assert.equal(csvIndex,csv.length);
// Exercise the real event handlers and verify per-figure isolation.
class E {
 constructor(){this.hidden=true;this.textContent='';this.value='';this.listeners={};this.style={};this.children=[];this.attributes={};}
 addEventListener(name,fn){(this.listeners[name]||=[]).push(fn);}
 emit(name){for(const fn of this.listeners[name]||[])fn();}
 querySelector(key){return this.one?.[key]||null;}
 querySelectorAll(key){return this.many?.[key]||[];}
 setAttribute(k,v){this.attributes[k]=v;}
 append(x){this.children.push(x);}
 before(x){this.beforeElement=x;}
 closest(){return this.parent;}
}
function experiment(data){
 const e=new E(),control=new E(), insight=new E(), context=new E(), controls=new E(),json=new E();json.textContent=JSON.stringify(data);control.value=data.initial;
 const rows=data.labels.map(()=>{const row=new E();row.one={'[data-bar-fill]':new E(),'[data-bar-value]':new E(),'[data-bar-delta]':new E()};return row;});
 e.one={'[data-experiment-data]':json,'[data-experiment-variant]':control,'[data-plot-insight]':insight,'[data-plot-context]':context,'.experiment-controls':controls};e.many={'[data-bar-row]':rows};
 return {e,control,insight,context,controls,rows};
}
const a=experiment(charts.fusion),b=experiment(charts.prior);
api.mountExperiments({querySelectorAll:()=>[a.e,b.e]});
assert.equal(a.controls.hidden,false);assert.equal(a.rows[0].querySelector('[data-bar-value]').textContent,'0.024796');
assert.equal(a.rows[1].querySelector('[data-bar-delta]').textContent,'+0.16%');
assert.equal(a.rows[0].querySelector('[data-bar-delta]').textContent,'参照');
a.control.value='original-5000';a.control.emit('change');
assert.equal(a.rows[1].querySelector('[data-bar-value]').textContent,'0.026101');
assert.equal(b.rows[0].querySelector('[data-bar-value]').textContent,'0.287035');
assert.ok(a.context.textContent.includes('原始输入')); assert.ok(a.insight.textContent.includes('早期'));
b.control.value='ir';b.control.emit('change');assert.equal(b.rows[0].querySelector('[data-bar-value]').textContent,'0.103720');
const bad=experiment(charts.prior);bad.e.one['[data-experiment-data]'].textContent='invalid json';
api.mountExperiments({querySelectorAll:()=>[bad.e]});assert.equal(bad.controls.hidden,true);
function diffusion(available=true) {
 const figure=new E();const nodes={};
 for(const key of ['[data-diffusion-time]','[data-noise-seed]','[data-time-label]','[data-signal-value]','[data-noise-value]','[data-snr-value]','[data-next-noise]','[data-reset-noise]','[data-diffusion-fallback]','[data-diffusion-canvases]','.diffusion-controls'])nodes[key]=new E();
 nodes['[data-diffusion-time]'].value=500;nodes['[data-diffusion-fallback]'].hidden=false;
 const canvases=Array.from({length:3},()=>{const canvas=new E(),ctx={createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData(data){this.last=data.data;}};canvas.ctx=ctx;canvas.getContext=()=>available?ctx:null;return canvas;});
 figure.one=nodes;figure.many={'canvas':canvases};
 return {figure,nodes,canvases};
}
const d=diffusion();api.mountDiffusion({querySelectorAll:()=>[d.figure]});
assert.equal(d.nodes['.diffusion-controls'].hidden,false);
const initial=Buffer.from(d.canvases[2].ctx.last);
d.nodes['[data-diffusion-time]'].value=0;d.nodes['[data-diffusion-time]'].emit('input');
assert.equal(d.nodes['[data-snr-value]'].textContent,'∞');
assert.equal(d.canvases[2].ctx.last[0],api.gray(frame0.source[0]));
d.nodes['[data-next-noise]'].emit('click');assert.equal(d.nodes['[data-noise-seed]'].textContent,592);
d.nodes['[data-reset-noise]'].emit('click');assert.deepEqual(Buffer.from(d.canvases[2].ctx.last),initial);
const fallback=diffusion(false);api.mountDiffusion({querySelectorAll:()=>[fallback.figure]});
assert.equal(fallback.nodes['[data-diffusion-fallback]'].hidden,false);assert.equal(fallback.nodes['.diffusion-controls'].hidden,true);
const article=new E(),toc=new E(),links=new E(),progress=new E(),label=new E(),meter=new E(),table=new E(),head1=new E(),head2=new E();
progress.parent=meter;head1.tagName='H2';head1.textContent='结果';head1.id='results';head2.tagName='H3';head2.textContent='分组';
let top=110;article.getBoundingClientRect=()=>({height:1500,top});
article.one={'[data-note-toc]':toc,'[data-toc-links]':links,'[data-reading-progress]':progress,'[data-reading-label]':label};
article.many={'.prose > table':[table],'.prose > h2, .prose > h3':[head1,head2]};
const doc={querySelector:()=>article,createElement:()=>new E()};
const win={innerHeight:600,listeners:{},requestAnimationFrame:fn=>fn(),addEventListener(name,fn){this.listeners[name]=fn;}};
api.mountReading(doc,win);
assert.equal(links.children.length,2);assert.equal(links.children[0].href,'#results');assert.equal(toc.hidden,false);
assert.equal(links.children[1].className,'toc-sub');assert.equal(table.beforeElement.children[0],table);
assert.equal(progress.value,0);top=-900;win.listeners.scroll();assert.equal(progress.value,100);assert.equal(label.textContent,'100%');
console.log('Passed measured chart switching, CSV provenance, reference diagnostics, DDPM math, canvas controls, fallback, TOC and progress.');

