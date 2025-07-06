import { Post } from './post';

export interface Category {
  id: string;
  name: string;
  description?: string;
}

export interface Thread extends Post {
  categoryId: string;
  comments: Comment[];
  upvotes: string[]; // Array of user IDs who upvoted
  bookmarks: string[]; // Array of user IDs who bookmarked
  views: number;
}

export interface Comment {
  id: string;
  threadId: string;
  authorId: string;
  authorName: string;
  content: string;
  createdAt: number;
}

export interface Group {
  id: string;
  name: string;
  description?: string;
  members: string[]; // Array of user IDs who are members
  isPrivate: boolean;
  threads: string[]; // Array of thread IDs belonging to this group
} 