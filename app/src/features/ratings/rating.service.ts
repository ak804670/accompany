import { apiClient } from '@/services/api';

export type UserRatingItem = {
  id: string;
  rating: number;
  comment: string | null;
  createdAt: string;
  rater: {
    userId: string;
    name: string;
    mediaId: string | null;
  };
};

export type UserRatingsResponse = {
  averageRating: number;
  ratingCount: number;
  ratings: UserRatingItem[];
};

export type SubmitRatingInput = {
  ratedUserId: string;
  rating: number;
  comment?: string | null;
  callId?: string | null;
};

export const ratingService = {
  async create(
    input: SubmitRatingInput,
  ): Promise<{ ok: boolean; rating: UserRatingItem; summary: { averageRating: number; ratingCount: number } }> {
    return apiClient.post('/v1/ratings', input);
  },

  async getRatings(userId: string, sort: 'rating' | 'date' = 'rating'): Promise<UserRatingsResponse> {
    return apiClient.get<UserRatingsResponse>(`/v1/users/${userId}/ratings?sort=${sort}`);
  },
};
