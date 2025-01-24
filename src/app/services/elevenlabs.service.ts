import { Injectable } from '@angular/core';
import { Conversation } from '@11labs/client';
import { environment } from 'src/environments/environment';

@Injectable({
  providedIn: 'root',
})
export class ElevenLabsService {
  private conversation: Conversation | null = null;

  constructor() {}

  async startConversation(): Promise<void> {
    const agentId = environment.agentId;
    const apiKey = environment.apiKey;

    try {
      // Solicitar permiso para el micrófono
      await navigator.mediaDevices.getUserMedia({ audio: true });

      // Iniciar sesión de conversación directamente con el Agent ID y API Key
      this.conversation = await Conversation.startSession({
        agentId,
        overrides: {},
        authorization: apiKey,
        onMessage: (message) => {
          console.log('Mensaje recibido:', message);
        },
        onError: (error) => {
          console.error('Error en la conversación:', error);
        },
        onConnect: () => {
          console.log('Conexión establecida');
        },
        onDisconnect: () => {
          console.log('Conexión terminada');
        },
      });

      console.log('Sesión de conversación iniciada');
    } catch (error) {
      console.error('Error al iniciar la conversación:', error);
    }
  }

  async endConversation(): Promise<void> {
    if (this.conversation) {
      await this.conversation.endSession();
      console.log('Sesión de conversación finalizada');
      this.conversation = null;
    }
  }
}
