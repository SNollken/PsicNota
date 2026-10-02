"use strict";

(function () {
  function init() {
    const button = document.querySelector('#reportMicrophone');
    const editor = document.querySelector('#freeText');
    const status = document.querySelector('#reportVoiceStatus');
    const review = document.querySelector('#reportVoiceReview');
    const text = document.querySelector('#reportVoiceText');
    const audio = document.querySelector('#reportVoiceAudio');
    const insert = document.querySelector('#reportVoiceInsert');
    const retry = document.querySelector('#reportVoiceRetry');
    const discard = document.querySelector('#reportVoiceDiscard');
    const form = document.querySelector('#reportForm');
    const appointment = document.querySelector('#reportAppointment');
    const dropdown = document.querySelector('#appointmentDropdownBtn');
    const client = window.PsicNotaSupabase;
    const idleMessage = 'Grave uma anotação de até 5 minutos. O áudio será enviado à OpenAI para transcrição.';
    let state = 'idle';
    let recorder = null;
    let stream = null;
    let blob = null;
    let audioUrl = null;
    let range = null;
    let timer = null;
    let generation = 0;
    let requestController = null;
    let recordingStarted = 0;
    const maxBytes = 10 * 1024 * 1024;

    function setState(next, message) {
      state = next;
      status.textContent = message;
      const recording = next === 'recording';
      button.setAttribute('aria-pressed', String(recording));
      const label = recording ? 'Parar gravação e transcrever' : 'Gravar anotação por voz';
      button.setAttribute('aria-label', label);
      button.title = label;
      button.disabled = !['idle', 'recording'].includes(next);
      appointment.disabled = next !== 'idle';
      dropdown.disabled = next !== 'idle';
      insert.hidden = next !== 'review';
      retry.hidden = next !== 'error' || !blob;
      text.hidden = next !== 'review';
      review.querySelector('label').hidden = next !== 'review';
      review.hidden = !blob;
      discard.disabled = next === 'processing';
    }

    function releaseMicrophone() {
      window.clearInterval(timer);
      timer = null;
      stream?.getTracks().forEach(track => track.stop());
      stream = null;
    }

    function reset(message = idleMessage) {
      generation += 1;
      requestController?.abort();
      if (recorder && recorder.state !== 'inactive') recorder.stop();
      recorder = null;
      releaseMicrophone();
      blob = null;
      range = null;
      audio.pause();
      audio.removeAttribute('src');
      if (audioUrl) URL.revokeObjectURL(audioUrl);
      audioUrl = null;
      text.value = '';
      setState('idle', message);
    }

    async function invoke(options) {
      const { data, error } = await client.functions.invoke('transcribe-report', options);
      if (error) {
        let message = 'Não foi possível acessar a transcrição. Tente novamente.';
        if (error.context instanceof Response) {
          try { message = (await error.context.json()).error || message; } catch { /* No JSON response. */ }
        }
        throw new Error(message);
      }
      return data;
    }

    async function transcribe(id) {
      setState('processing', 'Transcrevendo sua anotação…');
      const controller = new AbortController();
      requestController = controller;
      const timeout = window.setTimeout(() => controller.abort(), 100000);
      try {
        const result = await invoke({ body: blob, headers: { 'Content-Type': blob.type }, signal: controller.signal });
        if (id !== generation) return;
        if (typeof result?.text !== 'string' || !result.text.trim()) throw new Error('Nenhuma fala foi reconhecida. Grave novamente.');
        text.value = result.text;
        setState('review', 'Transcrição pronta. Confira o texto antes de inserir.');
        text.focus();
      } catch (error) {
        if (id === generation) setState('error', `${error.message} A gravação continua disponível nesta tela.`);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    async function start() {
      const id = ++generation;
      const selection = window.getSelection();
      range = selection.rangeCount && editor.contains(selection.getRangeAt(0).commonAncestorContainer)
        ? selection.getRangeAt(0).cloneRange() : null;
      setState('checking', 'Verificando o serviço de transcrição…');
      const controller = new AbortController();
      requestController = controller;
      const timeout = window.setTimeout(() => controller.abort(), 15000);
      try {
        await invoke({ method: 'GET', signal: controller.signal });
        if (id !== generation) return;
        setState('requesting', 'Permita o acesso ao microfone para começar.');
        const acquired = await navigator.mediaDevices.getUserMedia({ audio: true });
        if (id !== generation) { acquired.getTracks().forEach(track => track.stop()); return; }
        stream = acquired;
        const mimeType = ['audio/webm;codecs=opus', 'audio/mp4'].find(type => MediaRecorder.isTypeSupported(type));
        if (!mimeType) throw new Error('Este navegador não oferece um formato de gravação compatível. Use Chrome, Edge ou Safari atualizado.');
        const recording = new MediaRecorder(stream, { mimeType, audioBitsPerSecond: 64000 });
        recorder = recording;
        const chunks = [];
        let size = 0;
        recording.addEventListener('dataavailable', event => {
          if (event.data.size) { chunks.push(event.data); size += event.data.size; }
          if (size > maxBytes && recording.state === 'recording') recording.stop();
        });
        recording.addEventListener('error', () => {
          if (id === generation) reset('A gravação foi interrompida. Verifique o microfone e tente novamente.');
        });
        recording.addEventListener('stop', () => {
          if (id !== generation) return;
          releaseMicrophone();
          blob = new Blob(chunks, { type: mimeType.split(';')[0] });
          if (!blob.size || blob.size > maxBytes) {
            reset(blob.size ? 'O áudio excede 10 MB. Grave uma anotação mais curta.' : 'Nenhum áudio foi capturado. Tente novamente.');
            return;
          }
          audioUrl = URL.createObjectURL(blob);
          audio.src = audioUrl;
          void transcribe(id);
        });
        recorder.start(1000);
        recordingStarted = Date.now();
        setState('recording', 'Gravando 00:00. Clique no microfone para parar e transcrever.');
        timer = window.setInterval(() => {
          const seconds = Math.floor((Date.now() - recordingStarted) / 1000);
          if (seconds >= 300) { stop(); return; }
          status.textContent = `Gravando ${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(seconds % 60).padStart(2, '0')}. Clique no microfone para parar e transcrever.`;
        }, 1000);
      } catch (error) {
        if (id !== generation) return;
        const message = error.name === 'NotAllowedError' ? 'Acesso ao microfone negado. Permita o acesso nas configurações do navegador.'
          : error.name === 'NotFoundError' ? 'Nenhum microfone encontrado. Conecte um microfone e tente novamente.' : error.message;
        reset(message);
      } finally {
        window.clearTimeout(timeout);
      }
    }

    function stop() {
      if (state !== 'recording') return;
      window.clearInterval(timer);
      setState('processing', 'Finalizando gravação…');
      recorder.stop();
    }

    button.addEventListener('mousedown', event => event.preventDefault());
    button.addEventListener('click', () => { if (state === 'recording') stop(); else if (state === 'idle') void start(); });
    retry.addEventListener('click', () => void transcribe(generation));
    discard.addEventListener('click', () => reset());
    insert.addEventListener('click', () => {
      const transcript = text.value.trim();
      if (!transcript) { status.textContent = 'A transcrição está vazia. Digite o texto ou descarte a gravação.'; return; }
      editor.focus();
      const selection = window.getSelection();
      if (!range || !editor.contains(range.commonAncestorContainer)) {
        range = document.createRange();
        range.selectNodeContents(editor);
        range.collapse(false);
      }
      selection.removeAllRanges();
      selection.addRange(range);
      const prefix = range.collapsed && editor.innerText && !/\s$/.test(range.startContainer.textContent.slice(0, range.startOffset)) ? ' ' : '';
      if (!document.execCommand('insertText', false, prefix + transcript + ' ')) {
        range.deleteContents();
        const node = document.createTextNode(prefix + transcript + ' ');
        range.insertNode(node);
        range.setStartAfter(node);
        range.collapse(true);
        selection.removeAllRanges();
        selection.addRange(range);
      }
      editor.dispatchEvent(new Event('input', { bubbles: true }));
      reset('Transcrição inserida. Você pode editar o texto e salvar o relatório.');
    });
    form.addEventListener('submit', event => {
      if (state === 'idle') return;
      event.preventDefault();
      event.stopImmediatePropagation();
      status.textContent = state === 'recording' ? 'Pare a gravação antes de salvar o relatório.' : 'Insira a transcrição ou descarte a gravação antes de salvar.';
    }, true);
    window.addEventListener('pagehide', () => reset());
    document.addEventListener('visibilitychange', () => { if (document.hidden && state === 'recording') stop(); });
    if (!window.isSecureContext || !navigator.mediaDevices?.getUserMedia || !window.MediaRecorder || !client) {
      setState('unsupported', 'Gravação indisponível. Abra o site por HTTPS em um navegador com suporte a microfone.');
      appointment.disabled = false;
      dropdown.disabled = false;
      state = 'idle';
    }
  }
  window.PsiReportVoice = { init };
}());
