import fs from 'fs'
import path from 'path'
import { NextResponse } from 'next/server'


export async function POST(req: Request) {
  try {
    const formData = await req.formData()
    const file = formData.get('file') as File | null
    if (!file) return new Response('No file provided', { status: 400 })

    const arrayBuf = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuf)

    const tmpDir = process.env.TMPDIR || '/tmp'
    const id = Date.now().toString()
    // Optionally, send buffer to an external wav-to-mp3 API here
    // Example placeholder:
    // const mp3Buffer = await convertWavToMp3(buffer);
    // return new Response(mp3Buffer, { ... });

    // For now, just return the original wav file
    return new Response(buffer, {
      status: 200,
      headers: {
        'Content-Type': 'audio/wav',
        'Content-Disposition': 'attachment; filename="audio.wav"',
      },
    })
  } catch (err) {
    console.error('[Raz] server encode error:', err)
    return new Response('Encoding failed', { status: 500 })
  }
}
