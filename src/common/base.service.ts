import {
  HttpException,
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';

@Injectable()
export abstract class BaseService {
  protected readonly logger: Logger;

  constructor(context: string) {
    this.logger = new Logger(context);
  }

  protected handleError(error: unknown, message: string): never {
    if (error instanceof HttpException) {
      throw error;
    }

    this.logger.error(message, error instanceof Error ? error.stack : String(error));
    throw new InternalServerErrorException(message);
  }
}
