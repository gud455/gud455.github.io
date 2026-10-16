const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),a=require('../assets/courses/lecture13.js');
const close=(x,y,e=1e-8)=>assert.ok(Math.abs(x-y)<e,`${x} != ${y}`);
close(a.arScore([1,1,0,1]).probability,.5*.8*.2*.2);close(a.arScore([0,0,0,0]).probability,.5*.8**3);close(a.arScore([1,1,1,1]).probability,.5*.8**3);
for(const first of [.05,.5,.95])for(const afterZero of [.05,.5,.95])for(const afterOne of [.05,.5,.95]){
 const params={first,afterZero,afterOne},r=a.autoregressive(params);assert.equal(r.distribution.length,16);close(r.total,1);r.distribution.forEach(d=>{assert.ok(d.probability>0&&d.probability<1);close(d.nll,-Math.log(d.probability));close(d.probability,d.factors.reduce((p,n)=>p*n,1));});
 const draw=a.sampleAR(params,13);assert.deepEqual(draw,a.sampleAR(params,13));draw.bits.forEach((bit,i)=>assert.equal(bit,Number(draw.uniforms[i]<(i===0?first:draw.bits[i-1]?afterOne:afterZero))));
}
const one=a.arScore([1,0,0,0]),two=a.arScore([1,0,1,1]);assert.deepEqual(one.factors.slice(0,2),two.factors.slice(0,2));
for(const bits of [[0,0,1,1],[1,1,0,1]]){const r=a.arScore(bits,{first:.3,afterZero:.4,afterOne:.4}),tailOnes=bits.slice(1).reduce((s,n)=>s+n,0);close(r.probability,(bits[0]?.3:.7)*.4**tailOnes*.6**(3-tailOnes));}
assert.throws(()=>a.gaussianVAE({sigma:0}),RangeError);close(a.gaussianKL(0,1),0);close(a.normalPDF(0),1/Math.sqrt(2*Math.PI));
// Independent numerical integration of q(z)[log p(x|z)+log p(z)-log q(z)].
function simpson(fn,lo=-12,hi=12,n=6000){const h=(hi-lo)/n;let total=fn(lo)+fn(hi);for(let i=1;i<n;i++)total+=(i%2?4:2)*fn(lo+i*h);return total*h/3;}
const logNormal=(z,mu,v)=>-.5*(Math.log(2*Math.PI*v)+(z-mu)**2/v);
for(const cfg of [{x:-2,mu:-1,sigma:.3},{x:1,mu:.8,sigma:Math.sqrt(.2)},{x:1,mu:0,sigma:1},{x:2,mu:1,sigma:1.2}]){
 const r=a.gaussianVAE(cfg);close(simpson(z=>a.normalPDF(z,cfg.mu,cfg.sigma**2)),1);const integral=simpson(z=>a.normalPDF(z,cfg.mu,cfg.sigma**2)*(logNormal(cfg.x,z,.25)+logNormal(z,0,1)-logNormal(z,cfg.mu,cfg.sigma**2)));close(integral,r.elbo,1e-7);
 for(const z of [-2,0,1,3])close(a.normalPDF(cfg.x,z,.25)*a.normalPDF(z)/Math.exp(r.logDensity),a.normalPDF(z,r.posteriorMu,r.posteriorVariance));
}
for(const x of [-2,0,1,2])for(const mu of [-3,0,.8,3])for(const sigma of [.2,.45,1,2]){
 const cfg={x,mu,sigma},r=a.gaussianVAE(cfg);assert.ok(r.elbo<=r.logDensity+1e-10);assert.ok(r.klPrior>=0&&r.gap>=0);close(r.logDensity-r.elbo,r.gap);const changed=a.gaussianVAE({...cfg,epsilon:-1.7});assert.equal(changed.elbo,r.elbo);assert.equal(changed.gap,r.gap);close(changed.z,mu-1.7*sigma);
 close((a.gaussianVAE({...cfg,mu:mu+1e-5}).elbo-a.gaussianVAE({...cfg,mu:mu-1e-5}).elbo)/2e-5,4*x-5*mu);
 close((a.gaussianVAE({...cfg,sigma:sigma+1e-5}).elbo-a.gaussianVAE({...cfg,sigma:sigma-1e-5}).elbo)/2e-5,-5*sigma+1/sigma);
}
for(const x of [-2,-.3,0,1,2]){const r=a.gaussianVAE({x,mu:.8*x,sigma:Math.sqrt(.2)});close(r.gap,0);close(r.elbo,r.logDensity);}
for(const[file,svg]of [['autoregressive-chain-static.svg',a.autoregressiveSVG()],['gaussian-vae-static.svg',a.vaeSVG()]]){assert.equal(fs.readFileSync(path.join(__dirname,'../assets/courses',file),'utf8'),svg+'\n');assert.ok(!/NaN|Infinity/.test(svg));}
// Actual event handlers; no browser layout claims.
class E{constructor(){this.hidden=true;this.value='';this.textContent='';this.innerHTML='';this.children=[];this.events={};this.one={};this.attributes={};}querySelector(k){return this.one[k];}addEventListener(k,f){(this.events[k]||=[]).push(f);}emit(k){for(const f of this.events[k]||[])f();}append(x){this.children.push(x);}replaceChildren(){this.children=[];}setAttribute(k,v){this.attributes[k]=v;}}
const make=(prefix,keys)=>{const e=new E();for(const key of keys)e.one[`[data-${prefix}-${key}]`]=new E();return e;};
const ar=make('ar',['first','after-zero','after-one','time','first-output','after-zero-output','after-one-output','time-output','bits','plot','joint','nll','total','rows','result','sample','reset','static','controls']),g=k=>ar.one[`[data-ar-${k}]`];for(const[k,v]of [['first','0.5'],['after-zero','0.2'],['after-one','0.8'],['time','2']])g(k).value=v;
a.mountAR({querySelectorAll:()=>[ar],createElement:()=>new E()});assert.equal(g('controls').hidden,false);assert.equal(g('static').hidden,true);assert.equal(g('bits').children.length,4);assert.equal(g('rows').children.length,4);assert.equal(g('joint').textContent,'0.016000');
const button=g('bits').children[0];button.emit('click');assert.equal(g('bits').children[0],button);assert.equal(button.attributes['aria-pressed'],'false');assert.equal(g('rows').children[0].children[2].textContent,'0');g('time').value='4';g('time').emit('input');assert.equal(g('time-output').textContent,'4');g('sample').emit('click');assert.ok(g('result').textContent.includes('种子：7'));g('reset').emit('click');assert.equal(g('joint').textContent,'0.016000');g('first').value='0.8';g('first').emit('input');close(Number(g('joint').textContent),.8*.8*.2*.2);
const vae=make('vae',['x','mu','sigma','epsilon','x-output','mu-output','sigma-output','epsilon-output','plot','elbo','log-density','gap','rows','result','match','prior','reset','static','controls']),v=k=>vae.one[`[data-vae-${k}]`];for(const[k,n]of [['x','1'],['mu','0'],['sigma','1'],['epsilon','0.5']])v(k).value=n;
a.mountVAE({querySelectorAll:()=>[vae],createElement:()=>new E()});assert.equal(v('controls').hidden,false);assert.equal(v('static').hidden,true);assert.equal(v('rows').children.length,6);const elbo=v('elbo').textContent,z=v('rows').children[4].children[1].textContent;
v('epsilon').value='-1';v('epsilon').emit('input');assert.equal(v('elbo').textContent,elbo);assert.notEqual(v('rows').children[4].children[1].textContent,z);v('match').emit('click');assert.equal(v('gap').textContent,'0');assert.equal(v('elbo').textContent,v('log-density').textContent);v('x').value='-0.3';v('x').emit('input');v('match').emit('click');close(Number(v('mu').value),-.24);assert.equal(v('gap').textContent,'0');v('prior').emit('click');assert.equal(v('mu').value,'0');assert.equal(v('sigma').value,'1');assert.equal(v('rows').children[1].children[1].textContent,'0');v('reset').emit('click');assert.equal(v('elbo').textContent,elbo);assert.equal(v('epsilon').value,'0.5');
console.log('Passed autoregressive normalization/complements/prefix isolation, deterministic sequential sampling, exact posterior via Bayes, independent ELBO quadrature and finite differences, bound tightness, epsilon isolation, static figures and actual UI events/reset.');
