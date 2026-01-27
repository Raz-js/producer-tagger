"use client"

import type React from "react"

import { useState, useRef } from "react"
import { Card } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Slider } from "@/components/ui/slider"
import { Upload, Music, Volume2, Download, Play, Pause, Loader2 } from "lucide-react"

export default function AudioWatermarker() {
  const [mainAudio, setMainAudio] = useState<File | null>(null)
  const [watermarkAudio, setWatermarkAudio] = useState<File | null>(null)
  const [watermarkInterval, setWatermarkInterval] = useState(12)
  const [watermarkVolume, setWatermarkVolume] = useState(75)
  const [processing, setProcessing] = useState(false)
  const [watermarkedBlob, setWatermarkedBlob] = useState<Blob | null>(null)
  const [isPlaying, setIsPlaying] = useState(false)
  const [previewType, setPreviewType] = useState<"original" | "watermarked">("original")

  const audioRef = useRef<HTMLAudioElement>(null)
  const mainInputRef = useRef<HTMLInputElement>(null)
  const watermarkInputRef = useRef<HTMLInputElement>(null)

  const handleMainAudioUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setMainAudio(file)
      setWatermarkedBlob(null)
    }
  }

  const handleWatermarkUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (file) {
      setWatermarkAudio(file)
      setWatermarkedBlob(null)
    }
  }

  const processAudio = async () => {
    if (!mainAudio || !watermarkAudio) return

    setProcessing(true)
    try {
      // Check if AudioContext is suspended (requires user interaction)
      const audioContext = new AudioContext()
      if (audioContext.state === 'suspended') {
        // Resume AudioContext - this requires user interaction
        await audioContext.resume()
      }

      // Load main audio
      const mainArrayBuffer = await mainAudio.arrayBuffer()
      const mainAudioBuffer = await audioContext.decodeAudioData(mainArrayBuffer)

      // Load watermark audio
      const watermarkArrayBuffer = await watermarkAudio.arrayBuffer()
      const watermarkAudioBuffer = await audioContext.decodeAudioData(watermarkArrayBuffer)

      // Calculate output length
      const sampleRate = mainAudioBuffer.sampleRate
      const mainDuration = mainAudioBuffer.duration
      const watermarkDuration = watermarkAudioBuffer.duration
      const intervalSeconds = watermarkInterval

      // Create output buffer
      const outputBuffer = audioContext.createBuffer(
        mainAudioBuffer.numberOfChannels,
        mainAudioBuffer.length,
        sampleRate,
      )

      // Copy main audio to output
      for (let channel = 0; channel < mainAudioBuffer.numberOfChannels; channel++) {
        const mainData = mainAudioBuffer.getChannelData(channel)
        const outputData = outputBuffer.getChannelData(channel)
        outputData.set(mainData)
      }

      // Add watermarks at intervals
      const volumeMultiplier = watermarkVolume / 100
      let currentTime = 0

      while (currentTime < mainDuration) {
        const startSample = Math.floor(currentTime * sampleRate)
        const watermarkSamples = watermarkAudioBuffer.length

        // Mix watermark into output
        for (
          let channel = 0;
          channel < Math.min(outputBuffer.numberOfChannels, watermarkAudioBuffer.numberOfChannels);
          channel++
        ) {
          const outputData = outputBuffer.getChannelData(channel)
          const watermarkData = watermarkAudioBuffer.getChannelData(
            Math.min(channel, watermarkAudioBuffer.numberOfChannels - 1),
          )

          for (let i = 0; i < watermarkSamples && startSample + i < outputBuffer.length; i++) {
            outputData[startSample + i] += watermarkData[i] * volumeMultiplier

            // Prevent clipping
            if (outputData[startSample + i] > 1) outputData[startSample + i] = 1
            if (outputData[startSample + i] < -1) outputData[startSample + i] = -1
          }
        }

        currentTime += intervalSeconds
      }

      // Convert to WAV
      const wavBlob = audioBufferToWav(outputBuffer)
      setWatermarkedBlob(wavBlob)
      setPreviewType("watermarked")
    } catch (error) {
      console.error("[v0] Error processing audio:", error)
      alert("Error processing audio. Please try different files.")
    } finally {
      setProcessing(false)
    }
  }

  const audioBufferToWav = (buffer: AudioBuffer): Blob => {
    const numberOfChannels = buffer.numberOfChannels
    const length = buffer.length * numberOfChannels * 2
    const arrayBuffer = new ArrayBuffer(44 + length)
    const view = new DataView(arrayBuffer)

    // WAV header
    const writeString = (offset: number, string: string) => {
      for (let i = 0; i < string.length; i++) {
        view.setUint8(offset + i, string.charCodeAt(i))
      }
    }

    writeString(0, "RIFF")
    view.setUint32(4, 36 + length, true)
    writeString(8, "WAVE")
    writeString(12, "fmt ")
    view.setUint32(16, 16, true)
    view.setUint16(20, 1, true)
    view.setUint16(22, numberOfChannels, true)
    view.setUint32(24, buffer.sampleRate, true)
    view.setUint32(28, buffer.sampleRate * numberOfChannels * 2, true)
    view.setUint16(32, numberOfChannels * 2, true)
    view.setUint16(34, 16, true)
    writeString(36, "data")
    view.setUint32(40, length, true)

    // Write audio data
    const channels = []
    for (let i = 0; i < numberOfChannels; i++) {
      channels.push(buffer.getChannelData(i))
    }

    let offset = 44
    for (let i = 0; i < buffer.length; i++) {
      for (let channel = 0; channel < numberOfChannels; channel++) {
        const sample = Math.max(-1, Math.min(1, channels[channel][i]))
        view.setInt16(offset, sample < 0 ? sample * 0x8000 : sample * 0x7fff, true)
        offset += 2
      }
    }

    return new Blob([arrayBuffer], { type: "audio/wav" })
  }

  const downloadWatermarked = () => {
    if (!watermarkedBlob) return

    const url = URL.createObjectURL(watermarkedBlob)
    const a = document.createElement("a")
    a.href = url
    a.download = `watermarked_${mainAudio?.name || "audio"}.wav`
    a.click()
    URL.revokeObjectURL(url)
  }

  const togglePlayback = () => {
    if (!audioRef.current) return

    try {
      if (isPlaying) {
        audioRef.current.pause()
      } else {
        audioRef.current.play().catch(error => {
          console.error('Playback error:', error)
          alert('Unable to play audio. Please check the file format.')
        })
      }
      setIsPlaying(!isPlaying)
    } catch (error) {
      console.error('Playback error:', error)
    }
  }

  const handleAudioEnded = () => {
    setIsPlaying(false)
  }

  const getPreviewUrl = () => {
    if (previewType === "watermarked" && watermarkedBlob) {
      return URL.createObjectURL(watermarkedBlob)
    } else if (mainAudio) {
      return URL.createObjectURL(mainAudio)
    }
    return ""
  }

  return (
    <div className="min-h-screen flex flex-col">
      {/* Header */}
      <header className="border-b border-border blood-background blood-card">
        <div className="container mx-auto px-4 py-6">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary">
              <Music className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h1 className="text-2xl font-bold tracking-tight text-foreground">Beat Watermarker</h1>
              <p className="text-sm text-muted-foreground">Professional audio watermarking tool 𒀭 Raz</p>
            </div>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 container mx-auto px-4 py-8">
        <div className="grid gap-6 lg:grid-cols-2">
          {/* Upload Section */}
          <div className="space-y-6">
            {/* Main Audio Upload */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Main Audio File</Label>
                  <p className="text-sm text-muted-foreground">Upload your beat or audio track</p>
                </div>

                <input
                  ref={mainInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleMainAudioUpload}
                  className="hidden"
                />

                <button
                  onClick={() => mainInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors hover:bg-muted hover:border-primary"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Upload className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        {mainAudio ? mainAudio.name : "Click to upload main audio"}
                      </p>
                      <p className="text-sm text-muted-foreground">Supports MP3, WAV, OGG, and more</p>
                    </div>
                  </div>
                </button>
              </div>
            </Card>

            {/* Watermark Upload */}
            <Card className="p-6">
              <div className="space-y-4">
                <div>
                  <Label className="text-base font-semibold">Watermark Audio</Label>
                  <p className="text-sm text-muted-foreground">Upload your watermark tag (keep it short)</p>
                </div>

                <input
                  ref={watermarkInputRef}
                  type="file"
                  accept="audio/*"
                  onChange={handleWatermarkUpload}
                  className="hidden"
                />

                <button
                  onClick={() => watermarkInputRef.current?.click()}
                  className="w-full rounded-lg border-2 border-dashed border-border bg-muted/50 p-8 transition-colors hover:bg-muted hover:border-primary"
                >
                  <div className="flex flex-col items-center gap-2">
                    <Volume2 className="h-8 w-8 text-muted-foreground" />
                    <div className="text-center">
                      <p className="font-medium text-foreground">
                        {watermarkAudio ? watermarkAudio.name : "Click to upload watermark"}
                      </p>
                      <p className="text-sm text-muted-foreground">Short audio tag or voice clip</p>
                    </div>
                  </div>
                </button>
              </div>
            </Card>
          </div>

          {/* Settings & Preview Section */}
          <div className="space-y-6">
            {/* Settings */}
            <Card className="p-6">
              <div className="space-y-6">
                <div>
                  <Label className="text-base font-semibold">Watermark Settings</Label>
                  <p className="text-sm text-muted-foreground">Adjust spacing and volume</p>
                </div>

                {/* Interval Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Interval (seconds)</Label>
                    <span className="text-sm font-mono text-muted-foreground">{watermarkInterval}s</span>
                  </div>
                  <Slider
                    value={[watermarkInterval]}
                    onValueChange={(value) => setWatermarkInterval(value[0])}
                    min={5}
                    max={60}
                    step={1}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">How often the watermark repeats</p>
                </div>

                {/* Volume Slider */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <Label className="text-sm font-medium">Watermark Volume</Label>
                    <span className="text-sm font-mono text-muted-foreground">{watermarkVolume}%</span>
                  </div>
                  <Slider
                    value={[watermarkVolume]}
                    onValueChange={(value) => setWatermarkVolume(value[0])}
                    min={10}
                    max={100}
                    step={5}
                    className="w-full"
                  />
                  <p className="text-xs text-muted-foreground">Balance between audible and subtle</p>
                </div>

                {/* Process Button */}
                <Button
                  onClick={processAudio}
                  disabled={!mainAudio || !watermarkAudio || processing}
                  className="w-full"
                  size="lg"
                >
                  {processing ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Processing...
                    </>
                  ) : (
                    "Apply Watermark"
                  )}
                </Button>
              </div>
            </Card>

            {/* Preview & Download */}
            {(mainAudio || watermarkedBlob) && (
              <Card className="p-6">
                <div className="space-y-4">
                  <div>
                    <Label className="text-base font-semibold">Preview & Download</Label>
                    <p className="text-sm text-muted-foreground">
                      {watermarkedBlob ? "Watermarked audio ready" : "Original audio loaded"}
                    </p>
                  </div>

                  {/* Preview Toggle */}
                  {watermarkedBlob && (
                    <div className="flex gap-2">
                      <Button
                        variant={previewType === "original" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewType("original")}
                        className="flex-1"
                      >
                        Original
                      </Button>
                      <Button
                        variant={previewType === "watermarked" ? "default" : "outline"}
                        size="sm"
                        onClick={() => setPreviewType("watermarked")}
                        className="flex-1"
                      >
                        Watermarked
                      </Button>
                    </div>
                  )}

                  {/* Audio Player */}
                  <div className="rounded-lg bg-muted p-4">
                    <audio 
                      ref={audioRef} 
                      src={getPreviewUrl()} 
                      onEnded={handleAudioEnded} 
                      controls
                      className="w-full"
                      onError={(e) => {
                        console.error('Audio loading error:', e)
                        alert('Error loading audio. Please check the file format.')
                      }}
                    />

                  </div>

                  {/* Download Button */}
                  {watermarkedBlob && (
                    <Button onClick={downloadWatermarked} variant="outline" className="w-full bg-transparent" size="lg">
                      <Download className="mr-2 h-4 w-4" />
                      Download Watermarked Audio
                    </Button>
                  )}
                </div>
              </Card>
            )}
          </div>
        </div>

        {/* Info Section */}
        <Card className="mt-8 p-6 bg-accent/50">
          <div className="space-y-2">
            <h3 className="font-semibold text-foreground">How it works</h3>
            <ul className="space-y-1 text-sm text-muted-foreground">
              <li>• Upload your main beat and a short watermark audio clip</li>
              <li>• Adjust the interval to control how often the watermark appears</li>
              <li>• Set the volume to balance protection with listenability</li>
              <li>• The watermark will be mixed throughout the entire track</li>
              <li>• Download the watermarked version as a WAV file</li>
            </ul>
          </div>
        </Card>
      </div>
    </div>
  )
}
