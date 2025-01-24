import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ApiService {
  private backendUrl = 'https://agente-voz-production.up.railway.app/api'; // Cambia si el backend usa otro puerto o dominio

  constructor(private http: HttpClient) {}

  getSignedUrl(): Observable<{ signedUrl: string }> {
    return this.http.get<{ signedUrl: string }>(
      `${this.backendUrl}/signed-url`
    );
  }

  getAgentId(): Observable<{ agentId: string }> {
    return this.http.get<{ agentId: string }>(`${this.backendUrl}/getAgentId`);
  }
}
