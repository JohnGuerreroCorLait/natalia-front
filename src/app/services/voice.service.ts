import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';

@Injectable({
  providedIn: 'root',
})
export class VoiceService {
  private apiUrl = 'http://localhost:8000/process-audio/'; // URL del backend FastAPI

  constructor(private http: HttpClient) {}

  sendAudio(file: Blob) {
    const formData = new FormData();
    formData.append('file', file, 'audio.wav');
    return this.http.post(this.apiUrl, formData, { responseType: 'json' });
  }
}
