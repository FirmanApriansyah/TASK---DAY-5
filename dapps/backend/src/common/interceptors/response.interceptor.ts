import {
  Injectable,
  NestInterceptor,
  ExecutionContext,
  CallHandler,
} from '@nestjs/common';
import { Observable } from 'rxjs';
import { map } from 'rxjs/operators';
import { ApiResponseDto } from '../dto/api-response.dto';

@Injectable()
export class ResponseInterceptor implements NestInterceptor {
  intercept(context: ExecutionContext, next: CallHandler): Observable<any> {
    return next.handle().pipe(
      map((data: unknown) => {
        // If data already has statusCode and timestamp (already formatted), return as is
        if (
          data &&
          typeof data === 'object' &&
          'statusCode' in data &&
          'timestamp' in data
        ) {
          return data as ApiResponseDto<unknown>;
        }

        // Otherwise, wrap in standard ApiResponseDto
        let statusCode: number = 200;
        try {
          // eslint-disable-next-line @typescript-eslint/no-unsafe-member-access
          const code: unknown = context.switchToHttp().getResponse().statusCode;
          if (typeof code === 'number') {
            statusCode = code;
          }
        } catch {
          // keep default status code
        }

        return {
          statusCode,
          message: 'Success',
          data: data,
          timestamp: new Date().toISOString(),
        } as ApiResponseDto<unknown>;
      }),
    );
  }
}
