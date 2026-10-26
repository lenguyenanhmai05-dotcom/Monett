import { Prop, Schema, SchemaFactory } from '@nestjs/mongoose';
import { Document, Types } from 'mongoose';

export type EventInvitationDocument = EventInvitationModel & Document;

@Schema({ timestamps: true, collection: 'event_invitations' })
export class EventInvitationModel {
  @Prop({ required: true, index: true })
  eventId: string;

  @Prop({ required: true })
  eventTitle: string;

  @Prop({ default: '' })
  eventLocation?: string;

  @Prop({ default: '' })
  eventStartDate?: string;

  @Prop({ required: true })
  inviterName: string;

  @Prop({ type: Types.ObjectId, ref: 'User', required: false })
  inviterId?: Types.ObjectId;

  @Prop({ default: '' })
  inviterEmail?: string;

  @Prop({ required: true, index: true })
  recipientId: string; // User ID string

  @Prop({ required: true })
  recipientName: string;

  @Prop({ default: '', index: true })
  recipientEmail?: string;

  @Prop({ enum: ['pending', 'accepted', 'declined'], default: 'pending', index: true })
  status: 'pending' | 'accepted' | 'declined';

  @Prop({ type: Object, default: null })
  eventData?: any;
}

export const EventInvitationSchema = SchemaFactory.createForClass(EventInvitationModel);

EventInvitationSchema.set('toJSON', {
  transform: (doc, ret: any) => {
    ret.id = ret._id ? ret._id.toString() : ret.id;
    return ret;
  },
});
