/* ==========================================================================
   menu.js — componente <psic-menu>, dono único do menu lateral do PsicNota.

   Como usar em qualquer página (2 passos):

     1) No <head> (ANTES do </head>, junto com os estilos):
          <script src="../assets/menu/menu.js"></script>
        (no perfil.html, que fica na raiz: <script src="assets/menu/menu.js"></script>)
        Tem que ser no <head>: assim o componente já está definido quando o
        parser chega na tag, e a sidebar existe antes dos scripts de página rodarem.

     2) No lugar onde antes ficava o <aside class="sidebar"> inteiro:
          <psic-menu tipo="psicologo" ativo="agenda"></psic-menu>

   Atributos:
     tipo  = "psicologo" | "paciente" | "perfil"
     ativo = qual item aparece destacado:
             psicologo: "agenda" | "relatorios" | "pacientes" | "" (nenhum)
             paciente : "agendar" | "laudos" | "" (nenhum)
             perfil   : não usa (o perfil.js controla os dois navs)

   O componente renderiza em LIGHT DOM de forma SÍNCRONA durante o parse,
   então os scripts de cada página (agenda.js, pacientes.js, perfil.js...)
   continuam achando .sidebar, .nav-item, #psychologistAvatar etc. normalmente.

   A marcação é a mesma do menu.html (referência). O estilo mora no menu.css,
   carregado pelo CSS próprio de cada página (via @import ou <link>).
   ========================================================================== */

(function () {
  'use strict';

  var ICON_AGENDA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 9h18"/></svg>';
  var ICON_CLIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
  var ICON_PESSOA = '<svg class="nav-icon-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11.5a4.25 4.25 0 1 0-4.25-4.25A4.26 4.26 0 0 0 12 11.5Zm0 2.1c-3.88 0-8.05 1.95-8.05 5.4v1.6h16.1v-1.6c0-3.45-4.17-5.4-8.05-5.4Z"/></svg>';

  function item(href, icone, rotulo, ativo) {
    return (
      '<a class="nav-item' + (ativo ? ' active" aria-current="page"' : '"') + ' href="' + href + '">' +
        icone + '\n        ' + rotulo + '\n      </a>'
    );
  }

  function menuPsicologo(ativo) {
    return (
      '<aside class="sidebar" aria-label="Navegação principal">\n' +
      '      <a class="brand" href="agenda.html" aria-label="PsicNota - página inicial">\n' +
      '        <img src="../assets/img/logo_psicnota.png" alt="Ícone PsicNota" class="brand-icon" />\n' +
      '        <span class="brand-text">PsicNota</span>\n' +
      '      </a>\n' +
      '      <nav class="main-nav">\n' +
      '        <p class="nav-label">MENU</p>\n' +
      '        ' + item('agenda.html', ICON_AGENDA, 'Agendar consulta', ativo === 'agenda') + '\n' +
      '        ' + item('relatorios.html', ICON_CLIP, 'Relatórios', ativo === 'relatorios') + '\n' +
      '        ' + item('pacientes.html', ICON_PESSOA, 'Meus pacientes', ativo === 'pacientes') + '\n' +
      '      </nav>\n\n' +
      '      <a class="sidebar-profile" href="../perfil.html" aria-label="Editar meu perfil">\n' +
      '        <span class="sidebar-profile-avatar" id="psychologistAvatar" aria-hidden="true"><img src="../assets/img/avatar-psicologo.png" alt="" /></span>\n' +
      '        <span class="sidebar-profile-info">\n' +
      '          <strong id="psychologistName">Psicólogo</strong>\n' +
      '          <small>Psicólogo</small>\n' +
      '        </span>\n' +
      '      </a>\n' +
      '    </aside>'
    );
  }

  function menuPaciente(ativo) {
    return (
      '<aside class="sidebar" aria-label="Navegação do paciente">\n' +
      '      <a class="brand" href="agenda-paciente.html" aria-label="PsicNota - página inicial">\n' +
      '        <img src="../assets/img/logo_psicnota.png" alt="Ícone PsicNota" class="brand-icon" />\n' +
      '        <span class="brand-text">PsicNota</span>\n' +
      '      </a>\n' +
      '      <nav class="main-nav">\n' +
      '        <p class="nav-label">MENU</p>\n' +
      '        ' + item('agenda-paciente.html', ICON_AGENDA, '<span>Agendar consulta</span>', ativo === 'agendar') + '\n' +
      '        ' + item('laudos.html', ICON_CLIP, '<span>Receitas e Laudos</span>', ativo === 'laudos') + '\n' +
      '      </nav>\n\n' +
      '      <a class="sidebar-profile" href="../perfil.html" aria-label="Editar meu perfil">\n' +
      '        <span class="sidebar-profile-avatar" id="patientAvatar" aria-hidden="true"><img src="../assets/img/avatar-paciente.png" alt="" /></span>\n' +
      '        <span class="sidebar-profile-info">\n' +
      '          <strong id="patientNameTop">Paciente PsicNota</strong>\n' +
      '          <small>Paciente</small>\n' +
      '        </span>\n' +
      '      </a>\n' +
      '    </aside>'
    );
  }

  /* perfil.html: os dois navs existem; o perfil.js mostra/esconde pelo papel logado. */
  function menuPerfil() {
    return (
      '<aside class="sidebar" aria-label="Navegação principal">\n' +
      '      <a class="brand" id="brandLink" href="paciente/agenda-paciente.html" aria-label="PsicNota - página inicial">\n' +
      '        <img src="assets/img/logo_psicnota.png" alt="Ícone PsicNota" class="brand-icon" />\n' +
      '        <span class="brand-text">PsicNota</span>\n' +
      '      </a>\n\n' +
      '      <nav class="main-nav" id="navPaciente">\n' +
      '        <p class="nav-label">MENU</p>\n' +
      '        ' + item('paciente/agenda-paciente.html', ICON_AGENDA, '<span>Agendar consulta</span>', false) + '\n' +
      '        ' + item('paciente/laudos.html', ICON_CLIP, '<span>Receitas e Laudos</span>', false) + '\n' +
      '      </nav>\n\n' +
      '      <nav class="main-nav" id="navPsicologo" hidden>\n' +
      '        <p class="nav-label">MENU</p>\n' +
      '        ' + item('profissional/agenda.html', ICON_AGENDA, '<span>Agendar consulta</span>', false) + '\n' +
      '        ' + item('profissional/relatorios.html', ICON_CLIP, '<span>Relatórios</span>', false) + '\n' +
      '        ' + item('profissional/pacientes.html', ICON_PESSOA, '<span>Meus pacientes</span>', false) + '\n' +
      '      </nav>\n\n' +
      '      <a class="sidebar-profile" href="perfil.html" aria-current="page" aria-label="Meu perfil">\n' +
      '        <span class="sidebar-profile-avatar" data-sidebar-avatar aria-hidden="true">PN</span>\n' +
      '        <span class="sidebar-profile-info">\n' +
      '          <strong data-sidebar-name>Usuário PsicNota</strong>\n' +
      '          <small data-sidebar-role>Paciente</small>\n' +
      '        </span>\n' +
      '      </a>\n' +
      '    </aside>'
    );
  }

  var PsicMenu = function () {
    return Reflect.construct(HTMLElement, [], PsicMenu);
  };
  PsicMenu.prototype = Object.create(HTMLElement.prototype);
  PsicMenu.prototype.constructor = PsicMenu;

  PsicMenu.prototype.connectedCallback = function () {
    var tipo = (this.getAttribute('tipo') || 'psicologo').toLowerCase();
    var ativo = (this.getAttribute('ativo') || '').toLowerCase();

    if (tipo === 'paciente') {
      this.innerHTML = menuPaciente(ativo);
    } else if (tipo === 'perfil') {
      this.innerHTML = menuPerfil();
    } else {
      this.innerHTML = menuPsicologo(ativo);
    }
  };

  if (!window.customElements.get('psic-menu')) {
    window.customElements.define('psic-menu', PsicMenu);
  }
})();
