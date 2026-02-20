// ffmpeg-helper.ts: Utility to convert WAV (ArrayBuffer/Blob) to MP3 using ffmpeg.wasm
export async function wavToMp3(wavBlob: Blob): Promise<Blob> {
  // Dynamically import ffmpeg.wasm only in the browser
  const { createFFmpeg, fetchFile } = await import('@ffmpeg/ffmpeg');
  const ffmpeg = createFFmpeg({ log: false });
  if (!ffmpeg.isLoaded()) {
    await ffmpeg.load();
  }
  ffmpeg.FS('writeFile', 'input.wav', await fetchFile(wavBlob));
  await ffmpeg.run('-i', 'input.wav', '-codec:a', 'libmp3lame', '-q:a', '2', 'output.mp3');
  const data = ffmpeg.FS('readFile', 'output.mp3');
  return new Blob([data.buffer], { type: 'audio/mp3' });
}
