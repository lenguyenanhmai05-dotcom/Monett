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

  // ─── NHÓM TRÒ CHUYỆN (GROUPS) ───

  @Post('groups')
  async createGroup(
    @Req() req,
    @Body('name') name: string,
    @Body('icon') icon: string,
    @Body('memberIds') memberIds: string[],
  ) {
    const creatorId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    const creatorName = req.user?.fullName || req.user?.username || req.user?.email || 'Bạn bè';
    const creatorAvatar = req.user?.avatarUrl || null;

    const group = await this.messagesService.createGroup(creatorId, name, icon, memberIds);

    // Phát sự kiện realtime tới TẤT CẢ các thành viên trong nhóm
    if (this.messagesGateway?.server) {
      group.memberIds.forEach((mId: string) => {
        // Gửi sự kiện để ứng dụng của bạn bè tự động thêm nhóm vào danh sách tin nhắn
        this.messagesGateway.server.to(`user_${mId}`).emit('group_created', group);

        // Gửi thông báo chuông cho các thành viên khác
        if (mId !== creatorId) {
          this.messagesGateway.server.to(`user_${mId}`).emit('moment_notification', {
            momentId: `group_${group.id}`,
            commenterName: creatorName,
            commenterAvatar: creatorAvatar,
            text: `đã thêm bạn vào nhóm "${group.name}" 👥`,
            type: 'group_invite',
            groupId: group.id,
            groupName: group.name,
          });
        }
      });
    }

    return group;
  }

  @Get('groups')
  async getGroups(@Req() req) {
    const userId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    return this.messagesService.getGroups(userId);
  }

  @Get('groups/:groupId/messages')
  async getGroupMessages(@Req() req, @Param('groupId') groupId: string) {
    return this.messagesService.getGroupMessages(groupId);
  }

  @Post('groups/:groupId/messages')
  async sendGroupMessage(
    @Req() req,
    @Param('groupId') groupId: string,
    @Body('text') text: string,
    @Body('imageUrl') imageUrl?: string,
    @Body('billData') billData?: any,
  ) {
    const senderId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    const senderName = req.user?.fullName || req.user?.username || req.user?.email || 'Bạn bè';
    const senderAvatar = req.user?.avatarUrl || null;

    const savedMsg = await this.messagesService.sendMessage(
      senderId,
      undefined,
      text,
      billData ? 'bill' : 'text',
      billData,
      imageUrl,
      groupId,
      senderName,
      senderAvatar,
    );

    const group = await this.messagesService.getGroupById(groupId);
    const messagePayload = {
      _id: savedMsg._id.toString(),
      sender: senderId,
      groupId,
      text: text || '',
      type: billData ? 'bill' : 'text',
      imageUrl,
      bill: billData,
      senderName,
      senderAvatar,
      createdAt: (savedMsg as any).createdAt || new Date().toISOString(),
    };

    if (this.messagesGateway?.server && group) {
      const memberIds = group.memberIds.map((id: any) => id.toString());
      memberIds.forEach((mId: string) => {
        // Gửi tin nhắn realtime cho các thành viên trong nhóm
        this.messagesGateway.server.to(`user_${mId}`).emit('receive_group_message', messagePayload);

        // Gửi thông báo chuông cho các thành viên khác
        if (mId !== senderId) {
          this.messagesGateway.server.to(`user_${mId}`).emit('moment_notification', {
            momentId: `group_${groupId}`,
            commenterName: senderName,
            commenterAvatar: senderAvatar,
            text: text || (imageUrl ? 'Đã gửi một hình ảnh 📷' : (billData ? 'Đã tạo chia bill 🧾' : '')),
            type: 'group_message',
            groupId,
            groupName: group.name,
          });
        }
      });
    }

    return savedMsg;
  }

  @Get(':friendId')
  async getMessages(@Req() req, @Param('friendId') friendId: string) {
    const userId = req.user?._id?.toString() || req.user?.id || req.user?.sub;
    return this.messagesService.getMessages(userId, friendId);
  }
}

