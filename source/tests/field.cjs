const assetPath = path => require('node:path').join(__dirname, '..', path);
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const crypto=require('node:crypto');
const field=require('../assets/academic/field.js');
const digest=plate=>crypto.createHash('sha256').update(plate.pixels).digest('hex');
const wave=field.pattern(270,105,455,'wave');
assert.equal(digest(wave),digest(field.pattern(270,105,455,'wave')));
assert.notEqual(digest(wave),digest(field.pattern(270,105,592,'wave')));
assert.notEqual(digest(wave),digest(field.pattern(270,105,455,'orbit')));
assert.notEqual(digest(wave),digest(field.pattern(270,105,455,'wave',.8)));
const cosmos=field.pattern(270,105,455,'cosmos');
assert.equal(digest(cosmos),digest(field.pattern(270,105,455,'cosmos')));
assert.notEqual(digest(cosmos),digest(wave));
assert.notEqual(digest(cosmos),digest(field.pattern(270,105,455,'cosmos',.8)));
assert.notEqual(digest(cosmos),digest(field.pattern(270,105,592,'cosmos')));
assert.ok([...cosmos.pixels].filter(n=>n>0).length>300);
assert.equal(wave.pixels.length,270*105);
const paletteCounts=[0,0,0];
for(const color of wave.pixels){assert.ok(color>=0&&color<3);paletteCounts[color]++;}
assert.ok(paletteCounts.every(n=>n>100));
assert.equal(field.pattern(-3,0).pixels.length,1);
assert.equal(fs.readFileSync(assetPath('assets/academic/field-001.svg'),'utf8'),field.svg(455,'wave'));
class Element {
  constructor(dataset={}){this.dataset=dataset;this.handlers={};this.attributes={};this.hidden=true;this.disabled=false;this.textContent='';}
  addEventListener(event,callback){this.handlers[event]=callback;}
  setAttribute(name,value){this.attributes[name]=value;}
  emit(event){this.handlers[event]?.();}
}
const seed=new Element(),motion=new Element(),label=new Element(),controls=new Element();
const modes=[new Element({artMode:'wave'}),new Element({artMode:'orbit'}),new Element({artMode:'cosmos'})];
let draws=0;
const canvas=new Element();
canvas.getContext=()=>({createImageData:(w,h)=>({data:new Uint8ClampedArray(w*h*4)}),putImageData:()=>draws++});
const figure=new Element();
figure.querySelector=key=>({'[data-generative-canvas]':canvas,'[data-field-controls]':controls,'[data-art-seed]':seed,'[data-art-motion]':motion,'[data-seed-label]':label})[key]||null;
figure.querySelectorAll=()=>modes;
const document=new Element();document.visibilityState='visible';document.querySelectorAll=()=>[figure];
const media=new Element();media.matches=false;
let callbacks=new Map(),next=0;
const context={document,matchMedia:()=>media,Uint8ClampedArray,console,
 requestAnimationFrame:fn=>{callbacks.set(++next,fn);return next;},cancelAnimationFrame:id=>callbacks.delete(id)};
vm.runInNewContext(fs.readFileSync(assetPath('assets/academic/field.js'),'utf8'),context);
assert.equal(draws,1);assert.equal(canvas.hidden,false);assert.equal(controls.hidden,false);
assert.equal(motion.attributes['aria-pressed'],'true');assert.equal(callbacks.size,1);
assert.equal(motion.textContent,'暂停动态');
seed.emit('click');assert.equal(label.textContent,'0592');assert.equal(draws,2);
modes[1].emit('click');assert.equal(modes[1].attributes['aria-pressed'],'true');assert.equal(draws,3);
modes[2].emit('click');assert.equal(modes[2].attributes['aria-pressed'],'true');assert.equal(modes[1].attributes['aria-pressed'],'false');assert.equal(draws,4);
assert.equal(canvas.attributes['aria-label'],'缓慢旋转的像素星系与闪烁星点');
motion.emit('click');assert.equal(callbacks.size,0);assert.equal(motion.attributes['aria-pressed'],'false');
assert.equal(motion.textContent,'播放动态');
motion.emit('click');assert.equal(callbacks.size,1);assert.equal(motion.attributes['aria-pressed'],'true');
document.visibilityState='hidden';document.emit('visibilitychange');assert.equal(callbacks.size,0);
document.visibilityState='visible';document.emit('visibilitychange');assert.equal(callbacks.size,1);
media.matches=true;media.emit('change');assert.equal(motion.disabled,true);assert.equal(callbacks.size,0);assert.equal(motion.attributes['aria-pressed'],'false');
console.log('Passed deterministic plates, seed/mode variation, static fallback and motion/visibility scenarios.');

media.matches=false;media.emit('change');assert.equal(callbacks.size,1);assert.equal(motion.disabled,false);

// The compact home cover has only a motion control; reduced motion must never auto-start.
callbacks.clear();media.matches=true;
figure.querySelector=key=>({'[data-generative-canvas]':canvas,'[data-field-controls]':controls,'[data-art-motion]':motion})[key]||null;
figure.querySelectorAll=()=>[];
vm.runInNewContext(fs.readFileSync(assetPath('assets/academic/field.js'),'utf8'),context);
assert.equal(callbacks.size,0);assert.equal(motion.disabled,true);assert.equal(motion.textContent,'静态显示');
console.log('Passed compact controls and initial reduced-motion preference.');
