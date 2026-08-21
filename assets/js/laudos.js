const data = window.PsiNoteData;

const elements = {
  docList: document.querySelector('#docList'),
  emptyDocs: document.querySelector('#emptyDocs'),
  docTotal: document.querySelector('#docTotal'),
  patientName: document.querySelector('#patientNameTop'),
  patientAvatar: document.querySelector('#patientAvatar'),
  sidebar: document.querySelector('.sidebar'),
  mobileMenu: document.querySelector('.mobile-menu'),
  logoutLink: document.querySelector('#logoutLink')
};

const shortDateFormatter = new Intl.DateTimeFormat('pt-BR', { day: '2-digit', month: '2-digit', year: 'numeric' });

function getInitials(name) {
  return String(name).split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]).join('').toUpperCase();
}

/* Gera um PDF mínimo válido (uma página com o título do documento).
   É um placeholder de demonstração: quando houver backend, o PDF real
   sai do template do psicólogo. */
function buildDemoPdf(title, subtitle) {
  const sanitize = (value) => String(value)
    .replace(/\\/g, '\\\\')
    .replace(/\(/g, '\\(')
    .replace(/\)/g, '\\)')
    .replace(/[^\x20-\x7EÀ-ÿ]/g, '');

  const lines = [
    `BT /F1 16 Tf 50 780 Td (${sanitize(title)}) Tj ET`,
    `BT /F1 11 Tf 50 756 Td (${sanitize(subtitle)}) Tj ET`,
    'BT /F1 10 Tf 50 712 Td (Documento de demonstracao gerado pelo prototipo PsicNota.) Tj ET',
    'BT /F1 10 Tf 50 696 Td (Quando o backend existir, este arquivo saira do template do psicologo.) Tj ET'
  ];
  const stream = lines.join('\n');

  const objects = [];
  objects.push('<< /Type /Catalog /Pages 2 0 R >>');
  objects.push('<< /Type /Pages /Kids [3 0 R] /Count 1 >>');
  objects.push('<< /Type /Page /Parent 2 0 R /MediaBox [0 0 595 842] /Contents 4 0 R /Resources << /Font << /F1 5 0 R >> >> >>');
  objects.push(`<< /Length ${stream.length} >>\nstream\n${stream}\nendstream`);
  objects.push('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  let pdf = '%PDF-1.4\n';
  const offsets = [];
  objects.forEach((body, index) => {
    offsets.push(pdf.length);
    pdf += `${index + 1} 0 obj\n${body}\nendobj\n`;
  });
  const xrefStart = pdf.length;
  pdf += `xref\n0 ${objects.length + 1}\n0000000000 65535 f \n`;
  offsets.forEach((offset) => {
    pdf += `${String(offset).padStart(10, '0')} 00000 n \n`;
  });
  pdf += `trailer\n<< /Size ${objects.length + 1} /Root 1 0 R >>\nstartxref\n${xrefStart}\n%%EOF`;

  const bytes = new Uint8Array(pdf.length);
  for (let index = 0; index < pdf.length; index += 1) {
    bytes[index] = pdf.charCodeAt(index) & 0xff;
  }
  return bytes;
}

function downloadDocument(doc) {
  const bytes = buildDemoPdf(doc.name, `${doc.type === 'laudo' ? 'Laudo' : 'Receita'} · ${shortDateFormatter.format(new Date(doc.attachedAt))}`);
  const blob = new Blob([bytes], { type: 'application/pdf' });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${doc.name.replace(/[^a-zA-Z0-9À-ÿ _-]/g, '')}.pdf`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  window.setTimeout(() => URL.revokeObjectURL(url), 4000);
}

function init() {
  const session = data.getSession();
  const displayName = (session && (session.fullName || session.name)) || 'Paciente';
  elements.patientName.textContent = displayName;
  elements.patientAvatar.textContent = getInitials(displayName);

  const isPatient = !session || !['psicologo', 'psychologist'].includes(session.role);

  /* Sem backend ainda: paciente vê os documentos anexados com o próprio nome.
     Psicólogo (preview) vê todos. */
  let documents = data.getDocuments();
  if (isPatient) {
    documents = documents.filter((doc) => doc.patient === displayName || doc.patient === (session?.name || ''));
  }
  documents = documents.sort((a, b) => new Date(b.attachedAt) - new Date(a.attachedAt));

  elements.docList.replaceChildren();
  elements.emptyDocs.hidden = documents.length > 0;
  elements.docTotal.textContent = documents.length === 1 ? '1 documento' : `${documents.length} documentos`;

  documents.forEach((doc) => {
    const item = document.createElement('div');
    item.className = 'doc-item';

    const info = document.createElement('div');
    info.className = 'doc-item-info';
    const title = document.createElement('strong');
    title.textContent = doc.name;
    const meta = document.createElement('span');
    meta.textContent = `${doc.type === 'laudo' ? 'Laudo' : 'Receita'} · disponibilizado em ${shortDateFormatter.format(new Date(doc.attachedAt))}${isPatient ? '' : ` · paciente ${doc.patient}`}`;
    info.append(title, meta);

    const actions = document.createElement('div');
    actions.className = 'action-row';
    const badge = document.createElement('span');
    badge.className = doc.type === 'laudo' ? 'badge badge-laudos' : 'badge badge-receita';
    badge.textContent = doc.type === 'laudo' ? 'Laudo' : 'Receita';
    const downloadButton = document.createElement('button');
    downloadButton.type = 'button';
    downloadButton.className = 'button button-primary button-compact';
    downloadButton.textContent = 'Baixar PDF';
    downloadButton.addEventListener('click', () => downloadDocument(doc));
    actions.append(badge, downloadButton);

    item.append(info, actions);
    elements.docList.append(item);
  });
}

elements.mobileMenu.addEventListener('click', () => {
  const isOpen = elements.sidebar.classList.toggle('open');
  elements.mobileMenu.setAttribute('aria-expanded', String(isOpen));
});
elements.logoutLink?.addEventListener('click', () => data.clearSession());

init();
