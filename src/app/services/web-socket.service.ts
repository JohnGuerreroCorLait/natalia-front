import { Injectable } from '@angular/core';
import { Subject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class WebSocketService {
  private socket!: WebSocket;
  private messageSubject = new Subject<any>();

  connect(url: string): void {
    this.socket = new WebSocket(url);

    this.socket.onopen = () => console.log('WebSocket conectado');
    this.socket.onmessage = (event) => this.messageSubject.next(JSON.parse(event.data));
    this.socket.onclose = () => console.log('WebSocket desconectado');
  }

  sendMessage(message: string): void {
    if (this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(message);
    }
  }

  getMessages(): Observable<any> {
    return this.messageSubject.asObservable();
  }

  closeConnection(): void {
    if (this.socket) {
      this.socket.close();
    }
  }
}
