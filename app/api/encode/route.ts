import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'
import ffmpeg from 'fluent-ffmpeg'
import ffmpegPath from 'ffmpeg-static'

export const runtime = 'nodejs'

ffmpeg.setFfmpegPath(ffmpegPath as string)

export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return new Response('No file provided', { status: 400 })

    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const tmpDir = process.env.TMPDIR || '/tmp'
    const id = Date.now().toString()
    const inPath = path.join(tmpDir, `input-${id}.wav`)
    const outPath = path.join(tmpDir, `output-${id}.mp3`)

    await fs.promises.writeFile(inPath, buffer)

    await new Promise<void>((resolve, reject) => {
      ffmpeg(inPath)
        .audioCodec('libmp3lame')
        .audioQuality(2)
        .on('end', () => resolve())
        .on('error', (err: any) => reject(err))
        .save(outPath)
    })

    const outBuffer = await fs.promises.readFile(outPath)

    // cleanup
    ;(async () => {
      try { await fs.promises.unlink(inPath) } catch {};
      try { await fs.promises.unlink(outPath) } catch {};
    })()

    return new Response(outBuffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/mpeg',
        'Content-Disposition': 'attachment; filename="watermarked.mp3"',
      },
    })
  } catch (err) {
    console.error('[Raz] server encode error:', err)
    return new Response('Encoding failed', { status: 500 })
  }
}
