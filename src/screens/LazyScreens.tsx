import { withLazyLoading } from '../components/LazyScreen';

// Lazy load all screens to reduce initial bundle size
export const HomeScreen = withLazyLoading(() => import('./Home/HomeScreen'));
export const LoginScreen = withLazyLoading(() => import('./Auth/Login'));
export const RegisterScreen = withLazyLoading(() => import('./Auth/Register'));
export const SplashScreen = withLazyLoading(() => import('./Auth/Splash'));

export const MentorListScreen = withLazyLoading(() => import('./Mentors/MentorList'));
export const MentorProfileScreen = withLazyLoading(() => import('./Mentors/MentorProfile'));

export const ForumHomeScreen = withLazyLoading(() => import('./Community/ForumHome'));
export const ThreadViewScreen = withLazyLoading(() => import('./Community/ThreadView'));
export const CreatePostScreen = withLazyLoading(() => import('./Community/CreatePost'));

export const MarketHomeScreen = withLazyLoading(() => import('./Marketplace/MarketHome'));
export const ProductDetailsScreen = withLazyLoading(() => import('./Marketplace/ProductDetails'));
export const UploadProductScreen = withLazyLoading(() => import('./Marketplace/UploadProduct'));

export const UploadPrototypeScreen = withLazyLoading(() => import('./Prototype/UploadPrototype'));
export const FeedbackScreen = withLazyLoading(() => import('./Prototype/FeedbackScreen'));

export const UserProfileScreen = withLazyLoading(() => import('./Profile/UserProfile'));
export const EditProfileScreen = withLazyLoading(() => import('./Profile/EditProfile'));