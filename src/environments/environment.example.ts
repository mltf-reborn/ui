export const environment = {
  production: false,
  auth0: {
    domain: 'your-tenant.auth0.com',
    clientId: 'your-auth0-client-id',
    authorizationParams: {
      redirect_uri:
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200',
    },
  },
};
