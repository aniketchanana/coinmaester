import axios, {
  type AxiosInstance,
  type AxiosRequestConfig,
  type AxiosResponse,
} from 'axios';

export function createHttpClient(config?: AxiosRequestConfig): AxiosInstance {
  return axios.create({
    timeout: 30_000,
    ...config,
  });
}

export const httpClient = createHttpClient();

export type { AxiosInstance, AxiosRequestConfig, AxiosResponse };
