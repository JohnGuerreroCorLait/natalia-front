import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class TextToSpeechService {

  playAudio(base64Audio: string): void {
    const audio = new Audio(`data:audio/mp3;base64,${base64Audio}`);
    audio.play().catch(error => console.error('Error reproduciendo audio:', error));
  }
}
