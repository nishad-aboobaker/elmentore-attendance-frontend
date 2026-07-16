import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { environment } from '../../../environments/environment';
import { Observable, BehaviorSubject, Subject } from 'rxjs';
import { io, Socket } from 'socket.io-client';
import { AuthService } from './auth.service';
import { GroupMessage } from '../models/chat.model';

@Injectable({
  providedIn: 'root'
})
export class ChatService {
  private apiUrl = `${environment.apiUrl}/chat`;
  private socket: Socket | undefined;
  
  // Track messages locally
  private messagesSubject = new BehaviorSubject<GroupMessage[]>([]);
  public messages$ = this.messagesSubject.asObservable();
  
  // Event stream for new incoming message (e.g., to scroll to bottom)
  public onNewMessage = new Subject<GroupMessage>();

  constructor(
    private http: HttpClient,
    private authService: AuthService
  ) {}

  // Fetch initial history
  getGlobalMessages(limit: number = 50): Observable<GroupMessage[]> {
    return this.http.get<GroupMessage[]>(`${this.apiUrl}/messages?limit=${limit}`);
  }
  
  setInitialMessages(messages: GroupMessage[]) {
    this.messagesSubject.next(messages);
  }

  // Connect to Socket.IO Server
  connect() {
    if (this.socket) {
      this.socket.disconnect();
    }
    
    // The environment.apiUrl is usually like http://domain/api, socket.io connects to the host root
    // Example: apiUrl: 'http://localhost:3000/api' -> extract 'http://localhost:3000'
    const baseUrl = this.apiUrl.replace('/api/chat', '');
    const token = this.authService.getAccessToken();
    
    if (!token) return;

    this.socket = io(baseUrl, {
      auth: { token }
    });

    this.socket.on('connect', () => {
      console.log('Connected to Chat server');
    });

    this.socket.on('receiveGroupMessage', (message: GroupMessage) => {
      const currentMessages = this.messagesSubject.getValue();
      this.messagesSubject.next([...currentMessages, message]);
      this.onNewMessage.next(message);
    });
    
    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }

  sendGroupMessage(content: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sendGroupMessage', { content });
    } else {
      console.error('Cannot send message, socket not connected');
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
