export const environment = {
  production: true,
  auth0: {
    domain: '{domainhere}',
    clientId: '{clientIDhere}',
    authorizationParams: {
      redirect_uri:
        typeof window !== 'undefined' ? window.location.origin : 'http://localhost:4200',
    },
  },
};
