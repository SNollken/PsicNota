const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(save) {
 const listeners = {};
 const form = {inert:false, reportValidity:()=>true,addEventListener:(name,fn)=>listeners[name]=fn,setAttribute(){},removeAttribute(){}};
 const window = {};
 vm.runInNewContext(fs.readFileSync('assets/js/profile-autosave.js','utf8'),{window});
 const values = {phone:'original'};
 const controller = window.PsicNotaAutosave.create(form,()=>values,save);
 return {controller,form,values,listeners};
}
test('só salva depois de carregar e quando o valor mudou',async()=>{
 let calls=0;
 const {controller,values}=setup(async()=>{calls++;return true;});
 await controller.request();assert.equal(calls,0);
 controller.markSaved();await controller.request();assert.equal(calls,0);
 values.phone='novo';await controller.request();assert.equal(calls,1);
 await controller.request();assert.equal(calls,1);
});
test('gravação bloqueia envios concorrentes e libera edição após falha',async()=>{
 let finish;let calls=0;
 const {controller,form,values}=setup(()=>{calls++;return new Promise(resolve=>finish=resolve);});
 controller.markSaved();values.phone='novo';
 const pending=controller.request();assert.equal(form.inert,true);
 await controller.request();assert.equal(calls,1);
 finish(false);await pending;assert.equal(form.inert,false);
 const retry=controller.request();assert.equal(calls,2);finish(true);await retry;
});
