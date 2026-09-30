/**
 * Offline layout regression check. Requires Playwright (npm install --no-save playwright).
 * Run: node tests/responsive-layout.cjs
 * Optional: CHROME_PATH=/path/to/chromium QA_OUT=/tmp/psicnota-qa
 * Blocks external requests and backend scripts; checks page layouts, the real
 * patient-home renderer with fixture data, and populated calendar grids.
 * This is a layout test, not authentication or database integration coverage.
 */
const {chromium}=require('playwright');
const fs=require('fs');
const path=require('path');
const assert=require('node:assert/strict');
const root=path.resolve(__dirname,'..');
const server=require('http').createServer((req,res)=>{const p=root+decodeURIComponent(req.url.split('?')[0]);try{res.setHeader('Content-Type',p.endsWith('.css')?'text/css':p.endsWith('.js')?'text/javascript':p.endsWith('.html')?'text/html':'application/octet-stream');res.end(fs.readFileSync(p))}catch{res.statusCode=404;res.end()}});
(async()=>{
 await new Promise(r=>server.listen(8899,'127.0.0.1',r));
 const executablePath=process.env.CHROME_PATH;
 const browser=await chromium.launch({headless:true,...(executablePath?{executablePath}:{}),args:['--no-sandbox']});
 const pages=['index.html',...['auth','paciente','psicologo'].flatMap(d=>fs.readdirSync(`${root}/${d}`).filter(f=>f.endsWith('.html')).map(f=>`${d}/${f}`))];
 const results=[];
 for(const width of [320,375,430,768,1024,1440]){
  const page=await browser.newPage({viewport:{width,height:900}});
  await page.route('**/*',r=>{const u=r.request().url();return !u.startsWith('http://127.0.0.1:8899')|| (u.endsWith('.js')&&!u.endsWith('/menu.js')&&!u.endsWith('/landing-menu.js'))?r.abort():r.continue()});
  for(const p of pages){
   await page.goto(`http://127.0.0.1:8899/${p}`);
   if(p==='index.html') {
     const signIn=page.locator('.topbar-actions .button-ghost');
     assert.equal(await signIn.isVisible(),true,`Sign in must be visible at ${width}px`);
     if(width<=900) {
       const header=await page.locator('.topbar-inner').boundingBox();
       assert.ok(header.height<=90,`Mobile header must stay on one row at ${width}px`);
       const toggle=page.locator('.landing-mobile-menu summary');
       await toggle.click();
       assert.equal(await page.locator('.landing-mobile-links a[href="auth/cadastro.html"]').isVisible(),true);
       await page.keyboard.press('Escape');
       assert.equal(await page.locator('.landing-mobile-menu').getAttribute('open'),null);
       await toggle.click();
       await page.locator('.landing-mobile-links a[href="#recursos"]').click();
       assert.equal(await page.locator('.landing-mobile-menu').getAttribute('open'),null);
       await page.evaluate(()=>window.scrollTo(0,0));
       if(process.env.QA_OUT && width===375) {
         fs.mkdirSync(process.env.QA_OUT,{recursive:true});
         await page.screenshot({path:path.join(process.env.QA_OUT,'landing-mobile.png')});
       }
     }
   }
   if(p==='paciente/home.html') {
    await page.evaluate(()=>{
      window.PsicNotaBackend={requireProfile:async()=>({id:'layout-test'})};
      window.PsiNoteData={getSession:()=>({id:'layout-test'}),getProfiles:()=>[{id:'layout-test',fullName:'Maria de Teste',role:'paciente'}],fromDateKey:d=>new Date(d+'T12:00:00'),getAppointments:()=>[1,2,3].map(n=>({patientId:'layout-test',date:'2099-09-'+(20+n),time:'15:30',psychologist:'Psicóloga com nome completo de exemplo',mode:'online'}))};
    });
    await page.addScriptTag({content:fs.readFileSync(root+'/assets/js/paciente/home.js','utf8')});
   }
   if(p==='psicologo/pacientes.html') await page.evaluate(()=>{
     document.querySelector('#patientTotal').textContent='2 pacientes no total';
     document.querySelector('.patient-list').innerHTML=['Carlos Eduardo Menezes','Mario'].map(name=>`<a class="patient-card" href="paciente-perfil.html"><div class="patient-avatar">${name[0]}</div><div class="patient-info"><strong>${name}</strong><div class="patient-meta"><span class="patient-next">Próxima: 29/09/2026 às 09:00</span><span>Última consulta: 28/09/2026</span></div></div><div class="patient-arrow">›</div></a>`).join('');
   });
   if(p.includes('agenda-')) await page.evaluate(()=>{
     const grid=document.querySelector('[role=grid]');
     const patient=document.body.classList.contains('patient-view');
     if(grid)grid.innerHTML=Array.from({length:35},(_,i)=>`<button class="${patient?'patient-day':'psic-day'}"><span class="${patient?'patient-day-number':'psic-day-number'}">${i%30+1}</span><span class="${patient?'patient-day-info':'psic-day-info'}">15:30</span></button>`).join('');
   });
   if(process.env.QA_OUT && width===375 && p==='paciente/home.html') {
     fs.mkdirSync(process.env.QA_OUT,{recursive:true});
     await page.screenshot({path:path.join(process.env.QA_OUT,'patient-home-mobile.png'),fullPage:true});
   }
   const overlaps=await page.evaluate(()=>{
     const problems=[];
     for(const heading of document.querySelectorAll('main h1')) {
       const header=heading.closest('header') || heading.parentElement;
       for(const control of header.querySelectorAll('button, a, .patients-count, .badge')) {
         if(control.closest('[hidden]'))continue;
         const a=heading.getBoundingClientRect(), b=control.getBoundingClientRect();
         if(b.width && b.height && Math.min(a.right,b.right)-Math.max(a.left,b.left)>1 && Math.min(a.bottom,b.bottom)-Math.max(a.top,b.top)>1) problems.push({title:heading.textContent.trim(),control:control.className});
       }
     }
     return problems;
   });
   if(overlaps.length)results.push({width,page:p,overlaps});
   if(process.env.QA_OUT && width===375 && p==='psicologo/pacientes.html') await page.screenshot({path:path.join(process.env.QA_OUT,'patients-mobile.png'),fullPage:true});
   const issues=await page.evaluate(()=>[...document.querySelectorAll('body *')].filter(e=>{
    if(e.closest('.sidebar, .sr-only, [hidden]'))return false;
    const b=e.getBoundingClientRect(),s=getComputedStyle(e);
    if(!b.width||!b.height||s.visibility==='hidden'||s.display==='none')return false;
    let a=e.parentElement;while(a&&a!==document.body){if(['auto','scroll'].includes(getComputedStyle(a).overflowX))return false;a=a.parentElement}
    return b.right>innerWidth+2||b.left< -2;
   }).map(e=>({tag:e.tagName,cls:e.className,right:Math.round(e.getBoundingClientRect().right),left:Math.round(e.getBoundingClientRect().left)})).slice(0,8));
   if(issues.length) results.push({width,page:p,issues});
  }
  await page.close();
 }
 await browser.close();server.close();
 assert.deepEqual(results,[],JSON.stringify(results,null,2));
 console.log(`Layout OK: ${pages.length} pages × 6 viewport widths (offline fixtures).`);
})().catch(error=>{console.error(error);process.exit(1)});
