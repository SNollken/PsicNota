/* ==========================================================================
   menu.js — componente <psic-menu>, dono único do menu lateral do PsicNota.

   Como usar em qualquer página (2 passos):

     1) No <head> (ANTES do </head>, junto com os estilos):
          <script src="../assets/menu/menu.js"></script>
        Tem que ser no <head>: assim o componente já está definido quando o
        parser chega na tag, e a sidebar existe antes dos scripts de página rodarem.

     2) No lugar onde antes ficava o <aside class="sidebar"> inteiro:
          <psic-menu tipo="psicologo" ativo="agenda"></psic-menu>

   Atributos:
     tipo  = "psicologo" | "paciente"
             Se omitido, usa o tipo salvo na sessão.
     ativo = qual item aparece destacado:
             psicologo: "inicio" | "agenda" | "pacientes" | "relatorios" | "perfil" | ""
             paciente : "inicio" | "agendar" | "perfil" | ""

   O componente renderiza em LIGHT DOM de forma SÍNCRONA durante o parse,
   então os scripts de cada página (agenda-psicologo.js, pacientes.js, perfil.js...)
   continuam achando .sidebar, .nav-item, #psychologistAvatar etc. normalmente.

   A marcação é a mesma do menu.html (referência). O estilo mora no menu.css,
   carregado pelo CSS próprio de cada página (via @import ou <link>).
   ========================================================================== */

(function () {
  'use strict';

  /* Caminho base dos assets resolvido a partir deste próprio menu.js, usado
     para injetar o sidebar.js (carregador da foto de perfil do banco) sem
     depender de cada página incluir a tag. */
  var menuSrc = (document.currentScript && document.currentScript.src) || '';
  var assetsBase = menuSrc ? menuSrc.slice(0, menuSrc.lastIndexOf('menu/')) : '../assets/';

  var ICON_AGENDA = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 4h14a2 2 0 0 1 2 2v14H3V6a2 2 0 0 1 2-2Zm2-2v4m10-4v4M3 9h18"/></svg>';
  var ICON_CLIP = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M21.44 11.05l-9.19 9.19a6 6 0 0 1-8.49-8.49l8.57-8.57A4 4 0 1 1 18 8.84l-8.59 8.57a2 2 0 0 1-2.83-2.83l8.49-8.48"/></svg>';
  var ICON_HOME = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 10.6 12 4l8 6.6V20a1 1 0 0 1-1 1h-4.6v-6.2H9.6V21H5a1 1 0 0 1-1-1v-10.4Z"/></svg>';
  var ICON_PESSOA = '<svg class="nav-icon-fill" viewBox="0 0 24 24" aria-hidden="true"><path d="M12 11.5a4.25 4.25 0 1 0-4.25-4.25A4.26 4.26 0 0 0 12 11.5Zm0 2.1c-3.88 0-8.05 1.95-8.05 5.4v1.6h16.1v-1.6c0-3.45-4.17-5.4-8.05-5.4Z"/></svg>';
  var ICON_SAIR = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><path d="M16 17l5-5-5-5"/><path d="M21 12H9"/></svg>';

  /* Destino do logout. Toda página com <psic-menu> fica um nível abaixo da raiz
     (psicologo/ e paciente/), então '../auth/login.html' resolve para a raiz —
     o mesmo padrão de '../' que o prefixoAsset já usa. */
  var LOGIN_HREF = '../auth/login.html';

  function item(href, icone, rotulo, ativo, classeExtra) {
    var classes = 'nav-item' + (classeExtra ? ' ' + classeExtra : '') + (ativo ? ' active' : '');
    return (
      '<a class="' + classes + '"' + (ativo ? ' aria-current="page"' : '') + ' href="' + href + '">' +
        icone + '\n        ' + rotulo + '\n      </a>'
    );
  }

  function menuPsicologo(ativo) {
    var prefixoPagina = '';
    var prefixoAsset = '../assets/';
    var perfilHref = 'perfil.html';

    return (
      '<aside class="sidebar" aria-label="Navegação principal">\n' +
      '      <a class="brand" href="' + prefixoPagina + 'agenda-psicologo.html" aria-label="PsicNota - página inicial">\n' +
      '        <img src="' + prefixoAsset + 'img/logo_psicnota.png" alt="Ícone PsicNota" class="brand-icon" />\n' +
      '        <span class="brand-text">PsicNota</span>\n' +
      '      </a>\n' +
      '      <nav class="main-nav">\n' +
      '        <p class="nav-label">MENU</p>\n' +
      '        ' + item(prefixoPagina + 'home.html', ICON_HOME, 'Início', ativo === 'inicio') + '\n' +
      '        ' + item(prefixoPagina + 'agenda-psicologo.html', ICON_AGENDA, 'Agendar consulta', ativo === 'agenda') + '\n' +
      '        ' + item(prefixoPagina + 'pacientes.html', ICON_PESSOA, 'Meus pacientes', ativo === 'pacientes') + '\n' +
      '        ' + item(prefixoPagina + 'relatorios.html', ICON_CLIP, 'Relatórios', ativo === 'relatorios') + '\n' +
      '        ' + item(LOGIN_HREF, ICON_SAIR, 'Sair', false, 'nav-item-sair') + '\n' +
      '      </nav>\n\n' +
      '      <a class="sidebar-profile" href="' + perfilHref + '"' + (ativo === 'perfil' ? ' aria-current="page"' : '') + ' aria-label="Editar meu perfil">\n' +
      '        <span class="sidebar-profile-avatar" id="psychologistAvatar" aria-hidden="true"><img src="' + prefixoAsset + 'img/avatar-psicologo.png" alt="" /></span>\n' +
      '        <span class="sidebar-profile-info">\n' +
      '          <strong id="psychologistName">Psicólogo</strong>\n' +
      '          <small>Psicólogo</small>\n' +
      '        </span>\n' +
      '      </a>\n' +
      '    </aside>'
    );
  }

  function menuPaciente(ativo) {
    var prefixoPagina = '';
    var prefixoAsset = '../assets/';
    var perfilHref = 'perfil.html';

    return (
      '<aside class="sidebar" aria-label="Navegação do paciente">\n' +
      '      <a class="brand" href="' + prefixoPagina + 'agenda-paciente.html" aria-label="PsicNota - página inicial">\n' +
      '        <img src="' + prefixoAsset + 'img/logo_psicnota.png" alt="Ícone PsicNota" class="brand-icon" />\n' +
      '        <span class="brand-text">PsicNota</span>\n' +
      '      </a>\n' +
      '      <nav class="main-nav">\n' +
      '        <p class="nav-label">MENU</p>\n' +
      '        ' + item(prefixoPagina + 'home.html', ICON_HOME, '<span>Início</span>', ativo === 'inicio') + '\n' +
      '        ' + item(prefixoPagina + 'agenda-paciente.html', ICON_AGENDA, '<span>Agendar consulta</span>', ativo === 'agendar') + '\n' +
      '        ' + item(LOGIN_HREF, ICON_SAIR, '<span>Sair</span>', false, 'nav-item-sair') + '\n' +
      '      </nav>\n\n' +
      '      <a class="sidebar-profile" href="' + perfilHref + '"' + (ativo === 'perfil' ? ' aria-current="page"' : '') + ' aria-label="Editar meu perfil">\n' +
      '        <span class="sidebar-profile-avatar" id="patientAvatar" aria-hidden="true"><img src="' + prefixoAsset + 'img/avatar-paciente.png" alt="" /></span>\n' +
      '        <span class="sidebar-profile-info">\n' +
      '          <strong id="patientNameTop">Paciente PsicNota</strong>\n' +
      '          <small>Paciente</small>\n' +
      '        </span>\n' +
      '      </a>\n' +
      '    </aside>'
    );
  }

  function tipoDaSessao() {
    var storages = [window.sessionStorage, window.localStorage];
    var chaves = ['psinote.auth.session', 'psinoteSession'];

    for (var i = 0; i < storages.length; i += 1) {
      for (var j = 0; j < chaves.length; j += 1) {
        try {
          var sessao = JSON.parse(storages[i].getItem(chaves[j]) || 'null');
          if (sessao && ['paciente', 'patient'].indexOf(sessao.role) !== -1) return 'paciente';
          if (sessao && ['psicologo', 'psychologist'].indexOf(sessao.role) !== -1) return 'psicologo';
        } catch (error) {
          /* Ignora dados inválidos e tenta a próxima chave. */
        }
      }
    }

    return 'psicologo';
  }

  /* MVP-04: logout apaga só a sessão, preservando dados clínicos do demo
     (consultas, notas, relatórios cacheados no localStorage). */

  /* Logout global do <psic-menu>. Funciona com ou sem backend/cliente Supabase:
       1) signOut do Supabase global (melhor esforço);
       2) signOut do PsicNotaBackend se existir (perfil.html);
       3) clearSession do shared-data (remove só as chaves de sessão);
       4) redirect para o login. */
  function sair() {
    try {
      if (window.PsicNotaSupabase && typeof window.PsicNotaSupabase.auth.signOut === 'function') {
        window.PsicNotaSupabase.auth.signOut();
      }
    } catch (error) { /* melhor esforço: o logout local segue mesmo sem cliente Supabase */ }

    try {
      if (window.PsicNotaBackend && typeof window.PsicNotaBackend.signOut === 'function') {
        window.PsicNotaBackend.signOut();
      }
    } catch (error) { /* melhor esforço: profile-backend.js só carrega nas páginas de perfil */ }

    try {
      if (window.PsiNoteData && typeof window.PsiNoteData.clearSession === 'function') {
        window.PsiNoteData.clearSession();
      }
    } catch (error) { /* melhor esforço */ }

    window.location.href = LOGIN_HREF;
  }

  var PsicMenu = function () {
    return Reflect.construct(HTMLElement, [], PsicMenu);
  };
  PsicMenu.prototype = Object.create(HTMLElement.prototype);
  PsicMenu.prototype.constructor = PsicMenu;

  PsicMenu.prototype.connectedCallback = function () {
    var tipo = (this.getAttribute('tipo') || tipoDaSessao()).toLowerCase();
    var ativo = (this.getAttribute('ativo') || '').toLowerCase();
    if (tipo === 'paciente') {
      this.innerHTML = menuPaciente(ativo);
    } else {
      this.innerHTML = menuPsicologo(ativo);
    }

    var botaoSair = this.querySelector('.nav-item-sair');
    if (botaoSair) {
      botaoSair.addEventListener('click', function (event) {
        event.preventDefault();
        sair();
      });
    }

    /* Carrega o sidebar.js, que troca o avatar ilustrado pela foto real do
       perfil vinda do banco (perfis.avatar_url -> Supabase Storage). Como o
       <psic-menu> aparece em todas as telas, a foto passa a carregar em
       qualquer página, sem precisar incluir a tag em cada HTML. A flag evita
       injetar o script mais de uma vez por documento. */
    if (!window.__psicMenuSidebar) {
      window.__psicMenuSidebar = true;
      var sidebarScript = document.createElement('script');
      sidebarScript.src = assetsBase + 'js/sidebar.js';
      document.head.appendChild(sidebarScript);
    }
  };

  if (!window.customElements.get('psic-menu')) {
    window.customElements.define('psic-menu', PsicMenu);
  }
})();
