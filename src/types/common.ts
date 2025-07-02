// src/types/common.ts

export type User = {
  id: string;
  name: string;
  email: string;
};

export type Mentor = {
  id: string;
  name: string;
  domain: string;
  availability: string;
  price: string;
  rating: number;
}; 