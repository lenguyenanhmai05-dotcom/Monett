import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friendship } from './schemas/friendship.schema';
import { User, UserDocument } from '../users/schemas/user.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<Friendship>,
    @InjectModel(User.name) private userModel: Model<UserDocument>,
  ) {}

  async sendFriendRequest(requesterId: string, recipientInput: string) {
    if (!recipientInput || !recipientInput.trim()) {
      throw new BadRequestException('Vui lòng nhập ID bạn bè');
    }

    const cleanedInput = recipientInput.trim().replace(/^#/, '');

    // 1. Tìm người dùng nhận lời mời (Recipient) theo Short ID (6 ký tự) hoặc ObjectId hoặc Email
    let recipientUser: UserDocument | null = null;

    // Tìm theo 6 ký tự Short ID (không phân biệt hoa thường)
    if (cleanedInput.length === 6) {
      recipientUser = await this.userModel.findOne({
        shortId: { $regex: new RegExp(`^${cleanedInput}$`, 'i') },
      }).exec();
    }

    // Nếu không khớp shortId 6 ký tự, thử tìm theo MongoDB ObjectId
    if (!recipientUser && Types.ObjectId.isValid(cleanedInput)) {
      recipientUser = await this.userModel.findById(cleanedInput).exec();
    }

    // Nếu người dùng nhập email
    if (!recipientUser && cleanedInput.includes('@')) {
      recipientUser = await this.userModel.findOne({
        email: cleanedInput.toLowerCase(),
      }).exec();
    }

    if (!recipientUser) {
      throw new NotFoundException('Không tìm thấy người dùng với mã ID này. Vui lòng kiểm tra lại!');
    }

    const recipientId = recipientUser._id.toString();

    if (requesterId === recipientId) {

      throw new BadRequestException('Không thể tự gửi lời mời kết bạn cho chính mình');
    }

    const requesterObjId = new Types.ObjectId(requesterId);
    const recipientObjId = recipientUser._id as Types.ObjectId;

    // Check if request already exists
    const existing = await this.friendshipModel.findOne({
      $or: [
        { requester: requesterObjId, recipient: recipientObjId },
        { requester: recipientObjId, recipient: requesterObjId },
      ],
    });

    if (existing) {
      if (existing.status === 'accepted') {
        throw new BadRequestException('Hai bạn đã là bạn bè rồi! ✨');
      }

      if (existing.status === 'pending') {
        if (existing.requester.toString() === requesterId) {
          throw new BadRequestException('Bạn đã gửi lời mời kết bạn trước đó rồi, đang chờ đối phương đồng ý nhé! ⏳');
        } else {
          // Đối phương đã gửi lời mời trước đó -> Khi bạn kết bạn lại, tự động chấp nhận thành công!
          existing.status = 'accepted';
          await existing.save();
          return {
            message: 'Đối phương đã gửi lời mời trước đó, hai bạn đã trở thành bạn bè! 🎉',
            status: 'accepted',
            friendship: existing,
          };
        }
      }

      if (existing.status === 'rejected') {
        existing.requester = requesterObjId;
        existing.recipient = recipientObjId;
        existing.status = 'pending';
        return existing.save();
      }
    }

    const newRequest = new this.friendshipModel({
      requester: requesterObjId,
      recipient: recipientObjId,
      status: 'pending',
    });

    return newRequest.save();
  }

  async respondToRequest(requestId: string, recipientId: string, status: 'accepted' | 'rejected') {
    const request = await this.friendshipModel.findById(requestId);
    if (!request) throw new NotFoundException('Request not found');

    if (request.recipient.toString() !== recipientId) {
      throw new BadRequestException('You can only respond to your own requests');
    }

    if (request.status !== 'pending') {
      throw new BadRequestException('Request is already processed');
    }

    request.status = status;
    return request.save();
  }

  async getPendingRequests(userId: string) {
    const userObjId = new Types.ObjectId(userId);
    return this.friendshipModel
      .find({ recipient: userObjId, status: 'pending' })
      .populate('requester', 'fullName email avatarUrl');
  }

  async getFriends(userId: string) {
    const userObjId = new Types.ObjectId(userId);
    const friendships = await this.friendshipModel
      .find({
        $or: [{ requester: userObjId }, { recipient: userObjId }],
        status: 'accepted',
      })
      .populate('requester', 'fullName email avatarUrl streak lastActiveDate lastActiveAt updatedAt')
      .populate('recipient', 'fullName email avatarUrl streak lastActiveDate lastActiveAt updatedAt');

    // Extract the actual friend object
    return friendships.map((f) => {
      const isRequester = f.requester._id.toString() === userId;
      return isRequester ? f.recipient : f.requester;
    });
  }

  async removeFriend(userId: string, friendId: string) {
    const userObjId = new Types.ObjectId(userId);
    const friendObjId = new Types.ObjectId(friendId);
    
    const result = await this.friendshipModel.findOneAndDelete({
      $or: [
        { requester: userObjId, recipient: friendObjId },
        { requester: friendObjId, recipient: userObjId },
      ],
    });

    if (!result) {
      throw new NotFoundException('Không tìm thấy mối quan hệ bạn bè hoặc lời mời');
    }
    return { success: true, message: 'Đã hủy kết bạn / xóa lời mời thành công' };
  }
}
