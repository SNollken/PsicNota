"use strict";

(function () {
  let worker = null;
  let sequence = 0;
  let epoch = 0;
  const pending = new Map();
  const workerURL = new URL('relatorio-voz-worker.js', document.currentScript.src);

  function cancel() {
    epoch += 1;
    worker?.terminate();
    worker = null;
    pending.forEach(({ reject }) => reject(new DOMException('Processamento cancelado.', 'AbortError')));
    pending.clear();
  }

  function getWorker() {
    if (worker) return worker;
    worker = new Worker(workerURL, { type: 'module' });
    worker.onmessage = ({ data }) => {
      const job = pending.get(data.id);
      if (!job) return;
      if (data.progress) { job.onProgress?.(data.progress); return; }
      pending.delete(data.id);
      if (data.error) job.reject(new Error(data.error));
      else job.resolve(data);
    };
    worker.onerror = () => {
      pending.forEach(({ reject }) => reject(new Error('O modelo local não pôde iniciar. Confira o suporte do navegador e tente novamente.')));
      pending.clear();
      worker?.terminate();
      worker = null;
    };
    return worker;
  }

  function request(action, samples, onProgress) {
    return new Promise((resolve, reject) => {
      const id = ++sequence;
      pending.set(id, { resolve, reject, onProgress });
      try { getWorker().postMessage({ id, action, samples }, samples ? [samples.buffer] : []); }
      catch (error) { pending.delete(id); reject(error); }
    });
  }

  async function decode(blob) {
    const context = new OfflineAudioContext(1, 1, 16000);
    const decoded = await context.decodeAudioData(await blob.arrayBuffer());
    const samples = new Float32Array(decoded.length);
    for (let channel = 0; channel < decoded.numberOfChannels; channel += 1) {
      const source = decoded.getChannelData(channel);
      for (let i = 0; i < samples.length; i += 1) samples[i] += source[i] / decoded.numberOfChannels;
    }
    return samples;
  }

  async function transcribe(blob, onProgress) {
    const currentEpoch = epoch;
    await request('prepare', null, onProgress);
    const samples = await decode(blob);
    if (currentEpoch !== epoch) throw new DOMException('Processamento cancelado.', 'AbortError');
    return request('transcribe', samples, onProgress);
  }

  window.PsiLocalTranscription = { prepare: onProgress => request('prepare', null, onProgress), transcribe, cancel };
  window.addEventListener('pagehide', cancel);
}());