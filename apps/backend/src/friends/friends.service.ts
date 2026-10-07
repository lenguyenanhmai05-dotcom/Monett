import { Injectable, BadRequestException, NotFoundException } from '@nestjs/common';
import { InjectModel } from '@nestjs/mongoose';
import { Model, Types } from 'mongoose';
import { Friendship } from './schemas/friendship.schema';

@Injectable()
export class FriendsService {
  constructor(
    @InjectModel(Friendship.name) private friendshipModel: Model<Friendship>,
  ) {}

  async sendFriendRequest(requesterId: string, recipientId: string) {
    if (requesterId === recipientId) {
      throw new BadRequestException('Cannot send friend request to yourself');
    }

    let requesterObjId: Types.ObjectId;
    let recipientObjId: Types.ObjectId;
    try {
      requesterObjId = new Types.ObjectId(requesterId);
      recipientObjId = new Types.ObjectId(recipientId);
    } catch (e) {
      throw new BadRequestException('ID không hợp lệ - vui lòng dùng ID đầy đủ');
    }

    // Check if request already exists
    const existing = await this.friendshipModel.findOne({
      $or: [
        { requester: requesterObjId, recipient: recipientObjId },
        { requester: recipientObjId, recipient: requesterObjId },
      ],
    });

    if (existing) {
      throw new BadRequestException('Lời mời kết bạn đã tồn tại hoặc hai bạn đã là bạn bè');
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
      .populate('requester', 'fullName email avatarUrl streak lastActiveDate updatedAt')
      .populate('recipient', 'fullName email avatarUrl streak lastActiveDate updatedAt');

    // Extract the actual friend object
    return friendships.map((f) => {
      const isRequester = f.requester._id.toString() === userId;
      return isRequester ? f.recipient : f.requester;
    });
  }
}
