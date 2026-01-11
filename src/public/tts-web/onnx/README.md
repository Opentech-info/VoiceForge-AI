# ONNX Voice Models

This directory contains neural TTS voice models for Piper Web TTS.

## Required Files (Not in Git)

The following ONNX models are required but **not tracked in git** due to their size (~120MB total):

### English (US)

- `en_US-lessac-high.onnx` (22MB)
- `en_US-hfc_female-medium.onnx`
- `en_US-john-medium.onnx`
- `en_US-libritts_r-medium.onnx`
- `en_US-sam-medium.onnx`

### English (UK)

- `en_GB-cori-high.onnx` (22MB)
- `en_GB-alan-medium.onnx`
- `en_GB-alba-medium.onnx`
- `en_GB-aru-medium.onnx`
- `en_GB-jenny_dioco-medium.onnx`

### Other Languages

- `de_DE-mls-medium.onnx` (German)
- `es_ES-davefx-medium.onnx` (Spanish)
- `fr_FR-gilles-low.onnx` (French)
- `sw_CD-lanfrica-medium.onnx` (Swahili)
- `zh_CN-huayan-medium.onnx` (Chinese)

## How to Get Models

These models should be downloaded separately or included in your mobile app bundle (not pushed to git).

For local development, ensure these files exist in this directory before running the app.

## Files Tracked in Git

Only essential runtime files are tracked:

- `ort-wasm-simd-threaded.wasm` - ONNX Runtime WASM
- `ort-wasm-simd-threaded.jsep.wasm` - ONNX Runtime with WebGPU support
