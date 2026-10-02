import { env, pipeline } from '../../vendor/transformers/transformers.min.js';

// Network is used only to download pinned model weights/configuration, never audio.
env.allowLocalModels = false;
env.useBrowserCache = true;
env.backends.onnx.wasm.numThreads = 1;
env.backends.onnx.wasm.proxy = false;
env.backends.onnx.wasm.wasmPaths = new URL('../../vendor/transformers/', import.meta.url).href;
const MODEL = 'Xenova/whisper-small';
const REVISION = '2d67713f236afa48a18992566e7647f6ca848e13';
let transcriber = null;

self.onmessage = async ({ data }) => {
  const { id, action, samples } = data;
  try {
    if (!transcriber) {
      transcriber = await pipeline('automatic-speech-recognition', MODEL, {
        revision: REVISION, device: 'wasm', dtype: 'q8',
        progress_callback: progress => self.postMessage({ id, progress }),
      });
    }
    if (action === 'prepare') {
      self.postMessage({ id, ready: true });
      return;
    }
    const result = await transcriber(samples, {
      language: 'portuguese', task: 'transcribe', chunk_length_s: 30, stride_length_s: 5,
    });
    self.postMessage({ id, text: result.text });
  } catch {
    self.postMessage({ id, error: 'Não foi possível carregar ou executar o modelo local. Confira espaço disponível e conexão para o primeiro download; tente novamente.' });
  }
};