import { Injectable } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Message, MessageDocument } from './schemas/message.schema';

@Injectable()
export class MessagesService {
  constructor(
    @InjectModel(Message.name) private messageModel: Model<MessageDocument>,
  ) {}

  async sendMessage(
    senderId: string,
    receiverId: string,
    text: string,
    type: string = 'text',
    billData?: any,
  ) {
    const newMessage = new this.messageModel({
      sender: new Types.ObjectId(senderId),
      receiver: new Types.ObjectId(receiverId),
      text,
      type,
      billData,
    });
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
}
