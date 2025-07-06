import { firestore } from '../services/firebase';
import { Category, Thread, Comment, Group } from '../types/community';
import firebase from 'firebase/app'; // Standard import for Firebase app
import 'firebase/firestore'; // Import firestore module for its types and methods

export const communityApi = {
  getCategories: async (): Promise<Category[]> => {
    try {
      const snapshot = await firestore.collection('categories').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...(data as Omit<Category, 'id'>) };
      });
    } catch (error: any) {
      console.error('Firebase getCategories Error:', error.message);
      throw error;
    }
  },

  getThreads: async (categoryId?: string): Promise<Thread[]> => {
    try {
      let query: firebase.firestore.Query<firebase.firestore.DocumentData> = firestore.collection('threads');
      if (categoryId) {
        query = query.where('categoryId', '==', categoryId);
      }
      const snapshot = await query.orderBy('createdAt', 'desc').get();
      return snapshot.docs.map((doc) => {
        const data = doc.data();
        return { id: doc.id, ...(data as Omit<Thread, 'id'>) };
      });
    } catch (error: any) {
      console.error('Firebase getThreads Error:', error.message);
      throw error;
    }
  },

  getThreadById: async (threadId: string): Promise<Thread> => {
    try {
      const doc = await firestore.collection('threads').doc(threadId).get();
      if (!doc.exists) {
        throw new Error('Thread not found');
      }
      const data = doc.data();
      return { id: doc.id, ...(data as Omit<Thread, 'id'>) };
    } catch (error: any) {
      console.error('Firebase getThreadById Error:', error.message);
      throw error;
    }
  },

  createThread: async (threadData: { title: string; content: string; categoryId: string; authorId: string; authorName: string }): Promise<Thread> => {
    try {
      const newThreadRef = firestore.collection('threads').doc();
      const thread: Thread = {
        id: newThreadRef.id,
        ...threadData,
        createdAt: Date.now(),
        comments: [],
        upvotes: [],
        bookmarks: [],
        views: 0,
      };
      await newThreadRef.set(thread);
      return thread;
    } catch (error: any) {
      console.error('Firebase createThread Error:', error.message);
      throw error;
    }
  },

  addComment: async (commentData: { threadId: string; authorId: string; authorName: string; content: string }): Promise<Comment> => {
    try {
      const newCommentRef = firestore.collection('comments').doc();
      const comment: Comment = {
        id: newCommentRef.id,
        ...commentData,
        createdAt: Date.now(),
      };
      await newCommentRef.set(comment);
      return comment;
    } catch (error: any) {
      console.error('Firebase addComment Error:', error.message);
      throw error;
    }
  },

  upvoteThread: async (threadId: string, userId: string): Promise<Thread> => {
    try {
      const threadRef = firestore.collection('threads').doc(threadId);
      const threadDoc = await threadRef.get();

      if (!threadDoc.exists) {
        throw new Error('Thread not found');
      }

      const threadData = threadDoc.data() as Thread;
      const upvotes = threadData.upvotes || [];

      if (upvotes.includes(userId)) {
        // User already upvoted, remove upvote
        const updatedUpvotes = upvotes.filter(id => id !== userId);
        await threadRef.update({ upvotes: updatedUpvotes });
        return { ...threadData, upvotes: updatedUpvotes };
      } else {
        // User has not upvoted, add upvote
        const updatedUpvotes = [...upvotes, userId];
        await threadRef.update({ upvotes: updatedUpvotes });
        return { ...threadData, upvotes: updatedUpvotes };
      }
    } catch (error: any) {
      console.error('Firebase upvoteThread Error:', error.message);
      throw error;
    }
  },
}; 