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

  window.PsicNotaAuth = { openAccount };
}());
