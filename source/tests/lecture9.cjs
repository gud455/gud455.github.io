const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture9.js');
const close=(x,y,e=1e-9)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
const scene=a.scene();assert.deepEqual(scene.boxes,[{id:1,x0:3,y0:3,x1:9,y1:9},{id:2,x0:8,y0:3,x1:14,y1:9}]);
assert.equal(scene.labels[5][5],1);assert.equal(scene.labels[5][10],2);assert.equal(scene.labels[0][0],0);assert.equal(scene.labels[5][8],2);
function components(grid){const seen=new Set();let count=0;for(let y=0;y<12;y++)for(let x=0;x<20;x++){if(!grid[y][x]||seen.has(y*20+x))continue;count++;const queue=[[x,y]];seen.add(y*20+x);while(queue.length){const[c,r]=queue.pop();for(const[dx,dy]of [[1,0],[-1,0],[0,1],[0,-1]]){const nx=c+dx,ny=r+dy,key=ny*20+nx;if(nx>=0&&nx<20&&ny>=0&&ny<12&&grid[ny][nx]&&!seen.has(key)){seen.add(key);queue.push([nx,ny]);}}}}return count;}
assert.equal(components(a.scene(9).semantic),1);assert.equal(components(a.scene(15).semantic),2);
for(const x of [9,9.5,11,13,15]){
 const r=a.scene(x);assert.equal(r.boxes.length,2);assert.ok(r.masks.every(mask=>mask.flat().some(Boolean)));
 for(let y=0;y<12;y++)for(let col=0;col<20;col++){assert.equal(r.masks[0][y][col]+r.masks[1][y][col],r.semantic[y][col]);assert.ok(!(r.masks[0][y][col]&&r.masks[1][y][col]));}
 for(const box of r.boxes){const mask=r.masks[box.id-1],points=[];mask.forEach((row,y)=>row.forEach((n,x)=>{if(n)points.push([x,y]);}));assert.ok(points.every(([x,y])=>x>=box.x0&&x<box.x1&&y>=box.y0&&y<box.y1));assert.ok(points.some(([x])=>x===box.x0));assert.ok(points.some(([x])=>x===box.x1-1));assert.ok(points.some(([,y])=>y===box.y0));assert.ok(points.some(([,y])=>y===box.y1-1));}
}
const linear=a.activation();assert.deepEqual(linear.pooled,[.75,.75,.5]);close(linear.score,.35);close(linear.weightedMean,.35);assert.deepEqual(linear.derivatives,[1/16,-.8/16,.4/16]);assert.ok(linear.weighted.flat().some(n=>n<0));
for(const gain of [0,.5,1,2])for(const target of ['left','right'])for(const head of ['linear','nonlinear']){
 const r=a.activation({gain,target,head});assert.ok(r.gradCAM.flat().every(n=>n>=0));
 if(head==='linear'){close(r.score,r.weightedMean);r.weighted.forEach((row,y)=>row.forEach((n,x)=>{close(r.gradRaw[y][x],n/16);close(r.gradCAM[y][x],Math.max(0,n/16));}));}
 // Finite differences are taken with respect to the spatial activations, not the gain control.
 for(let k=0;k<3;k++)for(let y=0;y<4;y++)for(let x=0;x<4;x++){
  const plus=structuredClone(r.maps),minus=structuredClone(r.maps);plus[k][y][x]+=1e-5;minus[k][y][x]-=1e-5;
  const derivative=(a.readout(plus,{target,head}).score-a.readout(minus,{target,head}).score)/2e-5;close(derivative,r.derivatives[k]);
 }
}
const nonlinear=a.activation({head:'nonlinear'});assert.equal(nonlinear.camValid,false);assert.ok(Math.abs(nonlinear.score-nonlinear.weightedMean)>.01);assert.ok(nonlinear.derivatives.every((n,k)=>Math.abs(n)<Math.abs(linear.derivatives[k])));
const clone=a.features();clone[0][0][0]=100;assert.equal(a.features()[0][0][0],0);
for(const[file,svg]of [['vision-tasks-static.svg',a.taskSVG()],['activation-map-static.svg',a.activationSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
assert.ok(a.activationSVG({head:'nonlinear'}).includes('COMPARISON ONLY'));assert.ok(a.taskSVG({mode:'classification'}).includes('CLASS: CIRCLE'));
// Exercise the same event handlers the page mounts, without claiming browser layout coverage.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}}
const make=(prefix,keys)=>{const e=new E();for(const key of keys)e.one[`[data-${prefix}-${key}]`]=new E();return e;};
const task=make('task',['mode','x','x-output','plot','unit','shape','identity','result','reset','static','controls']);const t=k=>task.one[`[data-task-${k}]`];t('mode').value='semantic';t('x').value='11';
a.mountTasks({querySelectorAll:()=>[task]});assert.equal(t('controls').hidden,false);assert.equal(t('static').hidden,true);assert.equal(t('unit').textContent,'像素类别');
for(const mode of ['classification','detection','instance']){t('mode').value=mode;t('mode').emit('change');assert.equal(t('shape').textContent,a.taskInfo[mode].shape);assert.ok(t('plot').innerHTML.includes(a.taskInfo[mode].title));}
const before=t('plot').innerHTML;t('x').value='15';t('x').emit('input');assert.notEqual(t('plot').innerHTML,before);assert.equal(t('x-output').textContent,'15.0');t('reset').emit('click');assert.equal(t('mode').value,'semantic');assert.equal(t('x').value,'11');
const cam=make('cam',['target','head','gain','gain-output','plot','score','mean','relation','rows','result','reset','static','controls']);const c=k=>cam.one[`[data-cam-${k}]`];c('target').value='left';c('head').value='linear';c('gain').value='1';
a.mountActivation({querySelectorAll:()=>[cam],createElement:()=>new E()});assert.equal(c('controls').hidden,false);assert.equal(c('static').hidden,true);assert.equal(c('score').textContent,'0.35000');assert.equal(c('mean').textContent,c('score').textContent);assert.equal(c('rows').children.length,3);
c('head').value='nonlinear';c('head').emit('change');assert.notEqual(c('score').textContent,c('mean').textContent);assert.ok(c('plot').innerHTML.includes('COMPARISON ONLY'));assert.ok(c('result').textContent.includes('不能按标准 CAM'));
c('target').value='right';c('target').emit('change');assert.equal(c('rows').children[0].children[2].textContent,'-0.700');
c('gain').value='0';c('gain').emit('input');assert.equal(c('rows').children[0].children[1].textContent,'0');c('reset').emit('click');assert.equal(c('score').textContent,'0.35000');assert.equal(c('head').value,'linear');
console.log('Passed visible-mask union and occlusion, connected-region versus instance distinction, exact box bounds, independent CAM score, spatial finite-difference gradients, Grad-CAM scaling/ReLU, nonlinear readout limits, static diagrams and actual UI events.');
