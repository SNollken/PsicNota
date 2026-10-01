const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup(result = {error:null}, emailChange = false) {
 const writes = [];
 const client = {auth:{getUser:async()=>({data:{user:{id:'own',email:'old@example.com'}}}),updateUser:async()=>({data:{user:{email:emailChange?'old@example.com':'new@example.com'}}})},from(table){return {update(row){writes.push({table,row});return {eq(key,id){assert.equal(id,'own');return {select(){return {single:async()=>result};}}}}}}}};
 const context={window:{PsicNotaSupabase:client}};vm.runInNewContext(fs.readFileSync('assets/js/profile-backend.js','utf8'),context);
 return {backend:context.window.PsicNotaBackend,writes};
}
test('salva telefone internacional e correção de UF do CRP em suas próprias linhas',async()=>{
 const {backend,writes}=setup();
 await backend.saveProfile('own','psicologo',{fullName:'Teste',email:'old@example.com',phone:'+819012345678',crp:'12345',crpState:'GO'},null,false,'');
 assert.equal(writes[0].row.telefone,'+819012345678');
 assert.equal(writes[1].row.crp_uf,'GO');
});
test('update bloqueado ou sem linha não confirma sucesso',async()=>{
 const {backend}=setup({error:new Error('No rows')});
 await assert.rejects(()=>backend.saveProfile('own','paciente',{email:'old@example.com'},null,false,''),/No rows/);
});
test('troca pendente de e-mail preserva e-mail confirmado e informa confirmação',async()=>{
 const {backend,writes}=setup({error:null},true);
 const values={email:'new@example.com'};
 await backend.saveProfile('own','paciente',values,null,false,'');
 assert.equal(values.emailChangePending,true);
 assert.equal(writes[0].row.email,'old@example.com');
});
