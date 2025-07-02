export const ApiRoutes = {
  auth: {
    login: '/auth/login',
    register: '/auth/register',
  },
  mentors: {
    list: '/mentors',
    details: (id: string) => `/mentors/${id}`,
  },
  marketplace: {
    list: '/marketplace',
    details: (id: string) => `/marketplace/${id}`,
  },
  prototypes: {
    list: '/prototypes',
    details: (id: string) => `/prototypes/${id}`,
    create: '/prototypes',
  },
  // Add more API routes as needed
}; 