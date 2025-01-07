// tts.service.ts
import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root',
})
export class TtsService {
  private audioContext: AudioContext | null = null;

  constructor() {}

  // Método para inicializar o reanudar el contexto de audio después de una interacción de usuario
  public async resumeAudioContext() {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    } else if (this.audioContext.state === 'suspended') {
      await this.audioContext.resume();
    }
  }

  // Método para reproducir el audio
  public async playAudio(audioData: ArrayBuffer) {
    if (!this.audioContext) {
      this.audioContext = new AudioContext();
    }

    try {
      const audioBuffer = await this.audioContext.decodeAudioData(audioData);
      const source = this.audioContext.createBufferSource();
      source.buffer = audioBuffer;
      source.connect(this.audioContext.destination);
      source.start(0);
    } catch (error) {
      console.error('Error al reproducir el audio:', error);
    }
  }

  public async obtenerAudio(texto: string): Promise<void> {
    const response = await fetch('http://localhost:8000/api/generar_audio', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto })
    });

    if (!response.ok) {
      throw new Error(`Error en la solicitud: ${response.status} ${response.statusText}`);
    }

    const { audio } = await response.json(); // Obtén el audio en Base64
    this.reproducirAudio(audio); // Llama a la función para reproducir el audio
  }

  private reproducirAudio(audioBase64: string): void {
    const audio = new Audio(`data:audio/mp3;base64,${audioBase64}`);
    audio.play().catch(error => {
      console.error('Error al reproducir el audio:', error);
      alert('No se pudo reproducir el audio. Asegúrate de que el navegador permite la reproducción automática.');
    });
  }

  // Función para convertir Base64 a ArrayBuffer
  private base64ToArrayBuffer(base64: string): ArrayBuffer {
    const binaryString = window.atob(base64);
    const len = binaryString.length;
    const bytes = new Uint8Array(len);
    for (let i = 0; i < len; i++) {
      bytes[i] = binaryString.charCodeAt(i);
    }
    return bytes.buffer;
  }
}
