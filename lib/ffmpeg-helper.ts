// ffmpeg-helper.ts retained for history. MP3 conversion now uses server-side API /api/encode
export async function wavToMp3(_: Blob): Promise<Blob> {
  throw new Error('wavToMp3 is deprecated. Server-side API at /api/encode is used instead.')
}
