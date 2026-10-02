import routes from './reporting.routes';
import { ReportDashboardComponent } from './dashboard/report-dashboard.component';

describe('mfe-reporting exposed routes', () => {
  it('guards the section with reports:view and shows the dashboard', () => {
    expect(routes[0].canActivate?.length).toBe(1);
    expect(routes[0].children?.[0].component).toBe(ReportDashboardComponent);
  });
});
