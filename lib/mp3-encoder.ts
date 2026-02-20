// This file provides a function to encode AudioBuffer to MP3 using lamejs
// Usage: encodeMp3(audioBuffer: AudioBuffer) => Promise<Blob>

// Use dynamic import to avoid Next.js SSR issues and ensure MPEGMode is defined

let Mp3Encoder: any = null

async function getMp3Encoder() {
  if (!Mp3Encoder) {
    const lamejs = await import('lamejs')
    Mp3Encoder = lamejs.Mp3Encoder
  }
  return Mp3Encoder
}

export async function encodeMp3(buffer: AudioBuffer): Promise<Blob> {
  const Mp3Encoder = await getMp3Encoder()
  const numChannels = buffer.numberOfChannels
  const sampleRate = buffer.sampleRate
  const mp3Encoder = new Mp3Encoder(numChannels, sampleRate, 128)
  const samples = buffer.getChannelData(0)
  const mp3Data: Uint8Array[] = []
  const samplesPerFrame = 1152

  let remaining = samples.length
  let pointer = 0
  while (remaining >= samplesPerFrame) {
    const left = buffer.getChannelData(0).subarray(pointer, pointer + samplesPerFrame)
    const right = numChannels > 1 ? buffer.getChannelData(1).subarray(pointer, pointer + samplesPerFrame) : left
    const mp3buf = mp3Encoder.encodeBuffer(floatTo16BitPCM(left), floatTo16BitPCM(right))
    if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf))
    pointer += samplesPerFrame
    remaining -= samplesPerFrame
  }
  const mp3buf = mp3Encoder.flush()
  if (mp3buf.length > 0) mp3Data.push(new Uint8Array(mp3buf))
  return new Blob(mp3Data, { type: 'audio/mp3' })
}

function floatTo16BitPCM(input: Float32Array): Int16Array {
  const output = new Int16Array(input.length)
  for (let i = 0; i < input.length; i++) {
    let s = Math.max(-1, Math.min(1, input[i]))
    output[i] = s < 0 ? s * 0x8000 : s * 0x7FFF
  }
  return output
}
