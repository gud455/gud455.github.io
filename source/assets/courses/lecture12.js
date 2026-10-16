(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;if(root.document)api.mount(root.document);})(typeof globalThis!=='undefined'?globalThis:this,function(){
'use strict';
const ink='#22251f',red='#b42e20',blue='#365a68',paper='#f6f3eb',line='#d8d8cc';
const f=(n,d=3)=>Math.abs(n)<.5*10**(-d)?'0':n.toFixed(d),sum=a=>a.reduce((s,n)=>s+n,0);
const probText=(p,d=5)=>p>0&&p<10**(-d)?p.toExponential(2):p.toFixed(d);
function infoNCE(similarities,temperature=.2){
 if(!(temperature>0)||similarities.length<2)throw new RangeError('Positive temperature and at least two candidates required');
 const logits=similarities.map(n=>n/temperature),max=Math.max(...logits),exps=logits.map(n=>Math.exp(n-max)),den=sum(exps),probabilities=exps.map(n=>n/den),loss=max+Math.log(den)-logits[0];
 return {logits,probabilities,loss,derivatives:probabilities.map((p,i)=>(p-(i===0?1:0))/temperature)};
}
function contrastive({positive=30,negative=70,count=4,temperature=.2,mode='custom'}={}){
 const angles=mode==='collapsed'?Array(count+1).fill(0):[positive,...[negative,-90,150,-150].slice(0,count)],vectors=angles.map(deg=>[Math.cos(deg*Math.PI/180),Math.sin(deg*Math.PI/180)]),similarities=vectors.map(v=>v[0]);
 return {angles,vectors,similarities,...infoNCE(similarities,temperature),count,temperature,mode};
}
function start(title,description,w,h){return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${w} ${h}" role="img" aria-label="${title}"><title>${title}</title><desc>${description}</desc><rect width="${w}" height="${h}" fill="${paper}"/><g font-family="monospace" fill="${ink}">`;}
function contrastiveSVG(options={}){
 const r=contrastive(options);let s=start('Single-anchor InfoNCE with unit vectors','Left: anchor and candidate unit vectors. Right: candidate probabilities including one positive and the negatives, excluding the anchor itself.',760,374);
 s+=`<text x="24" y="28" font-size="13">01 / UNIT VECTORS</text><text x="408" y="28" font-size="13">02 / CANDIDATE PROBABILITIES</text><text x="24" y="50" font-size="11">${r.mode.toUpperCase()} | temperature = ${f(r.temperature,2)}</text>`;
 const cx=190,cy=189,rad=104;s+=`<path d="M62 189H318M190 61V317" stroke="${line}"/><circle cx="${cx}" cy="${cy}" r="${rad}" stroke="${line}" fill="none"/>`;
 r.vectors.forEach((v,i)=>{const x=cx+rad*v[0],y=cy-rad*v[1];s+=`<path d="M${cx} ${cy}L${x} ${y}" stroke="${i===0?red:blue}" stroke-opacity=".45"/><circle cx="${x}" cy="${y}" r="${i===0?7:5}" fill="${i===0?red:blue}" stroke="${paper}" stroke-width="1.5"/>`;});
 s+=`<rect x="${cx+rad-4}" y="${cy-4}" width="8" height="8" fill="${ink}"/><text x="${cx+rad+8}" y="${cy-11}" font-size="11">anchor</text>`;
 r.probabilities.forEach((p,i)=>{const y=83+i*45;s+=`<text x="408" y="${y+14}" font-size="12">${i===0?'P':'N'+i}</text><rect x="447" y="${y}" width="190" height="20" fill="${line}"/><rect x="447" y="${y}" width="${190*p}" height="20" fill="${i===0?red:blue}"/><text x="649" y="${y+14}" font-size="12">${probText(p,3)}</text>`;});
 s+=`<text x="24" y="342" font-size="11">${r.mode==='collapsed'?'all candidates coincide; no positive separation':'red: positive | blue: negatives | black: anchor'}</text><text x="408" y="342" font-size="12">loss = ${f(r.loss,5)}</text></g></svg>`;return s;
}
const targets=[.1,.2,.7,.8,.2,.3,.8,.9,.7,.8,.3,.2,.8,.9,.2,.1];
function shuffled(seed=7){let state=seed>>>0;const ids=Array.from({length:16},(_,i)=>i);for(let i=15;i>0;i--){state=(Math.imul(1664525,state)+1013904223)>>>0;const j=Math.floor(state/4294967296*(i+1));[ids[i],ids[j]]=[ids[j],ids[i]];}return ids;}
function maskedPatches({ratio=.75,seed=7,prediction=.5,visibleOffset=0}={}){
 const maskedCount=Math.round(16*ratio),mask=new Set(shuffled(seed).slice(0,maskedCount)),entries=targets.map((target,id)=>{const masked=mask.has(id),value=masked?prediction:Math.min(1,Math.max(0,target+visibleOffset));return {id,target,masked,prediction:value,error:(value-target)**2};});
 const visibleCount=16-maskedCount,loss=sum(entries.filter(e=>e.masked).map(e=>e.error))/maskedCount,allLoss=sum(entries.map(e=>e.error))/16;
 return {entries,maskedCount,visibleCount,loss,allLoss,scoreElements:visibleCount**2,fullScoreElements:256,seed,ratio};
}
function maskedSVG(options={}){
 const r=maskedPatches(options);let s=start('Masked patches, visible encoder input and manual predictions','The encoder view hides masked patch values. Red outlines on the manual prediction indicate patches included in the masked loss.',760,365);
 s+=`<defs><pattern id="ssl-mask-hatch" width="7" height="7" patternUnits="userSpaceOnUse"><path d="M-1 1L1-1M0 7L7 0M6 8L8 6" stroke="${line}" stroke-width="1"/></pattern></defs><text x="24" y="28" font-size="13">MASKED PATCHES / ${r.maskedCount} OF 16 / SEED ${r.seed}</text>`;
 for(const[panel,ox,title]of [[0,24,'01 / TARGET'],[1,280,'02 / VISIBLE INPUT'],[2,536,'03 / MANUAL PREDICTION']]){
  s+=`<text x="${ox}" y="66" font-size="11">${title}</text>`;
  r.entries.forEach(e=>{const x=ox+(e.id%4)*46,y=85+Math.floor(e.id/4)*46,hidden=panel===1&&e.masked,value=panel===2?e.prediction:e.target,c=Math.round(246-180*value);s+=`<rect x="${x}" y="${y}" width="44" height="44" fill="${hidden?'url(#ssl-mask-hatch)':`rgb(${c},${c},${c})`}" stroke="${panel===2&&e.masked?red:line}" stroke-width="${panel===2&&e.masked?2:1}"/><text x="${x+22}" y="${y+27}" text-anchor="middle" font-size="11" fill="${hidden?ink:value>.6?paper:ink}">${hidden?'mask':f(value,2)}</text>`;});
 }
 s+=`<text x="24" y="298" font-size="11">encoder patches: ${r.visibleCount}/16 | decoder positions: 16</text><text x="24" y="326" font-size="11">masked MSE = ${f(r.loss,5)} | all-patch MSE = ${f(r.allLoss,5)}</text><text x="24" y="350" font-size="10">Manual predictions for loss inspection. No learned reconstruction model.</text></g></svg>`;return s;
}
function rows(doc,target,data){target.replaceChildren();data.forEach(values=>{const tr=doc.createElement('tr');values.forEach(value=>{const td=doc.createElement('td');td.textContent=value;tr.append(td);});target.append(tr);});}
function mountContrastive(doc){doc.querySelectorAll('[data-contrastive-loss-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-nce-'+k+']');
 const update=()=>{const options={positive:Number(get('positive').value),negative:Number(get('negative').value),count:Number(get('count').value),temperature:Number(get('temperature').value),mode:get('mode').value},r=contrastive(options);get('positive').disabled=options.mode==='collapsed';get('negative').disabled=options.mode==='collapsed';get('positive-output').textContent=options.mode==='collapsed'?'0°（固定）':options.positive+'°';get('negative-output').textContent=options.mode==='collapsed'?'0°（固定）':options.negative+'°';get('temperature-output').textContent=f(r.temperature,2);get('plot').innerHTML=contrastiveSVG(options);get('probability').textContent=probText(r.probabilities[0]);get('loss').textContent=f(r.loss,5);get('candidates').textContent=String(r.count+1);rows(doc,get('rows'),r.similarities.map((n,i)=>[i===0?'正样本 P':'负样本 N'+i,f(n,5),f(r.logits[i],5),probText(r.probabilities[i]),f(r.derivatives[i],5)]));get('result').textContent=options.mode==='collapsed'?`所有候选相同，p₊ = 1/${r.count+1}，损失 ln(${r.count+1}) = ${f(r.loss,5)}，与温度无关。`:'正样本参与分母，anchor 自身不参与。若负样本比正样本更相似，降低温度也可能让损失上升。';};
 for(const key of ['mode','count'])get(key).addEventListener('change',update);for(const key of ['positive','negative','temperature'])get(key).addEventListener('input',update);
 get('reset').addEventListener('click',()=>{for(const[k,v]of [['mode','custom'],['count','4'],['positive','30'],['negative','70'],['temperature','0.2']])get(k).value=v;update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mountMasked(doc){doc.querySelectorAll('[data-masked-patch-lab]').forEach(lab=>{
 const get=k=>lab.querySelector('[data-mask-'+k+']');let seed=7;
 const update=()=>{const options={ratio:Number(get('ratio').value),prediction:Number(get('prediction').value),visibleOffset:Number(get('visible').value),seed},r=maskedPatches(options);get('seed').textContent=String(seed);get('prediction-output').textContent=f(options.prediction,2);get('visible-output').textContent=f(options.visibleOffset,2);get('plot').innerHTML=maskedSVG(options);get('visible-count').textContent=`${r.visibleCount} / 16`;get('loss').textContent=f(r.loss,5);get('all-loss').textContent=f(r.allLoss,5);rows(doc,get('rows'),r.entries.map(e=>[String(e.id+1),e.masked?'是（计入损失）':'否',f(e.target,2),f(e.prediction,2),f(e.error,5)]));get('result').textContent=`遮挡 ${r.maskedCount} 个、可见 ${r.visibleCount} 个 patch；解码位置仍为 16。一层注意力分数矩阵元素数 ${r.scoreElements}，全量对照为 256，不代表总计算或实际速度。只改变可见位置的预测不会改变遮挡损失。`;};
 get('ratio').addEventListener('change',update);for(const key of ['prediction','visible'])get(key).addEventListener('input',update);get('reshuffle').addEventListener('click',()=>{seed++;update();});get('reset').addEventListener('click',()=>{seed=7;get('ratio').value='0.75';get('prediction').value='0.5';get('visible').value='0';update();});update();get('plot').hidden=false;get('static').hidden=true;get('controls').hidden=false;
 });}
function mount(doc){mountContrastive(doc);mountMasked(doc);}
return {infoNCE,contrastive,contrastiveSVG,shuffled,maskedPatches,maskedSVG,mountContrastive,mountMasked,mount};
});
