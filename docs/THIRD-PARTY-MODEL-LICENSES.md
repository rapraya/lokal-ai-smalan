# Third-party model licenses

This document records model licenses and attribution notices for model files that may be downloaded by Lokal AI in the browser. Model weights are not bundled in this repository.

## Indonesian text-to-speech — experimental

**Upstream model:** [facebook/mms-tts-ind](https://huggingface.co/facebook/mms-tts-ind)  
**ONNX conversion used by Audio Lab:** [payam1394/traxlate-mms-tts-ind](https://huggingface.co/payam1394/traxlate-mms-tts-ind)  
**License declared by the converted model:** [Creative Commons Attribution-NonCommercial 4.0 International (CC BY-NC 4.0)](https://creativecommons.org/licenses/by-nc/4.0/)

The ONNX conversion is attributed to payam1394 and is based on Meta's Indonesian MMS-TTS checkpoint. The model card states that the CC BY-NC 4.0 license is inherited from the MMS release. The quantized ONNX weight file is approximately 38.3 MB; additional configuration/tokenizer files and the Transformers.js runtime are downloaded separately when the user chooses to load the model.

### Required use conditions

- **Noncommercial only.** Do not use this model for commercial purposes under this license. A commercial deployment requires separate permission or a different model with a suitable license.
- **Attribution.** Credit the upstream MMS Indonesian model by Meta and the ONNX conversion by payam1394, link to the license, and indicate any changes made to the model or conversion.
- **No endorsement.** Attribution must not imply that Meta, payam1394, or the model authors endorse SMALAN or Lokal AI.
- **License review.** The application checkbox records that the user has acknowledged these conditions; it does not determine whether a specific institutional activity is legally noncommercial. The project owner must review the intended use before enabling this model in any deployed environment.

Suggested attribution:

> Indonesian MMS-TTS model by Meta (facebook/mms-tts-ind), ONNX conversion by payam1394 (traxlate-mms-tts-ind). Licensed under CC BY-NC 4.0. Used through a browser-local Transformers.js integration.

### Implementation notes

Audio Lab loads the q8 model through Transformers.js 4.3.2 in a dedicated WebAssembly worker. The conversion model card says it was exported using Transformers.js 3.8.1, so runtime compatibility is experimental until tested on actual supported browsers and hardware. The current automated tests mock the Transformers.js pipeline; they verify UI gating, worker lifecycle, waveform handoff, WAV encoding, and cancellation, but they do not validate model pronunciation, inference quality, speed, or real memory usage.

The model and runtime are downloaded only after explicit user action. User text is processed in the browser and is not submitted to a cloud inference endpoint.
