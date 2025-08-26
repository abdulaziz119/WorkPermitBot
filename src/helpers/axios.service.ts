import { HttpException, Injectable } from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { catchError, firstValueFrom } from 'rxjs';
import { AxiosError } from 'axios';

@Injectable()
export class AxiosService {
  constructor(private readonly httpService: HttpService) {}

  public async uploadFileRequest<Response>(
    url,
    params,
    headers,
  ): Promise<Response> {
    const { data } = await firstValueFrom(
      this.httpService
        .post<Response>(url, params, {
          headers,
        })
        .pipe(
          catchError((error: AxiosError) => {
            console.log(error);
            throw new HttpException(error.response.data, error.response.status);
          }),
        ),
    );

    return data;
  }
}
