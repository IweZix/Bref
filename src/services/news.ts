import { useQuery } from '@tanstack/react-query';
import { PaginationParams, StrapiResponse } from '@/types/strapi';
import { customInstance } from '@/utils/custom-instance';

// News object
export interface News {
  id: number;
  documentId: string;
  title: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  publishedAt: string;
}

/**
 * Fetches news from the API with optional pagination parameters.
 */
const getNews = (params?: PaginationParams): Promise<StrapiResponse<News[]>> =>
  customInstance({ url: '/api/new', method: 'GET', params });

/**
 * Custom hook to fetch news using React Query.
 * @param params Optional pagination parameters for the news query.
 * @returns A React Query result containing the news data and query status.
 */
export const useNews = (params?: PaginationParams) => {
  return useQuery({
    queryKey: ['news', params],
    queryFn: () => getNews(params),
  });
};

/**
 * Fetches a single news item by its ID from the API.
 * @param id The ID of the news item to fetch.
 * @returns A promise that resolves to the news item data.
 */
const getNewsById = (id: number): Promise<{ data: News }> =>
  customInstance({ url: `/api/new/${id}`, method: 'GET' });

/**
 * Custom hook to fetch a single news item by its ID using React Query.
 * @param id The ID of the news item to fetch.
 * @returns A React Query result containing the news item data and query status.
 */
export const useNewsById = (id: number) => {
  return useQuery({
    queryKey: ['news', id],
    queryFn: () => getNewsById(id),
  });
};
