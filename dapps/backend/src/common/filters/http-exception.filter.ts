import {
  ExceptionFilter,
  Catch,
  ArgumentsHost,
  HttpException,
} from '@nestjs/common';
import { Response } from 'express';

@Catch(HttpException)
export class HttpExceptionFilter implements ExceptionFilter {
  catch(exception: HttpException, host: ArgumentsHost) {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<Response>();
    const status = exception.getStatus();
    const exceptionResponse = exception.getResponse();

    const errorMessage =
      typeof exceptionResponse === 'object' && 'message' in exceptionResponse
        ? ((exceptionResponse as Record<string, unknown>).message as string) ||
          exception.message
        : exception.message;

    response.status(status).json({
      statusCode: status,
      message:
        typeof errorMessage === 'string'
          ? errorMessage
          : Array.isArray(errorMessage)
            ? (errorMessage as string[]).join(', ')
            : 'An error occurred',
      data: null,
      timestamp: new Date().toISOString(),
    });
  }
}
