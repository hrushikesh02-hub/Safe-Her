/**
 * Converts Web Audio API AudioBuffer or Float32Array PCM samples into standard 16-bit PCM WAV Blob
 */
export function audioBufferToWavBlob(audioBuffer: AudioBuffer): Blob {
  const numOfChan = 1; // Mono
  const sampleRate = audioBuffer.sampleRate;
  const channelData = audioBuffer.getChannelData(0);
  const length = channelData.length * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);

  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  // RIFF identifier
  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  // format chunk identifier
  setUint32(0x20746d66); // "fmt "
  setUint32(16); // linear PCM
  setUint16(1); // format 1
  setUint16(numOfChan);
  setUint32(sampleRate);
  setUint32(sampleRate * 2); // Byte rate
  setUint16(2); // Block align
  setUint16(16); // 16-bit samples

  // data chunk identifier
  setUint32(0x61746164); // "data"
  setUint32(channelData.length * 2);

  // Write PCM audio samples
  for (let i = 0; i < channelData.length; i++) {
    const s = Math.max(-1, Math.min(1, channelData[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(pos, int16, true);
    pos += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}

export function pcmSamplesToWavBlob(samples: Float32Array, sampleRate: number = 22050): Blob {
  const length = samples.length * 2 + 44;
  const buffer = new ArrayBuffer(length);
  const view = new DataView(buffer);
  let pos = 0;

  function setUint16(data: number) {
    view.setUint16(pos, data, true);
    pos += 2;
  }
  function setUint32(data: number) {
    view.setUint32(pos, data, true);
    pos += 4;
  }

  setUint32(0x46464952); // "RIFF"
  setUint32(length - 8);
  setUint32(0x45564157); // "WAVE"

  setUint32(0x20746d66); // "fmt "
  setUint32(16);
  setUint16(1);
  setUint16(1);
  setUint32(sampleRate);
  setUint32(sampleRate * 2);
  setUint16(2);
  setUint16(16);

  setUint32(0x61746164); // "data"
  setUint32(samples.length * 2);

  for (let i = 0; i < samples.length; i++) {
    const s = Math.max(-1, Math.min(1, samples[i]));
    const int16 = s < 0 ? s * 0x8000 : s * 0x7fff;
    view.setInt16(pos, int16, true);
    pos += 2;
  }

  return new Blob([buffer], { type: "audio/wav" });
}
