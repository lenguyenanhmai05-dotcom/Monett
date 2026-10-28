import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';
import { ChatGroup, ChatGroupDocument } from './schemas/chat-group.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
    @InjectModel(ChatGroup.name) private chatGroupModel: Model<ChatGroupDocument>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async sendMessage(
    senderId: string,
    receiverId?: string,
    text?: string,
    type: string = 'text',
    billData?: any,
    imageUrl?: string,
    groupId?: string,
    senderName?: string,
    senderAvatar?: string,
  ) {
    const msgData: any = {
      sender: new Types.ObjectId(senderId),
      text: text || '',
      type,
      billData,
      imageUrl,
      senderName,
      senderAvatar,
    };

    if (receiverId) {
      try {
        msgData.receiver = new Types.ObjectId(receiverId);
      } catch {}
    }

    if (groupId) {
      msgData.groupId = groupId;
      // Cập nhật tin nhắn gần nhất của nhóm
      try {
        const gObjId = new Types.ObjectId(groupId);
        await this.chatGroupModel.findByIdAndUpdate(gObjId, {
          lastMessage: text || (imageUrl ? '[Hình ảnh]' : (billData ? '[Chia bill]' : '')),
          lastMessageAt: new Date(),
        });
      } catch {}
    }

    const newMessage = new this.messageModel(msgData);
    return newMessage.save();
  }

  async getMessages(userId: string, friendId: string) {
    let userObjId: Types.ObjectId;
    let friendObjId: Types.ObjectId;
    try {
      userObjId = new Types.ObjectId(userId);
      friendObjId = new Types.ObjectId(friendId);
    } catch {
      return [];
    }

    return this.messageModel
      .find({
        $or: [
          { sender: userObjId, receiver: friendObjId },
          { sender: friendObjId, receiver: userObjId },
        ],
      })
      .sort({ createdAt: 1 })
      .exec();
  }

  // ─── NHÓM TRÒ CHUYỆN (GROUPS) ───

  async createGroup(
    creatorId: string,
    name: string,
    icon: string = 'users',
    selectedFriendIds: string[] = [],
  ) {
    if (!name || !name.trim()) {
      throw new BadRequestException('Tên nhóm không được để trống');
    }

    const allMemberIdsStr = Array.from(new Set([creatorId, ...selectedFriendIds.filter(Boolean)]));
    const allMemberObjIds = allMemberIdsStr.map((id) => new Types.ObjectId(id));

    // Lấy thông tin chi tiết các thành viên
    const users = await this.userModel.find({ _id: { $in: allMemberObjIds } }, 'fullName email avatarUrl');
    const membersList = users.map((u) => ({
      id: u._id.toString(),
      name: u.fullName || u.email || 'Thành viên',
      avatar: u.avatarUrl || null,
    }));

    const newGroup = new this.chatGroupModel({
      name: name.trim(),
      icon: icon || 'users',
      createdBy: new Types.ObjectId(creatorId),
      memberIds: allMemberObjIds,
      members: membersList,
      isGroup: true,
      lastMessage: 'Nhóm đã được tạo thành công! 🎉',
      lastMessageAt: new Date(),
    });

    const saved = await newGroup.save();
    return {
      id: saved._id.toString(),
      _id: saved._id.toString(),
      name: saved.name,
      icon: saved.icon,
      memberIds: saved.memberIds.map((id) => id.toString()),
      members: saved.members,
      createdBy: saved.createdBy.toString(),
      isGroup: true,
      lastMessage: saved.lastMessage,
      createdAt: (saved as any).createdAt || new Date().toISOString(),
    };
  }

  async getGroups(userId: string) {
    let userObjId: Types.ObjectId;
    try {
      userObjId = new Types.ObjectId(userId);
    } catch {
      return [];
    }

    const groups = await this.chatGroupModel
      .find({ memberIds: userObjId })
      .sort({ updatedAt: -1 })
      .exec();

    return groups.map((g) => ({
      id: g._id.toString(),
      _id: g._id.toString(),
      name: g.name,
      icon: g.icon,
      memberIds: g.memberIds.map((id) => id.toString()),
      members: g.members,
      createdBy: g.createdBy.toString(),
      isGroup: true,
      lastMessage: g.lastMessage,
      createdAt: (g as any).createdAt || (g as any).updatedAt || new Date().toISOString(),
    }));
  }

  async getGroupById(groupId: string) {
    try {
      const gObjId = new Types.ObjectId(groupId);
      return this.chatGroupModel.findById(gObjId).exec();
    } catch {
      return null;
    }
  }

  async getGroupMessages(groupId: string) {
    return this.messageModel
      .find({ groupId })
      .sort({ createdAt: 1 })
      .exec();
  }
}

