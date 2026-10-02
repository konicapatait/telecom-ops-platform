/**
 * @file Shell routes: login callback, then the chrome with Home, legacy redirects, one lazy route per remote section, forbidden and not-found.
 */
import type { Routes } from '@angular/router';
import { authGuard } from '@platform/auth';
import { ShellChromeComponent } from './chrome/shell-chrome.component';
import { ForbiddenComponent } from './pages/forbidden.component';
import { HomeComponent } from './pages/home.component';
import { LoginCallbackComponent } from './pages/login-callback.component';
import { NotFoundComponent } from './pages/not-found.component';
import { SHELL_REMOTE_ROUTES } from './routing/remote-registry';
import { legacyRoutes } from './routing/legacy-redirect';
import { remoteRoutes } from './routing/remote-routes';

/** A factory, not a constant: Retry rebuilds the config to re-attempt a failed remote. */
export function appRoutes(): Routes {
  return [
    { path: 'login/callback', component: LoginCallbackComponent },
    {
      path: '',
      component: ShellChromeComponent,
      canActivate: [authGuard],
      children: [
        { path: '', pathMatch: 'full', component: HomeComponent, title: 'Home' },
        ...legacyRoutes(),
        ...remoteRoutes(SHELL_REMOTE_ROUTES),
        { path: 'forbidden', component: ForbiddenComponent, title: 'No access' },
        { path: '**', component: NotFoundComponent, title: 'Not found' },
      ],
    },
  ];
}
