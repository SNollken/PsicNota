"use strict";

(function () {
  async function openAccount(user, remember = true) {
    const client = window.PsicNotaSupabase;
    const { data: profile, error } = await client.from("perfis")
      .select("id, papel, nome_completo, nome_social, email")
      .eq("id", user.id).single();
    if (error || !profile || !["psicologo", "paciente"].includes(profile.papel)) {
      window.PsiNoteData.clearSession();
      await client.auth.signOut();
      throw new Error("Não foi possível carregar seu perfil. Tente entrar novamente.");
    }
    if (profile.papel === "psicologo") {
      const { data: professional, error: professionalError } = await client
        .from("dados_psicologo").select("perfil_id")
        .eq("perfil_id", user.id).single();
      if (professionalError || !professional) {
        window.PsiNoteData.clearSession();
        await client.auth.signOut();
        throw new Error("Seu cadastro profissional está incompleto. Entre em contato com o suporte.");
      }
    }
    window.PsiNoteData.setSession({
      id: profile.id,
      role: profile.papel,
      name: profile.nome_social || profile.nome_completo,
      fullName: profile.nome_completo,
      email: profile.email,
      loggedAt: new Date().toISOString()
    }, remember);
    return profile.papel === "psicologo" ? "../psicologo/home.html" : "../paciente/home.html";
  }

  async function resolveProfile(user) {
    const client = window.PsicNotaSupabase;
    if (!client || !user?.id) return { exists: false, profile: null };
    const { data: profile } = await client.from("perfis")
      .select("id, papel, nome_completo, nome_social, email")
      .eq("id", user.id).maybeSingle();
    if (!profile || !["psicologo", "paciente"].includes(profile.papel)) {
      return { exists: false, profile: null };
    }
    return { exists: true, profile };
  }

  async function signInWithGoogle(options = {}) {
    const client = window.PsicNotaSupabase;
    if (!client?.auth?.signInWithOAuth) {
      throw new Error("Serviço de autenticação indisponível.");
    }
    const redirectTo = options.redirectTo || window.location.href;
    // ponytail: scopes básicos de perfil e email do google; expandir se precisar de calendar/drive
    return client.auth.signInWithOAuth({
      provider: "google",
      options: {
        redirectTo,
        queryParams: {
          prompt: "select_account"
        }
      }
    });
  }

  async function completeOAuthRegistration(payload) {
    const client = window.PsicNotaSupabase;
    if (!client?.rpc) throw new Error("Serviço de cadastro indisponível.");
    const { data, error } = await client.rpc("concluir_cadastro_oauth", payload);
    if (error) throw error;
    return data;
  }

  window.PsicNotaAuth = {
    openAccount,
    resolveProfile,
    signInWithGoogle,
    completeOAuthRegistration
  };
}());
