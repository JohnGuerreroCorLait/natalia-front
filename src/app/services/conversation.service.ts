import { Injectable } from '@angular/core';
import { Conversation } from '@11labs/client';
import { HttpClient } from '@angular/common/http';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root',
})
export class ConversationService {
  private backendUrl = 'https://agente-voz-production.up.railway.app/api';
  private conversation: Conversation | null = null;

  constructor(private http: HttpClient) {}

  getSignedUrl(): Observable<{ signedUrl: string }> {
    return this.http.get<{ signedUrl: string }>(
      `${this.backendUrl}/signed-url`
    );
  }

  getAgentId(): Observable<{ agentId: string }> {
    return this.http.get<{ agentId: string }>(`${this.backendUrl}/getAgentId`);
  }

  async startConversation(
    signedUrl: string,
    onConnect: () => void,
    onDisconnect: () => void,
    onError: (error: any) => void,
    onModeChange: (mode: any) => void
  ): Promise<void> {
    this.conversation = await Conversation.startSession({
      signedUrl,
      onConnect,
      onDisconnect,
      onError,
      onModeChange,
    });
  }

  async endConversation(): Promise<void> {
    if (this.conversation) {
      await this.conversation.endSession();
      this.conversation = null;
    }
  }
}
