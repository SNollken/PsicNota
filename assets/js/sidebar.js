"use strict";

/* Preenche o bloco de perfil do menu lateral com os dados da sessão logada e
   com a foto de perfil real vinda do banco (perfis.avatar_url -> Supabase
   Storage). Roda no evento "load" para aplicar DEPOIS dos scripts de página
   (que substituem o avatar por iniciais), garantindo o avatar correto em
   todas as telas. Vale para as áreas do paciente e do psicólogo.

   A foto do banco é carregada de forma assíncrona: o avatar ilustrado padrão
   aparece na hora (sem "piscar") e é trocado pela foto real quando ela existe.
   Quando a página ainda não carregou o cliente do Supabase, o sidebar.js o
   carrega sob demanda, então a foto aparece em TODAS as telas sem precisar
   editar cada HTML. */
(function () {
  if (window.__psicSidebarLoaded) return;
  window.__psicSidebarLoaded = true;

  const data = window.PsiNoteData;

  // Prefixo dos assets resolvido a partir do próprio sidebar.js, para montar o
  // caminho do supabase-client.js e dos avatares sem depender do HTML.
  const scriptSrc = (document.currentScript && document.currentScript.src) || "";
  const assetsBase = scriptSrc
    ? scriptSrc.slice(0, scriptSrc.lastIndexOf("js/"))
    : "../assets/";
  const SUPABASE_CDN = "https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2";

  function defaultAvatarSrc(isPsychologist) {
    return assetsBase + "img/" + (isPsychologist ? "avatar-psicologo.png" : "avatar-paciente.png");
  }

  function loadScript(src) {
    return new Promise((resolve, reject) => {
      const tag = document.createElement("script");
      tag.src = src;
      tag.onload = resolve;
      tag.onerror = () => reject(new Error("Falha ao carregar " + src));
      document.head.appendChild(tag);
    });
  }

  let clientPromise = null;
  function getSupabaseClient() {
    if (window.PsicNotaSupabase) return Promise.resolve(window.PsicNotaSupabase);
    if (!clientPromise) {
      clientPromise = (async () => {
        if (!window.supabase || typeof window.supabase.createClient !== "function") {
          await loadScript(SUPABASE_CDN);
        }
        if (!window.PsicNotaSupabase) {
          await loadScript(assetsBase + "js/supabase-client.js");
        }
        return window.PsicNotaSupabase || null;
      })().catch(() => null);
    }
    return clientPromise;
  }

  async function fetchProfilePhotoUrl(client) {
    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) return null;

    const { data: profile } = await client
      .from("perfis")
      .select("avatar_url")
      .eq("id", authData.user.id)
      .maybeSingle();
    if (!profile || !profile.avatar_url) return null;

    const { data: signed } = await client.storage
      .from("avatars")
      .createSignedUrl(profile.avatar_url, 3600);
    return (signed && signed.signedUrl) || null;
  }

  function render() {
    const avatarEl = document.querySelector("#psychologistAvatar, #patientAvatar");
    if (!avatarEl) return;

    const isPsychologist = avatarEl.id === "psychologistAvatar";
    const fallbackSrc = defaultAvatarSrc(isPsychologist);

    const session = data ? data.getSession() : null;

    const nameEl = document.querySelector("#psychologistName, #patientNameTop");
    if (nameEl && session) {
      const displayName = session.fullName || session.name;
      if (displayName) nameEl.textContent = displayName;
    }

    // Limpa resquícios do padrão de iniciais (texto/background) dos scripts de página.
    avatarEl.classList.remove("has-photo");
    avatarEl.style.backgroundImage = "";

    let img = avatarEl.querySelector("img");
    if (!img) {
      avatarEl.textContent = "";
      img = document.createElement("img");
      img.alt = "";
      avatarEl.appendChild(img);
    }
    img.src = (session && session.avatarDataUrl) || fallbackSrc;

    // Foto do banco: troca o avatar ilustrado pela foto real do perfil quando existir.
    applyDatabasePhoto(avatarEl);
  }

  async function applyDatabasePhoto(avatarEl) {
    try {
      const client = await getSupabaseClient();
      if (!client) return;
      const photoUrl = await fetchProfilePhotoUrl(client);
      if (!photoUrl || !avatarEl.isConnected) return;

      let currentImg = avatarEl.querySelector("img");
      if (!currentImg) {
        avatarEl.replaceChildren();
        currentImg = document.createElement("img");
        currentImg.alt = "";
        avatarEl.appendChild(currentImg);
      }
      currentImg.src = photoUrl;
      avatarEl.classList.add("has-photo");
    } catch (error) {
      // Sem sessão/Supabase disponível: mantém o avatar ilustrado padrão.
    }
  }

  if (document.readyState === "complete") {
    render();
  } else {
    window.addEventListener("load", render);
  }
})();
