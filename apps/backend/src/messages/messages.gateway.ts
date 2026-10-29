import {
  WebSocketGateway,
  WebSocketServer,
  SubscribeMessage,
  OnGatewayConnection,
  OnGatewayDisconnect,
  ConnectedSocket,
  MessageBody,
} from '@nestjs/websockets';
import { Server, Socket } from 'socket.io';
import { JwtService } from '@nestjs/jwt';
import { ConfigService } from '@nestjs/config';
import { MessagesService } from './messages.service';

@WebSocketGateway({
  cors: {
    origin: true,
    credentials: true,
  },
})
export class MessagesGateway implements OnGatewayConnection, OnGatewayDisconnect {
  @WebSocketServer()
  server: Server;

  // Map userId -> Set of active socket IDs
  private onlineUsers = new Map<string, Set<string>>();
  // Map socketId -> userId
  private socketToUser = new Map<string, string>();

  constructor(
    private readonly messagesService: MessagesService,
    private readonly jwtService: JwtService,
    private readonly configService: ConfigService,
  ) {}

  async handleConnection(client: Socket) {
    try {
      const rawToken =
        client.handshake.auth?.token ||
        (typeof client.handshake.headers?.authorization === 'string'
          ? client.handshake.headers.authorization.replace('Bearer ', '')
          : null) ||
        (client.handshake.query?.token as string);

      if (!rawToken || typeof rawToken !== 'string') {
        client.disconnect();
        return;
      }

      const token = rawToken.trim().replace(/^Bearer\s+/i, '');
      const secret = this.configService.get<string>(
        'JWT_SECRET',
        'monett_super_secret_jwt_key_2026_finance_moments',
      );
      const payload = this.jwtService.verify(token, { secret });
      const userId = payload.sub || payload.id || payload._id;

      if (!userId) {
        client.disconnect();
        return;
      }

      const userIdStr = String(userId);
      this.socketToUser.set(client.id, userIdStr);

      if (!this.onlineUsers.has(userIdStr)) {
        this.onlineUsers.set(userIdStr, new Set());
      }
      this.onlineUsers.get(userIdStr)!.add(client.id);

      // Join room by userId
      client.join(`user_${userIdStr}`);

      // Broadcast user online status to all connected users
      this.server.emit('user_status', {
        userId: userIdStr,
        isOnline: true,
      });

      // Send the current list of online user IDs to the connected user
      const onlineList = Array.from(this.onlineUsers.keys());
      client.emit('initial_online_users', onlineList);
      console.log(`[Socket] ✅ User connected: ${userIdStr} (Socket ID: ${client.id})`);
    } catch (err: any) {
      console.warn('[Socket Gateway] ⚠️ Connection rejected:', err?.message || err);
      client.disconnect();
    }
  }

  handleDisconnect(client: Socket) {
    const userId = this.socketToUser.get(client.id);
    if (userId) {
      this.socketToUser.delete(client.id);
      const sockets = this.onlineUsers.get(userId);
      if (sockets) {
        sockets.delete(client.id);
        if (sockets.size === 0) {
          this.onlineUsers.delete(userId);
          // Broadcast user offline status to all clients
          this.server.emit('user_status', {
            userId,
            isOnline: false,
          });
        }
      }
    }
  }

  @SubscribeMessage('send_message')
  async handleSendMessage(
    @ConnectedSocket() client: Socket,
    @MessageBody()
    data: {
      receiverId: string;
      text: string;
      type?: string;
      billData?: any;
      bill?: any;
      imageUrl?: string;
    },
  ) {
    const senderId = this.socketToUser.get(client.id);
    if (!senderId || !data?.receiverId || !data?.text) {
      return { success: false, message: 'Invalid data' };
    }

    const finalBillData = data.billData || data.bill;
    const msgType = data.type || (finalBillData ? 'bill_split' : 'text');
    const senderInfo = await this.messagesService.getUserBasicInfo(senderId);

    const savedMsg = await this.messagesService.sendMessage(
      senderId,
      data.receiverId,
      data.text,
      msgType,
      finalBillData,
      data.imageUrl,
      undefined,
      senderInfo.name,
      senderInfo.avatar,
      finalBillData,
    );

    const messagePayload = {
      _id: savedMsg._id.toString(),
      sender: senderId,
      receiver: data.receiverId,
      text: data.text,
      type: msgType,
      billData: finalBillData,
      bill: finalBillData,
      imageUrl: data.imageUrl,
      senderName: senderInfo.name,
      senderAvatar: senderInfo.avatar,
      createdAt: (savedMsg as any).createdAt || new Date().toISOString(),
    };

    // Emit to recipient's room
    this.server.to(`user_${data.receiverId}`).emit('receive_message', messagePayload);

    // Emit to sender's room (so all tabs/devices of sender see it)
    this.server.to(`user_${senderId}`).emit('message_sent', messagePayload);

    // Phát thông báo chuông cho người nhận
    this.server.to(`user_${data.receiverId}`).emit('moment_notification', {
      type: 'message',
      senderId,
      commenterName: senderInfo.name,
      commenterAvatar: senderInfo.avatar,
      text: data.text || (data.imageUrl ? 'Đã gửi một hình ảnh 📷' : (finalBillData ? 'Đã tạo chia bill 🧾' : 'Đã gửi cho bạn một tin nhắn')),
      momentId: `msg_${savedMsg._id}`,
      billData: finalBillData,
      bill: finalBillData,
    });

    return { success: true, data: messagePayload };
  }

  @SubscribeMessage('typing')
  handleTyping(
    @ConnectedSocket() client: Socket,
    @MessageBody() data: { receiverId: string; isTyping: boolean },
  ) {
    const senderId = this.socketToUser.get(client.id);
    if (!senderId || !data?.receiverId) return;

    this.server.to(`user_${data.receiverId}`).emit('user_typing', {
      senderId,
      isTyping: !!data.isTyping,
    });
  }

  @SubscribeMessage('get_online_users')
  handleGetOnlineUsers(@ConnectedSocket() client: Socket) {
    const onlineList = Array.from(this.onlineUsers.keys());
    client.emit('initial_online_users', onlineList);
  }
}
