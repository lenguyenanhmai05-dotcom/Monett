import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';
import * as mongoose from 'mongoose';

export type ChatGroupDocument = ChatGroup & Document;

@Schema({ timestamps: true })
export class ChatGroup {
  @Prop({ required: true })
  name: string;

  @Prop({ default: 'users' })
  icon: string;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  createdBy: Types.ObjectId;

  @Prop({ type: [{ type: mongoose.Schema.Types.ObjectId, ref: 'User' }], default: [] })
  memberIds: Types.ObjectId[];

  @Prop({ type: Array, default: [] })
  members: Array<{ id: string; name: string; avatar?: string }>;

  @Prop({ default: true })
  isGroup: boolean;

  @Prop({ default: '' })
  lastMessage: string;

  @Prop({ default: Date.now })
  lastMessageAt: Date;
}

export const ChatGroupSchema = SchemaFactory.createForClass(ChatGroup);
