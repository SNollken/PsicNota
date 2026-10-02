// Uses a real MediaRecorder with Chromium test audio; local engine responses are simulated.
const {chromium} = require(process.env.PLAYWRIGHT_PATH || 'playwright');
const fs=require('fs'), path=require('path'), assert=require('node:assert/strict'), http=require('http');
const root=path.resolve(__dirname,'..'), out=process.env.QA_OUT || path.join(require('os').tmpdir(),'psicnota-report-voice-qa');
fs.mkdirSync(out,{recursive:true});
const server=http.createServer((req,res)=>{try{const p=path.join(root,decodeURIComponent(req.url.split('?')[0]));res.setHeader('Content-Type',p.endsWith('.js')?'text/javascript':p.endsWith('.css')?'text/css':'text/html');res.end(fs.readFileSync(p));}catch{res.statusCode=404;res.end();}});
(async()=>{
 await new Promise(r=>server.listen(8912,'127.0.0.1',r));
 const browser=await chromium.launch({channel:'chrome',headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream']});
 const results=[];
 for(const width of [375,1440]) {
  const page=await browser.newPage({viewport:{width,height:900}});
  const errors=[];page.on('pageerror',e=>errors.push(e.message));
  await page.route('**/*',route=>{const u=route.request().url();return !u.startsWith('http://127.0.0.1:8912')||(u.endsWith('.js')&&!u.endsWith('menu.js'))?route.abort():route.continue();});
  await page.goto('http://127.0.0.1:8912/psicologo/relatorios.html');
  await page.evaluate(()=>{
   document.querySelector('#listView').hidden=true;document.querySelector('#editorView').hidden=false;
   window.qaCalls=[]; window.qaMode='ready';window.qaInputs=0;
   const getUserMedia=navigator.mediaDevices.getUserMedia.bind(navigator.mediaDevices);
   navigator.mediaDevices.getUserMedia=async options=>{window.qaStream=await getUserMedia(options);return window.qaStream;};
   document.querySelector('#freeText').innerHTML='<b>Texto existente.</b>';
   document.querySelector('#freeText').addEventListener('input',()=>window.qaInputs++);
   window.PsiLocalTranscription={
    prepare:async()=>{if(window.qaMode==='missing')throw new Error('Não foi possível carregar o modelo local.');},
    transcribe:async blob=>{
     window.qaCalls.push({method:'local',size:blob.size,type:blob.type});
     if(window.qaMode==='failure')throw new Error('Falha temporária no modelo local.');
     return {text:'Anotação transcrita para revisão.'};
    },
    cancel:()=>{}
   };
  });
  await page.addScriptTag({content:fs.readFileSync(path.join(root,'assets/js/psicologo/relatorio-voz.js'),'utf8')});
  await page.evaluate(()=>window.PsiReportVoice.init());
  await page.locator('#reportMicrophone').click();
  await page.waitForFunction(()=>document.querySelector('#reportMicrophone').getAttribute('aria-pressed')==='true');
  assert.equal(await page.locator('#appointmentDropdownBtn').isDisabled(),true);
  assert.equal(await page.evaluate(()=>document.querySelector('#reportForm').dispatchEvent(new Event('submit',{bubbles:true,cancelable:true}))),false);
  await page.waitForTimeout(1200);
  await page.locator('#reportMicrophone').click();
  await page.locator('#reportVoiceText').waitFor({state:'visible'});
  assert.equal(await page.locator('#reportVoiceText').inputValue(),'Anotação transcrita para revisão.');
  assert.equal(await page.evaluate(()=>window.qaStream.getTracks().every(track=>track.readyState==='ended')),true);
  await page.locator('#reportVoiceText').fill('Texto revisado <script>literal</script>.');
  await page.locator('#reportVoiceInsert').click();
  assert.ok((await page.locator('#freeText').innerText()).includes('Texto revisado <script>literal</script>.'));
  assert.equal(await page.locator('#freeText b').count(),1);
  assert.equal(await page.locator('#freeText script').count(),0);
  assert.ok(await page.evaluate(()=>window.qaInputs)>0);
  assert.ok(await page.evaluate(()=>window.qaCalls.find(x=>x.method==='local').size)>0);
  assert.equal(await page.evaluate(()=>document.querySelector('#reportVoiceAudio').getAttribute('src')),null);
  await page.evaluate(()=>window.qaMode='failure');
  await page.locator('#reportMicrophone').click();
  await page.waitForFunction(()=>document.querySelector('#reportMicrophone').getAttribute('aria-pressed')==='true');
  await page.waitForTimeout(1100);await page.locator('#reportMicrophone').click();
  await page.locator('#reportVoiceRetry').waitFor({state:'visible'});
  assert.ok(await page.locator('#reportVoiceAudio').getAttribute('src'));
  await page.evaluate(()=>window.qaMode='ready');await page.locator('#reportVoiceRetry').click();
  await page.locator('#reportVoiceText').waitFor({state:'visible'});
  await page.screenshot({path:path.join(out,`review-${width}.png`),fullPage:true});
  await page.locator('#reportVoiceDiscard').click();
  const before=await page.locator('#freeText').innerHTML();
  await page.evaluate(()=>window.qaMode='missing');await page.locator('#reportMicrophone').click();
  await page.waitForFunction(()=>document.querySelector('#reportVoiceStatus').textContent.includes('carregar o modelo local'));
  assert.equal(await page.locator('#freeText').innerHTML(),before);
  assert.equal(await page.locator('#reportMicrophone').isDisabled(),false);
  assert.equal(await page.evaluate(()=>document.documentElement.scrollWidth>innerWidth),false);
  assert.deepEqual(errors,[]);
  await page.evaluate(()=>window.qaMode='ready');
  await page.locator('#reportMicrophone').click();
  await page.waitForFunction(()=>document.querySelector('#reportMicrophone').getAttribute('aria-pressed')==='true');
  await page.waitForTimeout(1100);
  await page.evaluate(()=>{document.querySelector('#reportMicrophone').click();document.querySelector('#reportMicrophone').click();});
  assert.equal(await page.evaluate(()=>window.qaStream.getTracks().every(track=>track.readyState==='ended')),true);
  assert.equal(await page.locator('#reportMicrophone').getAttribute('aria-pressed'),'false');
  assert.equal(await page.locator('#appointmentDropdownBtn').isDisabled(),false);
  results.push({width,realMediaRecorder:true,transcription:'local engine simulated',checks:'record/stop/review/edit/insert/plain text/draft input/retain/retry/discard/missing service/no overflow',passed:true});
  await page.close();
 }
 fs.writeFileSync(path.join(out,'browser-results.json'),JSON.stringify(results,null,2));
 console.log(JSON.stringify(results));await browser.close();server.close();
})().catch(e=>{console.error(e);server.close();process.exit(1)});
