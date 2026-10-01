const test = require('node:test');
const assert = require('node:assert/strict');
const vm = require('node:vm');
const fs = require('node:fs');
function setup() {
  const input = { value: '', addEventListener() {}, before(select) { this.country = select; }, setCustomValidity(message) { this.error = message; } };
  const select = { options: [], value: '', setAttribute() {}, add(option) { this.options.push(option); }, addEventListener() {}, get selectedOptions() { return this.options.filter(option => option.value === this.value); } };
  const context = { window: {}, Intl, Option: function(label, value) { this.label = label; this.value = value; this.dataset = {}; }, document: { querySelectorAll: () => [input], createElement: () => select } };
  vm.createContext(context);
  for (const name of ['phone-country-data', 'phone-input']) vm.runInContext(fs.readFileSync(`assets/js/${name}.js`, 'utf8'), context);
  return { input, phone: context.window.PsicNotaPhone };
}
test('telefone brasileiro legado e japonês internacional sobrevivem à edição', () => {
  const { input, phone } = setup();
  phone.set(input, '(61) 99999-9999');
  assert.equal(phone.value(input), '+5561999999999');
  phone.set(input, '+819012345678');
  assert.equal(input.country.value, 'JP');
  assert.equal(input.value, '9012345678');
  assert.equal(phone.value(input), '+819012345678');
  input.value = '9087654321';
  assert.equal(phone.value(input), '+819087654321');
});
test('DDIs cobrem países e territórios e respeitam limite internacional', () => {
  const { input, phone } = setup();
  assert.equal(input.country.options.length, 245);
  for (const country of ['BR', 'JP', 'US', 'PT', 'AO', 'TL']) assert.ok(input.country.options.some(option => option.value === country));
  phone.set(input, '+351912345678');
  assert.equal(phone.valid(input), true);
  input.value = '123456789012345';
  assert.equal(phone.valid(input), false);
  input.value = '';
  assert.equal(phone.value(input), '');
});
