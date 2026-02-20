// ffmpeg-helper.ts: Utility to convert WAV (ArrayBuffer/Blob) to MP3 using ffmpeg.wasm
export async function wavToMp3(wavBlob: Blob): Promise<Blob> {
  if (typeof window === 'undefined') {
    throw new Error('wavToMp3 can only run in the browser')
  }

  // Use CDN-hosted core to avoid bundler/runtime mismatch in server builds
  const CORE_VERSION = '0.12.10'
  const corePath = `https://unpkg.com/@ffmpeg/core@${CORE_VERSION}/dist/ffmpeg-core.js`

  try {
    const ffmpegModule: any = await import('@ffmpeg/ffmpeg')
    const createFFmpeg = ffmpegModule.createFFmpeg
    const fetchFile = ffmpegModule.fetchFile

    if (typeof createFFmpeg !== 'function' || typeof fetchFile !== 'function') {
      throw new Error('FFmpeg imports missing (createFFmpeg/fetchFile). Ensure @ffmpeg/ffmpeg is installed and loaded in the browser.')
    }

    const ffmpeg = createFFmpeg({ log: false, corePath })
    if (!ffmpeg.isLoaded()) {
      await ffmpeg.load()
    }

    const inputData = await fetchFile(wavBlob)
    ffmpeg.FS('writeFile', 'input.wav', inputData)
    await ffmpeg.run('-i', 'input.wav', '-codec:a', 'libmp3lame', '-q:a', '2', 'output.mp3')
    const data = ffmpeg.FS('readFile', 'output.mp3')
    return new Blob([data.buffer], { type: 'audio/mp3' })
  } catch (err) {
    console.error('[Raz] ffmpeg convert error:', err)
    throw err
  }
}
