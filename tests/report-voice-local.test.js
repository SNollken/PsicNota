const test=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),vm=require('node:vm');
const source=fs.readFileSync(require('node:path').join(__dirname,'../assets/js/psicologo/relatorio-voz-local.js'),'utf8');
function harness({waitDecode=false}={}) {
 const messages=[],workers=[];let finishDecode;
 class FakeWorker {
  constructor(url,options){this.url=url;this.options=options;workers.push(this);}
  postMessage(message,transfer){messages.push({message,transfer});queueMicrotask(()=>this.onmessage?.({data:{id:message.id,...(message.action==='prepare'?{ready:true}:{text:'texto local'})}}));}
  terminate(){this.terminated=true;}
 }
 const decoded={length:2,numberOfChannels:2,getChannelData:i=>new Float32Array(i?[.2,.4]:[.4,.8])};
 class AudioContext {
  constructor(channels,length,rate){assert.equal(rate,16000);}
  async decodeAudioData(){if(waitDecode)await new Promise(r=>finishDecode=r);return decoded;}
 }
 const window={addEventListener:()=>{}};
 vm.runInNewContext(source,{window,document:{currentScript:{src:'http://localhost/assets/js/psicologo/relatorio-voz-local.js'}},Worker:FakeWorker,OfflineAudioContext:AudioContext,URL,DOMException,Float32Array,Map,Promise,fetch:()=>{throw Error('audio upload forbidden')}});
 return {engine:window.PsiLocalTranscription,messages,workers,finishDecode:()=>finishDecode()};
}
test('local audio is downmixed at 16 kHz and transferred to a local worker, without HTTP upload',async()=>{
 const h=harness();const result=await h.engine.transcribe(new Blob(['audio']));
 assert.equal(result.text,'texto local');assert.equal(h.workers.length,1);
 assert.equal(h.workers[0].url.href,'http://localhost/assets/js/psicologo/relatorio-voz-worker.js');
 const sent=h.messages.find(x=>x.message.action==='transcribe');
 assert.ok(Math.abs(sent.message.samples[0]-.3)<.00001);assert.ok(Math.abs(sent.message.samples[1]-.6)<.00001);
 assert.equal(sent.transfer[0],sent.message.samples.buffer);
});
test('cancelling during audio decode prevents a late transcription job and terminates worker',async()=>{
 const h=harness({waitDecode:true});const job=h.engine.transcribe(new Blob(['audio']));
 await new Promise(r=>setImmediate(r));h.engine.cancel();h.finishDecode();
 await assert.rejects(job,{name:'AbortError'});assert.equal(h.workers[0].terminated,true);
 assert.equal(h.messages.some(x=>x.message.action==='transcribe'),false);
});