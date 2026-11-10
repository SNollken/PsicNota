/*
 * Caixa de feedback presente em todas as telas.
 * Envia para o Worker do Cloudflare, que guarda os itens e alimenta o TODO
 * do projeto no HermesSync. Não depende do Supabase nem de sessão.
 */
(function () {
  "use strict";

  var ENDPOINT = "https://psicnota-feedback.soso-novaes.workers.dev";
  var jaIniciado = false;

  function papelDaTela() {
    if (location.pathname.indexOf("/psicologo/") !== -1) return "psicologo";
    if (location.pathname.indexOf("/paciente/") !== -1) return "paciente";
    return "visitante";
  }

  function montarEstilos() {
    var css = [
      "#pn-fb-open{position:fixed;right:20px;bottom:20px;z-index:9000;display:flex;align-items:center;gap:8px;",
      "border:0;border-radius:999px;background:#1f637a;color:#fff;padding:10px 16px;font:600 13px Inter,Arial,sans-serif;",
      "box-shadow:0 8px 24px rgba(31,99,122,.28);cursor:pointer}",
      "#pn-fb-open:hover{background:#17505f}",
      "#pn-fb-open svg{width:16px;height:16px}",
      "#pn-fb-panel{position:fixed;right:20px;bottom:74px;z-index:9001;width:min(340px,calc(100vw - 32px));",
      "background:#fff;border:1px solid #d7e9f0;border-radius:16px;box-shadow:0 18px 48px rgba(15,49,61,.18);",
      "padding:16px;font:13px Inter,Arial,sans-serif;color:#17313b;max-height:calc(100dvh - 100px);overflow:auto}",
      "#pn-fb-panel[hidden]{display:none}",
      "#pn-fb-panel h2{margin:0;font-size:15px;line-height:1.3}",
      "#pn-fb-head{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-bottom:12px}",
      "#pn-fb-close{border:0;background:transparent;font-size:20px;line-height:1;color:#5b7883;cursor:pointer;padding:2px 6px;border-radius:8px}",
      "#pn-fb-close:hover{background:#eef7fb}",
      "#pn-fb-panel label{display:block;font-weight:600;margin:10px 0 6px}",
      "#pn-fb-msg,#pn-fb-contact{width:100%;box-sizing:border-box;border:1px solid #cfe3ec;border-radius:10px;padding:10px 12px;",
      "font:13px Inter,Arial,sans-serif;color:#17313b;background:#fbfdfe;outline:none}",
      "#pn-fb-msg{min-height:96px;resize:none}",
      "#pn-fb-msg:focus,#pn-fb-contact:focus{border-color:#1f637a;box-shadow:0 0 0 3px rgba(31,99,122,.14)}",
      "#pn-fb-send{width:100%;margin-top:14px;border:0;border-radius:10px;background:#1f637a;color:#fff;padding:10px;",
      "font:600 13px Inter,Arial,sans-serif;cursor:pointer}",
      "#pn-fb-send:disabled{opacity:.65;cursor:wait}",
      "#pn-fb-error{margin-top:10px;color:#b42318;font-size:12px;line-height:1.4}",
      "#pn-fb-ok{text-align:center;padding:10px 0 4px}",
      "#pn-fb-ok .pn-fb-check{width:40px;height:40px;margin:0 auto 10px;border-radius:50%;background:#e4f6fc;color:#1f637a;",
      "display:flex;align-items:center;justify-content:center}",
      "#pn-fb-ok p{margin:0 0 14px;line-height:1.5}",
      "#pn-fb-ok button{border:0;border-radius:10px;background:#1f637a;color:#fff;padding:9px 18px;font:600 13px Inter,Arial,sans-serif;cursor:pointer}",
      ".pn-fb-hp{position:absolute;left:-9999px;width:1px;height:1px;opacity:0;pointer-events:none}",
      "#pn-fb-files{display:none}",
      ".pn-fb-file{display:inline-flex;align-items:center;gap:6px;border:1px dashed #bcd8e4;border-radius:10px;padding:8px 10px;color:#1f637a;font-weight:600;cursor:pointer}",
      ".pn-fb-file:hover{background:#eef7fb}",
      "#pn-fb-files-list{display:flex;flex-direction:column;gap:6px;margin-top:8px}",
      ".pn-fb-chip{display:flex;align-items:center;justify-content:space-between;gap:8px;background:#eef7fb;border-radius:8px;padding:6px 8px;font-size:12px;color:#17313b}",
      ".pn-fb-chip button{border:0;background:transparent;color:#5b7883;font-size:15px;line-height:1;cursor:pointer;padding:0 2px}",
      ".pn-fb-chip button:hover{color:#b42318}",
      "@media (max-width:480px){#pn-fb-open{right:12px;bottom:12px}#pn-fb-panel{right:12px;bottom:64px}}",
    ].join("");
    var style = document.createElement("style");
    style.id = "pn-fb-style";
    style.textContent = css;
    document.head.appendChild(style);
  }

  function montarInterface() {
    var botao = document.createElement("button");
    botao.id = "pn-fb-open";
    botao.type = "button";
    botao.setAttribute("aria-haspopup", "dialog");
    botao.setAttribute("aria-expanded", "false");
    botao.innerHTML =
      '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true">' +
      '<path d="M21 11.5a8.4 8.4 0 0 1-8.5 8.5 8.9 8.9 0 0 1-3.8-.8L3 21l1.8-5.2A8.4 8.4 0 0 1 12.5 3 8.4 8.4 0 0 1 21 11.5Z"/></svg>' +
      "Feedback";

    var painel = document.createElement("div");
    painel.id = "pn-fb-panel";
    painel.hidden = true;
    painel.setAttribute("role", "dialog");
    painel.setAttribute("aria-label", "Enviar feedback");
    painel.innerHTML =
      '<div id="pn-fb-head"><h2>Enviar feedback</h2><button id="pn-fb-close" type="button" aria-label="Fechar">&times;</button></div>' +
      '<form id="pn-fb-form" novalidate>' +
      '<label for="pn-fb-msg">O que você quer nos contar?</label>' +
      '<textarea id="pn-fb-msg" maxlength="2000" placeholder="Sugestão, problema ou elogio..." required></textarea>' +
      '<label for="pn-fb-contact">Contato (opcional)</label>' +
      '<input id="pn-fb-contact" maxlength="200" autocomplete="off" placeholder="E-mail ou telefone">' +
      '<label for="pn-fb-files" class="pn-fb-file">Anexar imagem ou PDF (até 3 arquivos, 3 MB cada)</label>' +
      '<input id="pn-fb-files" type="file" accept="image/*,.pdf" multiple>' +
      '<div id="pn-fb-files-list"></div>' +
      '<input class="pn-fb-hp" id="pn-fb-site" tabindex="-1" autocomplete="off" aria-hidden="true">' +
      '<div id="pn-fb-error" role="alert" hidden></div>' +
      '<button id="pn-fb-send" type="submit">Enviar</button>' +
      "</form>" +
      '<div id="pn-fb-ok" role="status" aria-live="polite" hidden><div class="pn-fb-check">' +
      '<svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" aria-hidden="true">' +
      '<path d="m5 12 5 5L20 7"/></svg></div><p>Feedback enviado. Obrigada por ajudar a melhorar o PsicNota.</p>' +
      '<button id="pn-fb-fechar-ok" type="button">Fechar</button></div>';

    document.body.appendChild(botao);
    document.body.appendChild(painel);

    var campo = painel.querySelector("#pn-fb-msg");
    var contato = painel.querySelector("#pn-fb-contact");
    var erro = painel.querySelector("#pn-fb-error");
    var formulario = painel.querySelector("#pn-fb-form");
    var enviar = painel.querySelector("#pn-fb-send");
    var sucesso = painel.querySelector("#pn-fb-ok");
    var campoArquivos = painel.querySelector("#pn-fb-files");
    var listaArquivos = painel.querySelector("#pn-fb-files-list");
    var arquivos = [];

    function tamanhoLegivel(bytes) {
      return bytes >= 1048576 ? (bytes / 1048576).toFixed(1) + " MB" : Math.max(1, Math.round(bytes / 1024)) + " KB";
    }

    function renderizarArquivos() {
      listaArquivos.innerHTML = "";
      arquivos.forEach(function (arquivo, indice) {
        var chip = document.createElement("div");
        chip.className = "pn-fb-chip";
        var nome = document.createElement("span");
        nome.textContent = arquivo.name + " (" + tamanhoLegivel(arquivo.size) + ")";
        var remover = document.createElement("button");
        remover.type = "button";
        remover.setAttribute("aria-label", "Remover anexo");
        remover.textContent = "\u00d7";
        remover.addEventListener("click", function () {
          arquivos.splice(indice, 1);
          renderizarArquivos();
        });
        chip.appendChild(nome);
        chip.appendChild(remover);
        listaArquivos.appendChild(chip);
      });
    }

    function limparArquivos() {
      arquivos = [];
      campoArquivos.value = "";
      renderizarArquivos();
    }

    campoArquivos.addEventListener("change", function () {
      erro.hidden = true;
      var novos = Array.prototype.slice.call(campoArquivos.files || []);
      campoArquivos.value = "";
      for (var i = 0; i < novos.length; i++) {
        var arquivo = novos[i];
        var tipoOk = arquivo.type.indexOf("image/") === 0 || arquivo.type === "application/pdf";
        if (!tipoOk) {
          erro.textContent = "Envie apenas imagem ou PDF.";
          erro.hidden = false;
          return;
        }
        if (arquivo.size > 3 * 1024 * 1024) {
          erro.textContent = "Cada anexo pode ter no máximo 3 MB.";
          erro.hidden = false;
          return;
        }
        if (arquivos.length >= 3) {
          erro.textContent = "Máximo de 3 anexos.";
          erro.hidden = false;
          return;
        }
        arquivos.push(arquivo);
      }
      renderizarArquivos();
    });

    function abrir() {
      painel.hidden = false;
      botao.setAttribute("aria-expanded", "true");
      window.setTimeout(function () {
        campo.focus();
      }, 30);
    }

    function fechar() {
      painel.hidden = true;
      botao.setAttribute("aria-expanded", "false");
    }

    function resetar() {
      formulario.hidden = false;
      sucesso.hidden = true;
      erro.hidden = true;
      enviar.disabled = false;
      enviar.textContent = "Enviar";
      formulario.reset();
      limparArquivos();
    }

    botao.addEventListener("click", function () {
      if (painel.hidden) {
        resetar();
        abrir();
      } else {
        fechar();
      }
    });

    painel.querySelector("#pn-fb-close").addEventListener("click", fechar);
    painel.querySelector("#pn-fb-fechar-ok").addEventListener("click", fechar);

    document.addEventListener("keydown", function (evento) {
      if (evento.key === "Escape" && !painel.hidden) fechar();
    });

    document.addEventListener("click", function (evento) {
      if (painel.hidden) return;
      if (painel.contains(evento.target) || botao.contains(evento.target)) return;
      fechar();
    });

    formulario.addEventListener("submit", function (evento) {
      evento.preventDefault();
      var mensagem = campo.value.trim();
      erro.hidden = true;

      if (mensagem.length < 3) {
        erro.textContent = "Escreva pelo menos 3 caracteres.";
        erro.hidden = false;
        campo.focus();
        return;
      }

      enviar.disabled = true;
      enviar.textContent = "Enviando...";

      var controle = new AbortController();
      var limite = window.setTimeout(function () {
        controle.abort();
      }, 30000);

      var dados = new FormData();
      dados.append("mensagem", mensagem);
      dados.append("contato", contato.value.trim());
      dados.append("tela", location.pathname);
      dados.append("papel", papelDaTela());
      dados.append("site", painel.querySelector("#pn-fb-site").value);
      arquivos.forEach(function (arquivo) {
        dados.append("anexos", arquivo);
      });

      fetch(ENDPOINT, {
        method: "POST",
        signal: controle.signal,
        body: dados,
      })
        .then(function (resposta) {
          if (resposta.ok) {
            formulario.hidden = true;
            sucesso.hidden = false;
            return;
          }
          throw new Error(resposta.status === 429 ? "rate" : "falha");
        })
        .catch(function (falha) {
          erro.textContent =
            falha && falha.message === "rate"
              ? "Muitos envios em pouco tempo. Aguarde um minuto e tente de novo."
              : "Não foi possível enviar agora. Verifique a conexão e tente novamente.";
          erro.hidden = false;
          enviar.disabled = false;
          enviar.textContent = "Enviar";
        })
        .finally(function () {
          window.clearTimeout(limite);
        });
    });
  }

  function iniciar() {
    if (jaIniciado || !document.body) return;
    jaIniciado = true;
    montarEstilos();
    montarInterface();
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", iniciar);
  } else {
    iniciar();
  }
})();
