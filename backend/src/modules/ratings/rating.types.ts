export type UserRating = {
  id: string;
  callId: string | null;
  raterId: string;
  ratedUserId: string;
  rating: number;
  comment: string | null;
  createdAt: Date;
  updatedAt: Date;
};

export type PublicRating = {
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

export type UserRatingSummary = {
  averageRating: number;
  ratingCount: number;
};

export type CreateRatingInput = {
  callId?: string | null;
  raterId: string;
  ratedUserId: string;
  rating: number;
  comment?: string | null;
};
