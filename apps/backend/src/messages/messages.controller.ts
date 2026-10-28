import { Controller, Post, Body, UseGuards, Req, Get, Param, Optional } from '@nestjs/common';
import { MessagesService } from './messages.service';
import { MessagesGateway } from './messages.gateway';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@Controller('api/messages')
@UseGuards(JwtAuthGuard)
export class MessagesController {
  constructor(
    private readonly messagesService: MessagesService,
    @Optional() private readonly messagesGateway?: MessagesGateway,
  ) {}

  @Post()
  async sendMessage(
    @Req() req,
    @Body('receiverId') receiverId: string,
    @Body('text') text: string,
    @Body('imageUrl') imageUrl?: string,
  ) {
    const senderId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    const savedMsg = await this.messagesService.sendMessage(
      senderId,
      receiverId,
      text,
      'text',
      undefined,
      imageUrl,
    );

    const senderName = req.user?.fullName || req.user?.username || req.user?.email || 'Bạn bè';
    const senderAvatar = req.user?.avatarUrl || null;

    const messagePayload = {
      _id: savedMsg._id.toString(),
      sender: senderId,
      receiver: receiverId,
      text,
      type: 'text',
      imageUrl,
      senderName,
      senderAvatar,
      createdAt: (savedMsg as any).createdAt || new Date().toISOString(),
    };

    if (this.messagesGateway?.server) {
      this.messagesGateway.server.to(`user_${receiverId}`).emit('receive_message', messagePayload);
      this.messagesGateway.server.to(`user_${senderId}`).emit('message_sent', messagePayload);
    }

    return savedMsg;
  }

  @Get(':friendId')
  async getMessages(@Req() req, @Param('friendId') friendId: string) {
    const userId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    return this.messagesService.getMessages(userId, friendId);
  }
}
