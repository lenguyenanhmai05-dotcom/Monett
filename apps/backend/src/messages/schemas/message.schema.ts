import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

import * as mongoose from 'mongoose';

export type MessageDocument = Message & Document;

@Schema({ timestamps: true })
export class Message {
  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  sender: Types.ObjectId;

  @Prop({ type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true })
  receiver: Types.ObjectId;

  @Prop({ required: true })
  text: string;

  @Prop({ default: 'text' })
  type: string;

  @Prop({ type: Object, required: false })
  billData?: Record<string, any>;
}

export const MessageSchema = SchemaFactory.createForClass(Message);
