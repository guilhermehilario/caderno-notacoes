import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Body,
  Param,
  UseGuards,
  HttpCode,
  HttpStatus,
} from '@nestjs/common';
import { JwtAuthGuard } from '../common/guards/jwt-auth.guard';
import { CurrentUser } from '../common/decorators/current-user.decorator';
import { LeavesService } from './leaves.service';
import { CreateLeafDto } from './dto/create-leaf.dto';
import { UpdateLeafDto } from './dto/update-leaf.dto';

@UseGuards(JwtAuthGuard)
@Controller()
export class LeavesController {
  constructor(private readonly leavesService: LeavesService) {}

  // ── Leaves scoped to a notebook ──
  @Get('notebooks/:notebookId/leaves')
  findByNotebook(
    @Param('notebookId') notebookId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.findByNotebook(notebookId, userId);
  }

  @Post('notebooks/:notebookId/leaves')
  create(
    @Param('notebookId') notebookId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: CreateLeafDto,
  ) {
    return this.leavesService.create(notebookId, userId, dto);
  }

  // ── Individual leaf operations ──
  @Get('leaves/:leafId')
  findOne(@Param('leafId') leafId: string, @CurrentUser('id') userId: string) {
    return this.leavesService.findOne(leafId, userId);
  }

  @Put('leaves/:leafId')
  update(
    @Param('leafId') leafId: string,
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateLeafDto,
  ) {
    return this.leavesService.update(leafId, userId, dto);
  }

  @Delete('leaves/:leafId')
  @HttpCode(HttpStatus.NO_CONTENT)
  remove(@Param('leafId') leafId: string, @CurrentUser('id') userId: string) {
    return this.leavesService.remove(leafId, userId);
  }

  // ── AI features ──
  @Post('leaves/:leafId/summary')
  generateSummary(
    @Param('leafId') leafId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.generateSummary(leafId, userId);
  }

  @Post('leaves/:leafId/flashcards')
  generateFlashcards(
    @Param('leafId') leafId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.generateFlashcards(leafId, userId);
  }

  @Get('leaves/:leafId/flashcards')
  findFlashcards(
    @Param('leafId') leafId: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.leavesService.findFlashcards(leafId, userId);
  }
}
