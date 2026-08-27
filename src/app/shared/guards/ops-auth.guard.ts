import { inject } from '@angular/core';
import { CanActivateFn, Router } from '@angular/router';
import { OpsAuthService } from '../services/ops-auth.service';

export const opsAuthGuard: CanActivateFn = (route, state) => {
  const opsAuthService = inject(OpsAuthService);
  const router = inject(Router);

  if (opsAuthService.isAuthenticated()) {
    return true;
  }

  // Redirect to Ops Login with returnUrl query param
  return router.createUrlTree(['/ops/login'], {
    queryParams: { returnUrl: state.url },
  });
};
