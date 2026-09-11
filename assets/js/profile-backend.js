"use strict";

(function () {
  const client = window.PsicNotaSupabase;

  function emptyToNull(value) {
    const normalized = String(value || "").trim();
    return normalized || null;
  }

  async function requireProfile(expectedRole) {
    if (!client) throw new Error("Conexão com o banco indisponível.");

    const { data: authData, error: authError } = await client.auth.getUser();
    if (authError || !authData.user) {
      window.location.replace("../auth/login.html");
      return null;
    }

    const { data: profile, error: profileError } = await client
      .from("perfis")
      .select("*")
      .eq("id", authData.user.id)
      .single();
    if (profileError) throw profileError;

    if (profile.papel !== expectedRole) {
      window.location.replace(profile.papel === "psicologo" ? "../psicologo/perfil.html" : "../paciente/perfil.html");
      return null;
    }

    let professional = null;
    if (expectedRole === "psicologo") {
      const { data, error } = await client
        .from("dados_psicologo")
        .select("*")
        .eq("perfil_id", authData.user.id)
        .single();
      if (error) throw error;
      professional = data;
    }

    let avatarUrl = "";
    if (profile.avatar_url) {
      const { data } = await client.storage.from("avatars").createSignedUrl(profile.avatar_url, 3600);
      avatarUrl = data?.signedUrl || "";
    }

    return { user: authData.user, profile, professional, avatarUrl };
  }

  async function saveProfile(userId, role, values, avatarFile, removeAvatar, currentAvatarPath) {
    let avatarPath = currentAvatarPath || null;

    if (removeAvatar && avatarPath) {
      const { error } = await client.storage.from("avatars").remove([avatarPath]);
      if (error) throw error;
      avatarPath = null;
    }

    if (avatarFile) {
      const extension = (avatarFile.name.split(".").pop() || "jpg").toLowerCase();
      avatarPath = `${userId}/avatar.${extension}`;
      const { error } = await client.storage.from("avatars").upload(avatarPath, avatarFile, {
        cacheControl: "3600",
        contentType: avatarFile.type,
        upsert: true
      });
      if (error) throw error;
    }

    const profileRow = {
      nome_completo: values.fullName,
      nome_social: emptyToNull(values.socialName),
      pronomes: emptyToNull(values.pronoun),
      genero: emptyToNull(values.gender),
      cidade: emptyToNull(values.city),
      estado: emptyToNull(values.state),
      data_nascimento: emptyToNull(values.birthDate),
      telefone: emptyToNull(values.phone),
      email: values.email,
      avatar_url: avatarPath
    };

    if (role === "paciente") {
      Object.assign(profileRow, {
        formato_preferido: emptyToNull(values.preferredFormat),
        periodo_preferido: emptyToNull(values.preferredPeriod),
        lembretes_consulta: values.appointmentReminders,
        notificacoes_email: values.emailNotifications
      });
    }

    const { error: profileError } = await client.from("perfis").update(profileRow).eq("id", userId);
    if (profileError) throw profileError;

    if (role === "psicologo") {
      const { error: professionalError } = await client.from("dados_psicologo").update({
        crp_numero: values.crp,
        crp_uf: values.crpState,
        especialidade: emptyToNull(values.specialty),
        formato_atendimento: values.serviceFormat || "ambos",
        sobre_mim: emptyToNull(values.about),
        abordagem_terapeutica: emptyToNull(values.approach),
        publico_atendido: emptyToNull(values.audience),
        areas_atuacao: values.areas || []
      }).eq("perfil_id", userId);
      if (professionalError) throw professionalError;
    }

    return avatarPath;
  }

  async function avatarUrl(path) {
    if (!path) return "";
    const { data, error } = await client.storage.from("avatars").createSignedUrl(path, 3600);
    if (error) throw error;
    return data?.signedUrl || "";
  }

  window.PsicNotaBackend = { requireProfile, saveProfile, avatarUrl, signOut: () => client.auth.signOut() };
}());
