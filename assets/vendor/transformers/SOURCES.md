# Runtime de transcrição local

- Transformers.js 3.8.1: https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js — licença Apache-2.0 em LICENSE.
- ONNX Runtime Web 1.22.0-dev.20250409-89f8206ba4: arquivos ort-wasm-simd-threaded.jsep.mjs e .wasm da distribuição npm onnxruntime-web/dist. Licença MIT em LICENSE-onnxruntime (texto do repositório Microsoft, tag v1.21.0).
- O bundle Transformers.js também inclui ONNX Runtime Common (MIT, mesma licença Microsoft) e Hugging Face Jinja (Apache-2.0).
- Pesos do modelo não fazem parte deste Git: Xenova/whisper-small, revisão 2d67713f236afa48a18992566e7647f6ca848e13, obtidos por GET do Hugging Face e armazenados no cache do navegador.
- A execução usa WASM com uma thread em worker local. Nenhum serviço de transcrição remoto é utilizado.

## SHA-256 dos artefatos
- ort-wasm-simd-threaded.jsep.mjs: 08fb86ec433c78bfb032c5d84a68b8e8e5a8d81268fa39e24314179a5767a5b9
- ort-wasm-simd-threaded.jsep.wasm: c46655e8a94afc45338d4cb2b840475f88e5012d524509916e505079c00bfa39
- transformers.min.js: aa5002b70e789798da263f5f99c62bd3e8fcd0c119258a493c40c180648365fa
