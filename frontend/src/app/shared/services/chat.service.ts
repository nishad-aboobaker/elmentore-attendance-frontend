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
  ) {
    // Keep connection alive globally across pages when logged in
    this.authService.currentUser$.subscribe(user => {
      if (user) {
        this.connect();
      } else {
        this.disconnect();
      }
    });
  }

  // Fetch initial history
  getGlobalMessages(limit: number = 50): Observable<GroupMessage[]> {
    return this.http.get<GroupMessage[]>(`${this.apiUrl}/messages?limit=${limit}`);
  }
  
  setInitialMessages(messages: GroupMessage[]) {
    const currentMessages = this.messagesSubject.getValue();
    
    // Merge history and any real-time messages received in the background (avoiding duplicates)
    const map = new Map<string, GroupMessage>();
    messages.forEach(m => { if (m._id) map.set(m._id, m); });
    currentMessages.forEach(m => { if (m._id) map.set(m._id, m); });
    
    const merged = Array.from(map.values()).sort((a, b) => {
      return new Date(a.createdAt || 0).getTime() - new Date(b.createdAt || 0).getTime();
    });
    
    this.messagesSubject.next(merged);
  }

  // Connect to Socket.IO Server
  connect() {
    if (this.socket) {
      return; // Already connected or connecting
    }
    
    const socketUrl = environment.socketUrl || window.location.origin;
    const token = this.authService.getAccessToken();
    
    if (!token) return;

    this.socket = io(socketUrl, {
      auth: { token },
      transports: ['polling', 'websocket'], // Allow falling back to polling if WebSocket upgrade is blocked
      reconnectionAttempts: 10,
      reconnectionDelay: 2000
    });

    this.socket.on('connect', () => {
      console.log('Connected to Chat server');
      
      // On reconnect, fetch latest messages to recover any missed messages
      this.getGlobalMessages(50).subscribe({
        next: (msgs) => this.setInitialMessages(msgs),
        error: (err) => console.error('Failed to sync chat history on reconnect', err)
      });
    });

    this.socket.on('receiveGroupMessage', (message: GroupMessage) => {
      const currentMessages = this.messagesSubject.getValue();
      if (!currentMessages.some(m => m._id === message._id)) {
        this.messagesSubject.next([...currentMessages, message]);
        this.onNewMessage.next(message);
      }
    });
    
    this.socket.on('connect_error', (err) => {
      console.error('Socket connection error:', err);
    });
  }

  sendGroupMessage(content: string) {
    if (this.socket && this.socket.connected) {
      this.socket.emit('sendGroupMessage', { content });
    } else {
      console.error('Cannot send message, socket not connected. Reconnecting...');
      this.connect();
    }
  }

  disconnect() {
    if (this.socket) {
      this.socket.disconnect();
      this.socket = undefined;
    }
  }
}
