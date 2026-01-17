import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
  HttpException,
  InternalServerErrorException,
} from '@nestjs/common';
import { Observable, throwError } from 'rxjs';
import { catchError } from 'rxjs/operators';

@Injectable()
export class ErrorInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      catchError((error: unknown) => {
        // If already an HttpException, let it pass through
        if (error instanceof HttpException) {
          return throwError(() => error);
        }

        // Otherwise, wrap in InternalServerErrorException
        console.error('Unexpected error:', error);
        const errorMessage =
          error instanceof Error
            ? error.message
            : 'An unexpected error occurred';
        return throwError(() => new InternalServerErrorException(errorMessage));
      }),
    );
  }
}
