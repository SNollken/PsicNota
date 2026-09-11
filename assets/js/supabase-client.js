"use strict";

(function () {
  const SUPABASE_URL = "https://gjfqslgoplpqeqewytdn.supabase.co";
  const SUPABASE_KEY = "sb_publishable_UxS7h_Kh4zwWB6kEjhJfxQ_T79Q4q5x";

  if (!window.supabase?.createClient) {
    console.error("Não foi possível carregar o cliente do Supabase.");
    return;
  }

  window.PsicNotaSupabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_KEY);
}());
