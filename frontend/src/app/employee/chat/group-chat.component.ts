import { Component, OnInit, OnDestroy, ViewChild, ElementRef, AfterViewChecked } from '@angular/core';
import { ChatService } from '../../shared/services/chat.service';
import { AuthService } from '../../shared/services/auth.service';
import { GroupMessage } from '../../shared/models/chat.model';
import { Subscription } from 'rxjs';

@Component({
  selector: 'app-group-chat',
  templateUrl: './group-chat.component.html',
  styleUrls: ['./group-chat.component.css']
})
export class GroupChatComponent implements OnInit, OnDestroy, AfterViewChecked {
  @ViewChild('scrollMe') private myScrollContainer!: ElementRef;
  
  messages: GroupMessage[] = [];
  newMessage: string = '';
  currentUserId: string = '';
  
  private subs: Subscription = new Subscription();
  private autoScrollEnabled: boolean = true;

  constructor(
    private chatService: ChatService,
    public authService: AuthService
  ) {}

  ngOnInit(): void {
    // Get current user details
    this.subs.add(this.authService.currentUser$.subscribe(user => {
      if (user) this.currentUserId = user._id;
    }));

    // Fetch initial chat history
    this.chatService.getGlobalMessages(50).subscribe({
      next: (msgs) => {
        this.chatService.setInitialMessages(msgs);
        this.scrollToBottom();
      },
      error: (err) => console.error('Failed to load chat history', err)
    });

    // Connect WebSocket
    this.chatService.connect();

    // Listen to message updates
    this.subs.add(this.chatService.messages$.subscribe(msgs => {
      this.messages = msgs;
    }));
    
    // Auto scroll down when new message arrives
    this.subs.add(this.chatService.onNewMessage.subscribe(() => {
      this.autoScrollEnabled = true; // force scroll on new message
    }));
  }

  ngAfterViewChecked() {
    if (this.autoScrollEnabled) {
      this.scrollToBottom();
      this.autoScrollEnabled = false; // reset after scrolling
    }
  }

  sendMessage(): void {
    if (!this.newMessage.trim()) return;
    this.chatService.sendGroupMessage(this.newMessage.trim());
    this.newMessage = '';
    this.autoScrollEnabled = true;
  }

  scrollToBottom(): void {
    try {
      if (this.myScrollContainer) {
        this.myScrollContainer.nativeElement.scrollTop = this.myScrollContainer.nativeElement.scrollHeight;
      }
    } catch(err) { }
  }

  ngOnDestroy(): void {
    this.subs.unsubscribe();
    this.chatService.disconnect();
  }
}
