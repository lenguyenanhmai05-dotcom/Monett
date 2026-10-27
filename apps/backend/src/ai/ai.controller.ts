import { Controller, Post, Body } from '@nestjs/common';
import { AiService } from './ai.service';
import { ChatAiDto } from './ai.dto';

@Controller('api/ai')
export class AiController {
  constructor(private readonly aiService: AiService) {}

  @Post('chat')
  async chat(@Body() dto: ChatAiDto) {
    return this.aiService.chatWithFrog(dto);
  }
}
