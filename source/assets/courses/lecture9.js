(function(root,factory){
 const api=factory();
 if(typeof module==='object'&&module.exports)module.exports=api;
 if(root.document)api.mount(root.document);
})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ink='#22251f',red='#b42e20',blue='#365a68',paper='#f6f3eb',line='#d8d8cc';
const f=(n,d=3)=>Math.abs(n)<.5*10**(-d)?'0':n.toFixed(d);
const mean=grid=>grid.flat().reduce((s,n)=>s+n,0)/grid.flat().length;
const taskInfo={
 classification:{title:'CLASSIFICATION',unit:'图像类别',shape:'1 个类别标签',identity:'不提供位置与数量',description:'图像分类：本例输出圆片类，不给出两个对象各自的位置、数量或轮廓。'},
 detection:{title:'OBJECT DETECTION',unit:'对象框与类别',shape:'2 个框 + 类别',identity:'分别定位两个对象',description:'目标检测：分别输出两个圆片的可见掩码外接框与类别，框内仍可能包含背景，不能替代精确轮廓。'},
 semantic:{title:'SEMANTIC SEGMENTATION',unit:'像素类别',shape:'12 × 20 标签图',identity:'同类不分实例',description:'语义分割：每个像素属于背景或圆片类。即使相邻圆片连在一起，也没有实例编号。'},
 instance:{title:'INSTANCE SEGMENTATION',unit:'对象掩码与类别',shape:'2 张 12 × 20 掩码',identity:'保留两个实例身份',description:'实例分割：两个圆片虽然同类，仍有独立的可见区域掩码与身份。颜色区分实例，不代表两个类别。'}
};
function scene(x=11){
 const labels=Array.from({length:12},(_,y)=>Array.from({length:20},(_,col)=>{const px=col+.5,py=y+.5;let id=0;if((px-6)**2+(py-6)**2<=3.2**2)id=1;if((px-x)**2+(py-6)**2<=2.8**2)id=2;return id;}));
 const masks=[1,2].map(id=>labels.map(row=>row.map(n=>Number(n===id))));
 const boxes=masks.map((mask,i)=>{const points=[];mask.forEach((row,y)=>row.forEach((n,x)=>{if(n)points.push([x,y]);}));if(!points.length)return null;return {id:i+1,x0:Math.min(...points.map(p=>p[0])),y0:Math.min(...points.map(p=>p[1])),x1:Math.max(...points.map(p=>p[0]))+1,y1:Math.max(...points.map(p=>p[1]))+1};});
 return {labels,masks,boxes,semantic:labels.map(row=>row.map(n=>Number(n>0))),width:20,height:12,classLabel:'圆片'};
}
function start(title,description,w,h){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><desc>${description}</desc><rect width="${w}" height="${h}" fill="${paper}"/><g font-family="monospace" fill="${ink}">`;}
function taskSVG({mode='semantic',x=11}={}){
 const r=scene(x),info=taskInfo[mode]||taskInfo.semantic;
 let s=start('Four vision tasks, one synthetic scene','Left: input pixels. Right: idealized labels for the selected task, not model predictions.',740,304);
 s+=`<text x="28" y="28" font-size="13">01 / INPUT</text><text x="414" y="28" font-size="13">02 / ${info.title}</text>`;
 function grid(ox,colors){let t='';r.labels.forEach((row,y)=>row.forEach((id,col)=>{t+=`<rect x="${ox+col*14}" y="${60+y*14}" width="14" height="14" fill="${colors[id]}"/>`;}));return t+`<rect x="${ox}" y="60" width="280" height="168" stroke="${line}" fill="none"/>`;}
 const input=['#e3e0d6','#6c7066','#91978a'];s+=grid(28,input);
 if(mode==='classification')s+=`<rect x="414" y="110" width="280" height="65" fill="${ink}"/><text x="554" y="149" text-anchor="middle" fill="${paper}" font-size="17">CLASS: CIRCLE</text>`;
 else if(mode==='detection'){
  s+=grid(414,input);r.boxes.forEach(b=>{if(b)s+=`<rect x="${414+b.x0*14}" y="${60+b.y0*14}" width="${(b.x1-b.x0)*14}" height="${(b.y1-b.y0)*14}" fill="none" stroke="${red}" stroke-width="2.5"/><text x="${414+b.x0*14}" y="${b.id===1?54+b.y0*14:75+b.y1*14}" fill="${red}" font-size="11">circle</text>`;});
 }else s+=grid(414,mode==='instance'?[paper,red,blue]:[paper,blue,blue]);
 s+=`<text x="28" y="257" font-size="11">20 x 12 pixels / same circle class</text><text x="414" y="257" font-size="11">${mode==='classification'?'image-level label only':mode==='detection'?'visible-mask bounding boxes':mode==='instance'?'red = ID 1 | blue = ID 2':'blue = circle | paper = background'}</text><text x="28" y="284" font-size="10">Synthetic annotation example. No detector or segmentation model is running.</text></g></svg>`;return s;
}
const baseFeatures=[[[0,1,1,0],[1,3,2,0],[1,2,1,0],[0,0,0,0]],[[0,0,1,1],[0,0,2,3],[0,0,2,2],[0,0,0,1]],[[1,2,2,1],[0,1,1,0],[0,0,0,0],[0,0,0,0]]];
const classWeights={left:[1,-.8,.4],right:[-.7,1.1,.2]};
function features(gain=1){return baseFeatures.map((grid,k)=>grid.map(row=>row.map(n=>n*(k===0?gain:1))));}
function readout(maps,{target='left',head='linear'}={}){
 const weights=[...(classWeights[target]||classWeights.left)],pooled=maps.map(mean),Z=maps[0].flat().length,nonlinear=head==='nonlinear';
 const score=pooled.reduce((s,n,k)=>s+weights[k]*(nonlinear?Math.tanh(n):n),0);
 const derivatives=pooled.map((n,k)=>weights[k]*(nonlinear?1-Math.tanh(n)**2:1)/Z);
 return {weights,pooled,Z,score,derivatives};
}
function activation({gain=1,target='left',head='linear'}={}){
 const maps=features(gain),r=readout(maps,{target,head}),combine=w=>maps[0].map((row,y)=>row.map((_,x)=>maps.reduce((s,grid,k)=>s+w[k]*grid[y][x],0)));
 const weighted=combine(r.weights),gradRaw=combine(r.derivatives),gradCAM=gradRaw.map(row=>row.map(n=>Math.max(0,n)));
 return {maps,...r,weighted,weightedMean:mean(weighted),gradRaw,gradCAM,camValid:head==='linear'};
}
function heatColor(n,max){const t=max>0?Math.min(1,Math.abs(n)/max):0,end=n<0?[54,90,104]:[180,46,32];return 'rgb('+[246,243,235].map((v,i)=>Math.round(v+(end[i]-v)*t)).join(',')+')';}
function activationSVG(options={}){
 const r=activation(options);let s=start('CAM and Grad-CAM from hand-built feature maps','Three synthetic feature maps above, a fixed-weight map below left, and Grad-CAM computed with actual score gradients below right.',740,516);
 function grid(map,x,y){const max=Math.max(...map.flat().map(Math.abs));let t='';map.forEach((row,i)=>row.forEach((n,j)=>{const strength=max?Math.abs(n)/max:0;t+=`<rect x="${x+j*34}" y="${y+i*34}" width="33" height="33" fill="${heatColor(n,max)}" stroke="${line}"/><text x="${x+j*34+16.5}" y="${y+i*34+21}" text-anchor="middle" font-size="10" fill="${strength>.58?paper:ink}">${f(n,2)}</text>`;}));return t;}
 s+=`<text x="24" y="28" font-size="13">3 FEATURE MAPS / ${options.target==='right'?'CLASS B':'CLASS A'} / ${r.camValid?'LINEAR HEAD':'TANH HEAD'}</text>`;
 r.maps.forEach((map,k)=>{const x=42+k*240;s+=`<text x="${x}" y="58" font-size="12">A${k+1}</text>`+grid(map,x,70)+`<text x="${x}" y="229" font-size="11">F = ${f(r.pooled[k])}</text><text x="${x}" y="249" font-size="11">w = ${f(r.weights[k])}</text><text x="${x}" y="269" font-size="11">alpha = ${f(r.derivatives[k],4)}</text>`;});
 s+=`<path d="M24 287H716" stroke="${line}"/><text x="108" y="315" font-size="12">${r.camValid?'CAM / SIGNED':'W-SUM / COMPARISON ONLY'}</text><text x="445" y="315" font-size="12">GRAD-CAM / ReLU</text>`;
 s+=grid(r.weighted,136,331)+grid(r.gradCAM,464,331);
 s+=`<text x="24" y="492" font-size="10">Each map uses its own color scale. Compare numeric cell values, not color alone.</text></g></svg>`;return s;
}
function rows(doc,target,data){target.replaceChildren();data.forEach(values=>{const tr=doc.createElement('tr');values.forEach(value=>{const td=doc.createElement('td');td.textContent=value;tr.append(td);});target.append(tr);});}
function mountTasks(doc){doc.querySelectorAll('[data-vision-task-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-task-'+k+']');
 const update=()=>{const mode=get('mode').value,x=Number(get('x').value),info=taskInfo[mode]||taskInfo.semantic;get('x-output').textContent=f(x,1);get('plot').innerHTML=taskSVG({mode,x});for(const key of ['unit','shape','identity'])get(key).textContent=info[key];get('result').textContent=info.description;};
 get('mode').addEventListener('change',update);get('x').addEventListener('input',update);get('reset').addEventListener('click',()=>{get('mode').value='semantic';get('x').value='11';update();});
 update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mountActivation(doc){doc.querySelectorAll('[data-activation-map-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-cam-'+k+']');
 const update=()=>{const options={target:get('target').value,head:get('head').value,gain:Number(get('gain').value)},r=activation(options);get('gain-output').textContent=f(options.gain,2);get('plot').innerHTML=activationSVG(options);get('score').textContent=f(r.score,5);get('mean').textContent=f(r.weightedMean,5);get('relation').textContent=r.camValid?'均值 = 分数':'非线性：不再等同';
 rows(doc,get('rows'),r.weights.map((w,k)=>['A'+(k+1),f(r.pooled[k],5),f(w,3),f(r.derivatives[k],6)]));
 get('result').textContent=r.camValid?'线性读出：mean(CAM) = S，α = w / 16；右图是 CAM / 16 经 ReLU 的结果。':'非线性读出：α = w(1 − tanh²F) / 16。左图仅为固定 w 加权对照，不能按标准 CAM 解释当前分数；右图使用当前分数的实际梯度。';
 };
 for(const key of ['target','head'])get(key).addEventListener('change',update);get('gain').addEventListener('input',update);
 get('reset').addEventListener('click',()=>{get('target').value='left';get('head').value='linear';get('gain').value='1';update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mount(doc){mountTasks(doc);mountActivation(doc);}
return {scene,taskInfo,taskSVG,features,readout,activation,activationSVG,mountTasks,mountActivation,mount};
});
