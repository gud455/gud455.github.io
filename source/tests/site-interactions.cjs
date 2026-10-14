// Exercise the actual browser script with a small DOM event harness; no browser dependency.
const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
class Element {
  constructor(dataset = {}, tagName = 'DIV') {
    this.dataset = dataset; this.tagName = tagName; this.hidden = false;
    this.attributes = {}; this.listeners = {}; this.value = ''; this.textContent = '';
    this.classes = new Set();
    this.classList = { add: name => this.classes.add(name), remove: name => this.classes.delete(name),
      toggle: (name, on) => on ? this.classes.add(name) : this.classes.delete(name) };
  }
  addEventListener(name, fn) { (this.listeners[name] ||= []).push(fn); }
  emit(name, event = {}) { (this.listeners[name] || []).forEach(fn => fn(event)); }
  setAttribute(name, value) { this.attributes[name] = value; }
  getAttribute(name) { return this.attributes[name]; }
  focus() { document.activeElement = this; }
}
const input = new Element({}, 'INPUT'), controls = new Element(), count = new Element(), empty = new Element(), reset = new Element({}, 'BUTTON');
const buttons = ['all', 'Diffusion', 'C++'].map(filter => new Element({filter}, 'BUTTON'));
const records = [new Element({search:'DDPM 噪声预测 PyTorch',tags:'Diffusion|PyTorch'}),
  new Element({search:'CDDFuse 图像融合 PyTorch',tags:'图像融合|PyTorch'}),
  new Element({search:'C++ 手动分词',tags:'C++|编译原理'})];
const browser = new Element();
browser.querySelector = key => ({'.record-controls':controls,'[data-record-search]':input,'[data-result-count]':count,'[data-empty-state]':empty,'[data-reset]':reset})[key];
browser.querySelectorAll = key => ({'[data-filter]':buttons,'[data-record]':records})[key] || [];
const menu = new Element({}, 'BUTTON'), navigation = new Element(); menu.setAttribute('aria-expanded','false');
const document = new Element(); document.documentElement = new Element();
document.querySelector = key => ({'.menu-toggle':menu,'#site-nav':navigation})[key] || null;
document.querySelectorAll = key => key === '[data-record-browser]' ? [browser] : [];
const location = {href:'https://gud455.github.io/notes/?q=ddpm&tag=Diffusion',search:'?q=ddpm&tag=Diffusion'};
const history = {replaceState:(_state,_title,url) => {location.href = String(url); location.search = new URL(url).search;}};
vm.runInNewContext(fs.readFileSync('assets/academic/site.js','utf8'), {document,location,history,navigator:{},URL,URLSearchParams,window:{setTimeout},console});
const visible = () => records.map(record => !record.hidden);
assert.deepEqual(visible(),[true,false,false]); // restore filters from URL
assert.equal(count.textContent,'显示 1 / 3 条记录');
input.value='ＰＹＴＯＲＣＨ'; input.emit('input');
assert.deepEqual(visible(),[true,false,false]); // normalize full-width input + tag intersection
buttons[0].emit('click'); assert.deepEqual(visible(),[true,true,false]);
input.value='PyTorch DDPM'; input.emit('input'); assert.deepEqual(visible(),[true,false,false]);
buttons[2].emit('click'); assert.deepEqual(visible(),[false,false,false]); assert.equal(empty.hidden,false);
input.value='<img onerror=alert(1)>'; input.emit('input'); assert.deepEqual(visible(),[false,false,false]);
reset.emit('click'); assert.deepEqual(visible(),[true,true,true]); assert.equal(empty.hidden,true);
assert.equal(new URL(location.href).search,''); assert.equal(document.activeElement,input);
menu.emit('click'); assert.equal(menu.getAttribute('aria-expanded'),'true'); assert.equal(navigation.classes.has('is-open'),true);
document.emit('keydown',{key:'Escape'}); assert.equal(menu.getAttribute('aria-expanded'),'false'); assert.equal(document.activeElement,menu);
menu.emit('click'); navigation.emit('click',{target:{closest:() => ({})}}); assert.equal(menu.getAttribute('aria-expanded'),'false');
let prevented=false; document.activeElement=new Element();
document.emit('keydown',{key:'/',preventDefault:()=>{prevented=true;}}); assert.equal(prevented,true); assert.equal(document.activeElement,input);
prevented=false; document.emit('keydown',{key:'/',preventDefault:()=>{prevented=true;}}); assert.equal(prevented,false);
console.log('Passed search, tag intersection, URL restoration, reset, menu and keyboard scenarios.');
